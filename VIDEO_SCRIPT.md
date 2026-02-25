# NextChat — Short Video Explanation Script (2–3 minutes)

## 0:00–0:15 — What this is

Hi, this is NextChat — a production-style realtime chat web app.
It supports both 1:1 and group conversations, runs on Next.js App Router with TypeScript, uses Clerk for authentication, and Convex for the realtime database and subscriptions.

## 0:15–0:35 — Auth and route protection

First, authentication is handled by Clerk with email and social login.
All routes are protected except the public landing page.
After sign-in, the app automatically syncs the user profile into Convex on first login, so profiles persist and can be discovered by other users.

## 0:35–1:05 — Main UI layout

The core UI is a WhatsApp + Slack hybrid:
On desktop, you get a split view with a sidebar on the left and the active chat on the right.
On mobile, the default view is the conversation list, and when you open a chat it becomes full screen with a Back button.

We use Tailwind CSS and shadcn/ui components for a clean, consistent design.

## 1:05–1:35 — Discovery, presence, typing

In the sidebar, there’s People discovery:
You can browse all users except yourself, and there’s a debounced realtime search filter.
Users show an avatar and a green online indicator.

Presence is tracked using session heartbeats in Convex; when a user disconnects or stops heartbeating, they automatically go offline.

Typing is also realtime: when someone is typing, you’ll see “Alex is typing…” with animated dots, and it clears after about 2 seconds of inactivity.

## 1:35–2:20 — Messaging, unread, reactions, deletion

Messages update instantly using Convex subscriptions.
Each conversation shows a last message preview, timestamp, and an unread badge.
Unread counts clear when the conversation is opened.

In the chat, message bubbles are aligned right for sent and left for received.
There’s smart auto-scroll: if you’re near the bottom it follows new messages; if you’ve scrolled up it shows a floating “↓ New messages” button with smooth GSAP scrolling.

Advanced features are included:
- Soft delete: only the sender can delete; the message becomes an italic “This message was deleted.”
- Reactions: a fixed emoji set (👍 ❤️ 😂 😮 😢), toggle on/off, and reaction counts.
- Group chat: create a group with a name and multiple members, and message it in realtime.

## 2:20–2:45 — Animations and robustness

Animations use Framer Motion for transitions and message entry, and GSAP for micro-interactions like reaction pops and smooth scrolling.

We also include loading skeletons, global error boundaries, and send retry UX for transient failures.

## 2:45–3:00 — How to run

To run locally, start Convex with `npm run convex:dev` and then start Next.js with `npm run dev`.
Deployment is Vercel + Convex; the README includes the environment variables and steps.
