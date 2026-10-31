#!/usr/bin/env bash
# Vercel build: seed the Neon database once (only if empty), then build the frontend.
set -euo pipefail

if env | grep -qE '(^DATABASE_URL=|_DATABASE_URL=|^POSTGRES_URL=)'; then
  echo "Database configured; seeding if empty..."
  python3 -m venv /tmp/seedenv
  /tmp/seedenv/bin/pip install --quiet -r requirements.txt
  if [ "${SEED_RESET:-0}" = "1" ]; then
    # one-time rebuild of the synthetic demo database (e.g. after a schema change); turn SEED_RESET off afterwards
    echo "SEED_RESET=1: rebuilding the synthetic demo database from scratch..."
    (cd backend && /tmp/seedenv/bin/python -m app.seed --reset)
  else
    (cd backend && /tmp/seedenv/bin/python -m app.seed --if-empty)
  fi
else
  echo "WARNING: no DATABASE_URL / Neon variables found; skipping seed. Connect a Neon database and redeploy."
fi

cd frontend && npm run build
