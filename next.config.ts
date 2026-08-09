import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Baseline security headers. None of these were being sent, which left the app open to
  // clickjacking (an attacker framing os.ownova.org inside their own page to harvest clicks),
  // MIME-sniffing, and referrer leakage of internal URLs to third parties.
  //
  // Content-Security-Policy is the main defence-in-depth against XSS. 'unsafe-inline' and
  // 'unsafe-eval' are required by Next's hydration and dev tooling respectively; tightening those
  // needs nonce-based CSP, which is a larger change. Everything else is locked to same-origin,
  // and `frame-ancestors 'none'` is the modern, header-level equivalent of X-Frame-Options.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Cognito (auth) and S3 (presigned uploads) are called directly from the browser.
      "connect-src 'self' https://*.amazonaws.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Tells browsers to only ever reach this host over HTTPS, for two years.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },

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
  //
  // Note there are no AWS credentials here. In production the SSR compute role
  // (ownova-os-amplify-compute) supplies them via the SDK's default credential chain; locally
  // they come from .env.local or an AWS profile. Static keys are deliberately never baked into
  // the build output.
  env: {
    APP_AWS_REGION: process.env.APP_AWS_REGION ?? "",
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID ?? "",
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? "",
    DB_CLUSTER_ARN: process.env.DB_CLUSTER_ARN ?? "",
    DB_SECRET_ARN: process.env.DB_SECRET_ARN ?? "",
    DB_NAME: process.env.DB_NAME ?? "",
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ?? "",
    SES_FROM_ADDRESS: process.env.SES_FROM_ADDRESS ?? "",
    // Shared secrets for the intake endpoints. These are the only routes reachable without a
    // Cognito session (Apps Script and Cal.com can't log in), so they authenticate with these.
    // Server-side only — never referenced from a client component, so they are not shipped to
    // the browser bundle.
    INTAKE_SECRET: process.env.INTAKE_SECRET ?? "",
    CAL_WEBHOOK_SECRET: process.env.CAL_WEBHOOK_SECRET ?? "",
  },
};

export default nextConfig;
