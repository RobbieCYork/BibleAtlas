#!/usr/bin/env bash
# 058_verify_rest.sh — outside-in check, run AFTER sql/058 is applied.
# Asks the live API, as a signed-out visitor (anon key only), whether the owner
# account is owner. Before 058 this printed `true`; after 058 it must print `false`.
# Reads capstone-bible/.env.local; prints no secret and no user id.
#   usage: bash sql/058_verify_rest.sh <owner-user-uuid>
set -euo pipefail
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
[ -f "$ENV_FILE" ] || ENV_FILE="/Users/robbieyork/Documents/Claude/Projects/Capstone Bible/capstone-bible/.env.local"
URL=$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
KEY=$(grep -E '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
OWNER="${1:?owner user uuid required}"
printf 'signed-out probe of owner -> '
curl -s -X POST "$URL/rest/v1/rpc/has_role_at_least" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  --data "{\"p_role\":\"owner\",\"p_uid\":\"$OWNER\"}"
echo "   (expect: false)"
