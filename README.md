# Habit Tracker

A minimal full-stack habit tracking app. Create habits, track daily completions, and monitor weekly progress — per user, with Google sign-in.

## Stack

| Layer       | Choice                          |
|-------------|---------------------------------|
| Framework   | Next.js 15 (App Router)         |
| Language    | TypeScript                      |
| Styling     | Tailwind CSS v4                 |
| Auth        | Supabase (Google OAuth + email) |
| Database    | SQLite via `better-sqlite3`     |
| Tests       | Vitest                          |

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

## Deployment

> **Important:** The app uses SQLite with a local file (`habits.sqlite`). This means it requires a server with a **persistent filesystem**. It is **not compatible** with Vercel or other serverless platforms as-is.

### Recommended: Railway

1. Push your repo to GitHub
2. Create a new project on [railway.app](https://railway.app) → Deploy from GitHub repo
3. Add environment variables in Railway dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Add a **Volume** in Railway and mount it at `/app` (or set `DB_PATH` env var to a persistent path)
5. In Supabase → Authentication → URL Configuration, add your Railway domain:
   ```
   https://<your-app>.railway.app/**
   ```

### Alternative: Render / Fly.io

Both support persistent disks. Follow the same steps — add a disk mount at the app's working directory.

### To deploy on Vercel (future)

Migrate `habits` and `completions` tables to Supabase Postgres and remove the `better-sqlite3` dependency. The auth layer is already Supabase.

## Environment Variables

| Variable                      | Description                        |
|-------------------------------|------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`    | Supabase project URL               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key         |

## Project Structure

```
app/
  api/habits/         — CRUD API for habits
  api/completions/    — Toggle completions
  auth/callback/      — Supabase OAuth callback
  login/              — Login page
  page.tsx            — Main habits view
components/
  HabitList.tsx       — Weekly grid + habit cards
  AddHabitModal.tsx   — Create habit (bottom sheet on mobile)
  EditHabitModal.tsx  — Edit + monthly calendar view
lib/
  supabase/           — Server and browser Supabase clients
  habits.ts           — Habit queries (SQLite)
  completions.ts      — Completion queries + streak logic
  db.ts               — SQLite singleton
db/
  schema.sql          — Source-of-truth table definitions
```
