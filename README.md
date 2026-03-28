# Habit Tracker

**Live:** https://romaburekhin--habit-tracker-serve.modal.run/

A minimal full-stack habit tracking PWA (Progressive Web App). Create habits, track daily completions, view weekly progress and year heatmaps — per user, with Google sign-in.

## Stack

| Layer        | Choice                      |
|--------------|-----------------------------|
| Framework    | Next.js 15 (App Router)     |
| Language     | TypeScript                  |
| Styling      | Tailwind CSS v4             |
| Auth         | Supabase (Google OAuth)     |
| Database     | SQLite via `better-sqlite3` |
| Push         | Web Push API + VAPID        |
| Deployment   | Modal.com                   |

## Features

- Create habits with a custom color and flexible goal (this year / this month / full year / fixed days)
- Weekly card view — toggle each day of the current week
- Year heatmap view — GitHub-style grid for the past 365 days
- Navigable monthly calendar inside each habit for backdating
- Drag-and-drop reordering of habits
- Filter habits: All / Active / Done / Shared
- Streak counter
- Shared goals — invite another user to compete on the same habit
- Push notifications — daily reminders via Web Push (iOS 16.4+ PWA, Android Chrome)
- PWA — installable on mobile (manifest + service worker)
- Google OAuth via Supabase

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

**Supabase setup:**
1. Create a project at [supabase.com](https://supabase.com)
2. Enable the **Google** provider under Authentication → Providers
3. Add `http://localhost:3000/**` to Authentication → URL Configuration

**VAPID keys** (for push notifications):
```bash
npx web-push generate-vapid-keys
```

### 3. Run

```bash
npm run dev
```

The SQLite database (`habits.sqlite`) is created automatically on first run.

### 4. Test

```bash
npm test
```

## Deployment (Modal.com)

### Prerequisites

```bash
pip install modal
modal setup
```

### Deploy

```bash
modal deploy modal_app.py
```

### Important constraints

- `max_containers=1` is **required** — SQLite does not support concurrent writes across multiple processes
- The persistent volume is mounted at `/data` — the DB lives at `/data/habits.sqlite`
- `NEXT_PUBLIC_*` vars are baked into the client bundle at build time — they must be set inside `modal_app.py` as image env vars, not only at runtime

### Supabase redirect URL

After deploying, add your Modal URL to Supabase → Authentication → URL Configuration:
```
https://<your-username>--habit-tracker-serve.modal.run/**
```

### Push notification reminders (cron)

The `/api/push/reminders` endpoint sends scheduled push notifications. Call it every minute from a cron service (e.g. [cron-job.org](https://cron-job.org)):

```
GET https://<your-app>/api/push/reminders?secret=<CRON_SECRET>
```

## Environment Variables

| Variable                        | Description                              | Where set                        |
|---------------------------------|------------------------------------------|----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                     | `.env.local` / `modal_app.py`    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key                 | `.env.local` / `modal_app.py`    |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | VAPID public key for Web Push            | `.env.local` / `modal_app.py`    |
| `VAPID_PRIVATE_KEY`             | VAPID private key (server-side only)     | `.env.local` / Modal secret      |
| `VAPID_SUBJECT`                 | VAPID contact email                      | `.env.local` / Modal secret      |
| `CRON_SECRET`                   | Secret to protect the reminders endpoint | `.env.local` / Modal secret      |
| `DATABASE_PATH`                 | SQLite file path                         | Set by Modal at runtime          |

## Project Structure

```
app/
  page.tsx                   — Main habits view
  layout.tsx                 — Root layout + PWA metadata
  login/                     — Login page
  auth/callback/             — Supabase OAuth callback
  api/
    habits/                  — GET/POST habits
    habits/[id]/             — PATCH/DELETE habit
    habits/reorder/          — Reorder habits (drag & drop)
    completions/             — Toggle completions
    init/                    — Bootstrap: habits + current week completions
    stats/                   — Streak and completed_days
    challenges/              — GET/POST shared goals
    challenges/[id]/         — PATCH/DELETE challenge
    challenges/[id]/completions/ — Challenge completion data
    users/search/            — Search users by email/name
    push/subscribe/          — Save/remove push subscriptions
    push/schedule/           — Notification schedule settings
    push/reminders/          — Cron endpoint: send due reminders
components/
  HabitList.tsx              — Weekly card view with drag & drop
  HabitYearGrid.tsx          — Year heatmap card
  AddHabitModal.tsx          — Create habit modal
  EditHabitModal.tsx         — Edit habit + navigable monthly calendar
  ChallengeCard.tsx          — Shared goal card with calendars
  CommonGoalModal.tsx        — Send shared goal invite
  LoginModal.tsx             — Auth modal
  LogoutButton.tsx           — Sign out
  ProfileButton.tsx          — User avatar
  ProfileModal.tsx           — Profile modal
  NotificationSettings.tsx   — Push notification schedule UI
lib/
  api.ts                     — Fetch wrappers for all API routes
  types.ts                   — TypeScript interfaces
  db.ts                      — SQLite singleton + auto-migration
  colors.ts                  — Habit color palette
  push.ts                    — Client-side push subscription
  webPush.ts                 — Server-side push sending (web-push)
  supabase/                  — Browser and server Supabase clients
db/
  schema.sql                 — Source-of-truth table definitions
public/
  sw.js                      — Service worker (push + notification click)
modal_app.py                 — Modal.com deployment config
```
