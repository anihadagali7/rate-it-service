#!/bin/bash
# Blocks agents from reading .env files (see AGENTS.md). Templates such as
# .env.example are allowed. Used by both tools:
#   - Cursor: beforeReadFile hook (.cursor/hooks.json)
#   - Claude Code: PreToolUse hook on Read (.claude/settings.json)
# Shared by rate-it-ui and rate-it-service; keep both copies in sync.

input=$(cat)

# Claude Code sends { hook_event_name: "PreToolUse", tool_input: { file_path } };
# Cursor sends { file_path }.
is_claude=false
[ "$(printf '%s' "$input" | jq -r '.hook_event_name // empty')" = "PreToolUse" ] && is_claude=true
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .file_path // empty')
name=$(basename -- "$file_path")

is_env=false
if [[ "$name" =~ ^\.env(\..+)?$ || "$name" =~ \.env$ ]]; then
  is_env=true
fi
if [[ "$name" =~ \.(example|sample|template)$ ]]; then
  is_env=false
fi

if $is_env; then
  msg="Reading $name is not allowed. Env var names are documented in README.md; do not read or print .env values."
  if $is_claude; then
    jq -n --arg msg "$msg" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $msg
      }
    }'
  else
    jq -n --arg f "$name" --arg msg "$msg" '{
      permission: "deny",
      user_message: ("Blocked by project hook: agents may not read " + $f + "."),
      agent_message: $msg
    }'
  fi
  exit 0
fi

# Claude Code: print nothing so the normal permission flow still applies.
$is_claude || echo '{ "permission": "allow" }'
