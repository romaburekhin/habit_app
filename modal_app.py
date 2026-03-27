import os
import subprocess
import modal

app = modal.App("habit-tracker")

# Build image: Debian + Node 20 + app source + npm build
image = (
    modal.Image.debian_slim(python_version="3.11")
    .run_commands(
        "apt-get update -y",
        # build-essential + python3 required for better-sqlite3 native addon
        "apt-get install -y curl build-essential python3",
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
    )
    .add_local_dir(
        ".",
        remote_path="/app",
        copy=True,
        ignore=["node_modules", ".next", "*.sqlite", "*.sqlite-shm", "*.sqlite-wal", ".env*"],
    )
    # NEXT_PUBLIC_* vars must be present at build time — they get baked into the client bundle
    .env({
        "NEXT_PUBLIC_SUPABASE_URL": "https://ehfccwbvejfexzhguoeb.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_6ae0MEsgAMn1kDeHyPfoNA_NzM7hwP3",
        "NEXT_PUBLIC_VAPID_PUBLIC_KEY": "BJI93q7t8EY7rAwMGvzYU4gMTO7ifrp-uYcWlNES-kuMKaeZQlqLh4UWG0IfSjGaxzfgOz3TDWhkhlyVDblKYT8",
    })
    .run_commands(
        "cd /app && npm ci",
        "cd /app && npm run build",
    )
)

# Persistent volume — SQLite DB survives redeploys
volume = modal.Volume.from_name("habit-tracker-data", create_if_missing=True)

# Secrets — create with:
#   modal secret create habit-tracker-secrets \
#     NEXT_PUBLIC_SUPABASE_URL=... \
#     NEXT_PUBLIC_SUPABASE_ANON_KEY=...
@app.function(
    image=image,
    volumes={"/data": volume},
    # max_containers=1 is REQUIRED to prevent concurrent SQLite writes
    min_containers=1,
    max_containers=1,
    scaledown_window=300,
    secrets=[modal.Secret.from_name("habit-tracker-secrets")],
)
@modal.web_server(port=3000)
def serve():
    env = {
        **os.environ,
        "NODE_ENV": "production",
        "DATABASE_PATH": "/data/habits.sqlite",
        "SITE_URL": "https://romaburekhin--habit-tracker-serve.modal.run",
    }
    subprocess.Popen(
        ["/app/node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"],
        cwd="/app",
        env=env,
    )
