import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// Amplify Hosting reserves the "AWS_" prefix, so region/keys are read from APP_AWS_* instead.
const region = process.env.APP_AWS_REGION;
const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

export const isCognitoConfigured = Boolean(region && userPoolId && clientId);

let client: CognitoIdentityProviderClient | null = null;
function getClient() {
  if (!isCognitoConfigured) {
    throw new Error(
      "Cognito is not configured. Set APP_AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID " +
        "in .env.local, or keep using mock/demo auth (see src/lib/auth.ts)."
    );
  }
  client ??= new CognitoIdentityProviderClient({
    region,
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
  return client;
}

export interface CognitoTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
}

/**
 * Signs in with the USER_PASSWORD_AUTH flow. Requires that auth flow to be enabled on the
 * Cognito app client (App client settings -> Auth flows -> "ALLOW_USER_PASSWORD_AUTH"), and
 * that the app client has no client secret (server calls the SDK directly, so no SECRET_HASH
 * is computed here — keep it simple for Phase 1).
 */
export async function cognitoSignIn(email: string, password: string): Promise<CognitoTokens> {
  const res = await getClient().send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    })
  );
  const result = res.AuthenticationResult;
  if (!result?.IdToken || !result.AccessToken) {
    // e.g. a NEW_PASSWORD_REQUIRED / MFA challenge came back instead of tokens.
    throw new Error(res.ChallengeName ? `Additional step required: ${res.ChallengeName}` : "Sign in failed");
  }
  return { idToken: result.IdToken, accessToken: result.AccessToken, refreshToken: result.RefreshToken };
}

export async function cognitoSignUp(name: string, email: string, password: string) {
  await getClient().send(
    new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: name },
      ],
    })
  );
}

/**
 * Dev convenience only: auto-confirms a new user instead of making them click an email link.
 * Requires the caller's IAM role to have cognito-idp:AdminConfirmSignUp on the user pool.
 * Ship a real "enter the code we emailed you" screen before going to production.
 */
export async function adminConfirmSignUp(email: string) {
  await getClient().send(new AdminConfirmSignUpCommand({ UserPoolId: userPoolId, Username: email }));
}

export async function cognitoSignOut(accessToken: string) {
  await getClient().send(new GlobalSignOutCommand({ AccessToken: accessToken }));
}

/** Decodes the (already-verified-by-Cognito) ID token payload without a JWT library. */
export function decodeIdToken(idToken: string): { sub: string; email: string; name?: string; [k: string]: unknown } {
  const payload = idToken.split(".")[1];
  const json = Buffer.from(payload, "base64").toString("utf8");
  return JSON.parse(json);
}
