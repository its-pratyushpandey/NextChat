import { AuthConfig } from "convex/server";

function normalizeIssuer(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    throw new Error(
      "Missing CLERK_JWT_ISSUER_DOMAIN. Set it in your Convex deployment env (Dashboard → Settings → Environment Variables, or `npx convex env set`).",
    );
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

const clerkIssuer = normalizeIssuer(process.env.CLERK_JWT_ISSUER_DOMAIN);

export default {
  // NOTE: Convex evaluates auth config using Convex deployment env vars.
  // For local dev: `npx convex dev` then `npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-domain>`
  // For production: set the env var in the Convex dashboard for the deployment.
  providers: [
    {
      type: "customJwt",
      issuer: clerkIssuer,
      jwks: `${clerkIssuer}/.well-known/jwks.json`,
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
