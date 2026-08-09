import {
  RDSDataClient,
  ExecuteStatementCommand,
  BeginTransactionCommand,
  CommitTransactionCommand,
  RollbackTransactionCommand,
  type Field,
  type SqlParameter,
} from "@aws-sdk/client-rds-data";

// Note: Amplify Hosting reserves the "AWS_" env var prefix for its own internal use, so the
// region/access key/secret key are read from APP_AWS_* names instead (set in Amplify console
// or .env.local) and passed explicitly to the SDK client, since the default credential chain
// only looks for the reserved AWS_* names.
const region = process.env.APP_AWS_REGION;
const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
const resourceArn = process.env.DB_CLUSTER_ARN;
const secretArn = process.env.DB_SECRET_ARN;
const database = process.env.DB_NAME ?? "ownova";

/** True when the Aurora Serverless v2 cluster (via RDS Data API) is configured. */
export const isAwsDbConfigured = Boolean(region && resourceArn && secretArn);

let client: RDSDataClient | null = null;
function getClient() {
  if (!isAwsDbConfigured) {
    throw new Error(
      "Aurora is not configured. Set APP_AWS_REGION, DB_CLUSTER_ARN, DB_SECRET_ARN in .env.local, " +
        "or keep using mock data from src/lib/mock-data.ts."
    );
  }
  client ??= new RDSDataClient({
    region,
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
  return client;
}

// ---- value <-> Data API Field conversion -------------------------------------------------

export type SqlParams = Record<string, string | number | boolean | null | Date | undefined>;

function toSqlParameters(params?: SqlParams): SqlParameter[] | undefined {
  if (!params) return undefined;
  return Object.entries(params).map(([name, value]) => {
    if (value === null || value === undefined) return { name, value: { isNull: true } };
    if (typeof value === "boolean") return { name, value: { booleanValue: value } };
    if (typeof value === "number") {
      return Number.isInteger(value)
        ? { name, value: { longValue: value } }
        : { name, value: { doubleValue: value } };
    }
    // Data API needs an explicit typeHint for timestamp comparisons, otherwise Postgres sees a
    // plain text literal and errors with "operator does not exist: timestamp with time zone >= text".
    // The TIMESTAMP typeHint requires SQL format ("YYYY-MM-DD HH:MM:SS.sss"), NOT ISO 8601 --
    // passing toISOString() as-is (with "T" and "Z") fails with "Parse Error for TimeStamp".
    if (value instanceof Date) {
      const sqlTimestamp = value.toISOString().replace("T", " ").replace("Z", "");
      return { name, value: { stringValue: sqlTimestamp }, typeHint: "TIMESTAMP" };
    }
    return { name, value: { stringValue: value } };
  });
}

function fieldToJs(field: Field): unknown {
  if (field.isNull) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.longValue !== undefined) return field.longValue;
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.arrayValue) {
    // Postgres array columns (e.g. text[] for tags/labels) come back as a nested ArrayValue
    // object, not a plain JS array — unwrap whichever *Values list is populated.
    const av = field.arrayValue;
    if (av.stringValues) return av.stringValues;
    if (av.longValues) return av.longValues;
    if (av.doubleValues) return av.doubleValues;
    if (av.booleanValues) return av.booleanValues;
    if (av.arrayValues) return av.arrayValues.map((nested) => (nested ? fieldToJs({ arrayValue: nested }) : null));
    return [];
  }
  return null;
}

function rowsToObjects(records: Field[][] | undefined, columnNames: string[]): Record<string, unknown>[] {
  if (!records) return [];
  return records.map((row) => {
    const obj: Record<string, unknown> = {};
    row.forEach((field, i) => {
      obj[columnNames[i]] = fieldToJs(field);
    });
    return obj;
  });
}

// ---- resume handling -----------------------------------------------------------------------

/**
 * Aurora Serverless v2 scales to zero when idle (that's what keeps this cheap). The first query
 * after a pause fails immediately with DatabaseResumingException while the instance wakes, which
 * typically takes 15-30s. Without this retry, the first person to load the app after a quiet
 * period gets an error page. Retries with backoff, only for the resuming case -- real SQL errors
 * still surface immediately.
 */
const RESUME_MAX_ATTEMPTS = 8;
const RESUME_DELAY_MS = 4000;

function isResumingError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  const message = (err as { message?: string })?.message ?? "";
  return name === "DatabaseResumingException" || message.includes("resuming after being auto-paused");
}

async function sendWithResumeRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RESUME_MAX_ATTEMPTS; attempt++) {
    try {
      return await run();
    } catch (err) {
      if (!isResumingError(err)) throw err;
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, RESUME_DELAY_MS));
    }
  }
  throw lastError;
}

// ---- public API ----------------------------------------------------------------------------

/**
 * Run one SQL statement outside a transaction. Use for simple reads/writes that don't need
 * the app.current_user_id / app.current_role session variables set (see withUserContext).
 */
export async function query<T = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T[]> {
  const res = await sendWithResumeRetry(() =>
    getClient().send(
      new ExecuteStatementCommand({
        resourceArn,
        secretArn,
        database,
        sql,
        parameters: toSqlParameters(params),
        includeResultMetadata: true,
      })
    )
  );
  const columnNames = (res.columnMetadata ?? []).map((c) => c.name ?? "");
  return rowsToObjects(res.records, columnNames) as T[];
}

interface UserContext {
  userId: string;
  role: string;
}

/**
 * Runs `fn` inside a transaction with `app.current_user_id` / `app.current_role` set via
 * SET LOCAL equivalents (set_config(..., true) is transaction-scoped), so the RLS policies
 * in db/migrations/0001_init.sql can see who's calling. This is the AWS replacement for
 * Supabase's per-connection auth.uid(). ALWAYS call queries that touch RLS-protected tables
 * through this helper rather than the bare `query()` above.
 */
export async function withUserContext<T>(
  ctx: UserContext,
  fn: (run: (sql: string, params?: SqlParams) => Promise<Record<string, unknown>[]>) => Promise<T>
): Promise<T> {
  const c = getClient();
  // Only the transaction-opening call needs resume handling: if the cluster is paused it fails
  // here, and once BeginTransaction succeeds the instance is awake for the statements that follow.
  const { transactionId } = await sendWithResumeRetry(() =>
    c.send(new BeginTransactionCommand({ resourceArn, secretArn, database }))
  );

  const run = async (sql: string, params?: SqlParams) => {
    const res = await c.send(
      new ExecuteStatementCommand({
        resourceArn,
        secretArn,
        database,
        sql,
        parameters: toSqlParameters(params),
        transactionId,
        includeResultMetadata: true,
      })
    );
    const columnNames = (res.columnMetadata ?? []).map((col) => col.name ?? "");
    return rowsToObjects(res.records, columnNames);
  };

  try {
    await run("select set_config('app.current_user_id', :uid, true)", { uid: ctx.userId });
    await run("select set_config('app.current_role', :role, true)", { role: ctx.role });
    const result = await fn(run);
    await c.send(new CommitTransactionCommand({ resourceArn, secretArn, transactionId }));
    return result;
  } catch (err) {
    await c.send(new RollbackTransactionCommand({ resourceArn, secretArn, transactionId })).catch(() => {});
    throw err;
  }
}
