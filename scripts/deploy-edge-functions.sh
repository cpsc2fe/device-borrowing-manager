#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-iphdqxncfzsxfrmzuuab}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install it first (e.g., npm install -g supabase)."
  exit 1
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "SUPABASE_SERVICE_ROLE_KEY is required. Export it before running."
  exit 1
fi

supabase login

if [[ ! -f "supabase/config.toml" ]]; then
  supabase init
fi

supabase link --project-ref "$PROJECT_REF"
supabase secrets set SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
supabase functions deploy create-member
supabase functions deploy send-telegram-notification

echo "Edge Functions deployed: create-member, send-telegram-notification"
