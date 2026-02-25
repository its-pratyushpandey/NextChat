# NextChat (Next.js + Convex + Clerk)

Production-style realtime chat app (1:1 + group) built with:

- Next.js (App Router) + TypeScript
- Convex (DB + realtime subscriptions)
- Clerk (auth)
- Tailwind + shadcn/ui
- Framer Motion + GSAP

## Features

- Auth: Clerk email + social login, protected routes, user profile button
- Convex sync: first-login user sync + persisted profiles
- User discovery: debounced realtime search, online indicator
- Direct + group chat: realtime messages, reactions, soft delete
- Presence + typing: live online/offline and “is typing…” indicator
- Unread counts: badge in sidebar; clears when opening a conversation
- Smart scroll: auto-scroll near bottom + “↓ New messages” button with GSAP scroll
- Loading/error states: skeletons, global error boundaries, send spinner + retry

## Prereqs

- Node.js 18+ (or newer LTS)
- A Clerk application (publishable + secret keys)
- Convex CLI (installed via project devDependencies; invoked via `npx convex`)

## Environment Variables

Create/update `.env.local` in the project root.

### Clerk

Required:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Typical (recommended) routing values:

```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
```

### Convex

Run Convex once locally and it will populate these automatically:

```
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

### Convex + Clerk auth (required for authenticated mutations)

This app uses `ConvexProviderWithClerk` and validates Clerk JWTs inside Convex.

1) Set the Clerk issuer domain in the *Convex deployment environment* (not just `.env.local`).

Local dev:

```
npm run convex:dev
```

In another terminal (while Convex is running):

```
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-domain>.clerk.accounts.dev
```

Production:
- Convex Dashboard → Settings → Environment Variables
- Add `CLERK_JWT_ISSUER_DOMAIN` with your Clerk instance domain

2) About the `.../tokens/convex` 404

The Convex helper `convex/react-clerk` requests a Clerk token with a JWT template named `convex`.
If you haven't created that template in Clerk, Clerk returns `404`.

This project intentionally avoids requiring that template by fetching the default Clerk token.
If you prefer the stricter setup, create a Clerk JWT template named `convex` and set an audience,
then update `convex/auth.config.ts` to require `applicationID`.

## Local Development

In one terminal:

```
npm run convex:dev
```

In another terminal:

```
npm run dev
```

App:

- http://localhost:3000

## Deployment (Vercel + Convex)

1) Deploy Convex:

```
npm run convex:deploy
```

2) In Vercel project settings, set env vars:

- All Clerk env vars above
- `NEXT_PUBLIC_CONVEX_URL` (from Convex dashboard / deploy output)
- `CONVEX_DEPLOYMENT` (if your Convex deploy requires it)

3) Deploy the Next.js app.

## Video Script

See [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md).
