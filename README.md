# Habit Tracker

A minimal full-stack habit tracking PWA. Create habits, track daily completions, view weekly progress and year heatmaps — per user, with Google sign-in.

## Stack

| Layer       | Choice                          |
|-------------|---------------------------------|
| Framework   | Next.js 15 (App Router)         |
| Language    | TypeScript                      |
| Styling     | Tailwind CSS v4                 |
| Auth        | Supabase (Google OAuth + email) |
| Database    | SQLite via `better-sqlite3`     |
| Tests       | Vitest                          |
| Deployment  | Modal.com                       |

## Features

- Create habits with a custom color and flexible goal (this year / this month / full year / fixed days)
- Weekly card view — toggle each day of the current week
- Year heatmap view — GitHub-style grid for the past 365 days
- Filter habits by All / Active / Done
- Streak counter
- PWA — installable on mobile (manifest + icons)
- Google OAuth via Supabase

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com) and enable the **Google** provider under Authentication → Providers.

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

In Supabase → Authentication → URL Configuration, add:
```
http://localhost:3000/**
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

The app is deployed on [Modal.com](https://modal.com) with a persistent volume for SQLite.

### Prerequisites

```bash
pip install modal
modal setup
```

### Deploy

```bash
modal deploy modal_app.py
```

### First-time secrets setup

`NEXT_PUBLIC_*` vars are baked into the client bundle at build time (already set in `modal_app.py`). Runtime secrets are optional — they're only needed if you add server-side env vars:

```bash
modal secret create habit-tracker-secrets \
  NEXT_PUBLIC_SUPABASE_URL=... \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Important constraints

- `max_containers=1` is **required** — SQLite does not support concurrent writes across multiple processes
- The persistent volume is mounted at `/data` — the DB lives at `/data/habits.sqlite`
- `NEXT_PUBLIC_*` vars must be set **at image build time**, not only at runtime

### Supabase redirect URL

After deploying, add your Modal URL to Supabase → Authentication → URL Configuration:
```
https://<your-username>--habit-tracker-serve.modal.run/**
```

## Environment Variables

| Variable                        | Description                  | Where set         |
|---------------------------------|------------------------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL         | `.env.local` / `modal_app.py` image env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key     | `.env.local` / `modal_app.py` image env |
| `DATABASE_PATH`                 | SQLite file path             | set by Modal at runtime (`/data/habits.sqlite`) |
| `SITE_URL`                      | Canonical URL (OAuth redirect) | set by Modal at runtime |

## Project Structure

```
app/
  api/habits/         — CRUD API for habits
  api/habits/[id]/    — Update / delete by id
  api/completions/    — Toggle completions
  api/init/           — Bootstrap: habits + current week completions
  api/stats/          — Habit stats (streak, completed_days)
  auth/callback/      — Supabase OAuth callback
  login/              — Login page
  page.tsx            — Main habits view
components/
  HabitList.tsx       — Weekly card view
  HabitYearGrid.tsx   — Year heatmap card
  AddHabitModal.tsx   — Create habit modal
  EditHabitModal.tsx  — Edit habit + monthly calendar
  LoginModal.tsx      — Auth modal
  ProfileButton.tsx   — User avatar + logout
lib/
  supabase/           — Server and browser Supabase clients
  habits.ts           — Habit queries (SQLite)
  completions.ts      — Completion queries + streak logic
  db.ts               — SQLite singleton
db/
  schema.sql          — Source-of-truth table definitions
modal_app.py          — Modal.com deployment config
```
