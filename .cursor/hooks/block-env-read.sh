#!/bin/bash
# Cursor beforeReadFile hook: agents must not read .env files (see AGENTS.md).
# Templates such as .env.example are allowed. Shared by rate-it-ui and
# rate-it-service; keep both copies in sync.

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.file_path // empty')
name=$(basename -- "$file_path")

is_env=false
if [[ "$name" =~ ^\.env(\..+)?$ || "$name" =~ \.env$ ]]; then
  is_env=true
fi
if [[ "$name" =~ \.(example|sample|template)$ ]]; then
  is_env=false
fi

if $is_env; then
  jq -n --arg f "$name" '{
    permission: "deny",
    user_message: ("Blocked by project hook: agents may not read " + $f + "."),
    agent_message: ("Reading " + $f + " is not allowed. Env var names are documented in README.md; do not read or print .env values.")
  }'
  exit 0
fi

echo '{ "permission": "allow" }'
