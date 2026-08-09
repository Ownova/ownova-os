import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Amplify Hosting injects console/branch environment variables into the BUILD container only --
  // they are NOT present in the Next.js SSR runtime (the Lambda serving dynamic routes). Without
  // this passthrough, every `process.env.X` read in server code is undefined at request time, so
  // `isAwsDbConfigured` / `isCognitoConfigured` evaluate false and the whole app silently falls
  // back to mock data + demo auth even though the backend is fully provisioned.
  //
  // Listing them under `env` makes Next inline the values into the server bundle at build time.
  // These identifiers are only ever read from server-only modules (lib/aws/db.ts, cognito.ts,
  // s3.ts), so they are never shipped in the client bundle.
  // Next types `env` as Record<string, string>, and process.env reads are `string | undefined`,
  // so each one is coalesced. An empty string is falsy, which is exactly what the
  // isAwsDbConfigured / isCognitoConfigured guards already check for -- so a genuinely missing
  // variable still cleanly degrades to mock mode instead of crashing.
  env: {
    APP_AWS_REGION: process.env.APP_AWS_REGION ?? "",
    APP_AWS_ACCESS_KEY_ID: process.env.APP_AWS_ACCESS_KEY_ID ?? "",
    APP_AWS_SECRET_ACCESS_KEY: process.env.APP_AWS_SECRET_ACCESS_KEY ?? "",
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID ?? "",
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? "",
    DB_CLUSTER_ARN: process.env.DB_CLUSTER_ARN ?? "",
    DB_SECRET_ARN: process.env.DB_SECRET_ARN ?? "",
    DB_NAME: process.env.DB_NAME ?? "",
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ?? "",
  },
};

export default nextConfig;
