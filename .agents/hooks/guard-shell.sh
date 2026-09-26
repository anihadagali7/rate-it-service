#!/bin/bash
# Enforces the Git & PR rules in AGENTS.md for shell commands: no commits or
# pushes on master/main, no force pushes, no merging PRs, and no reading .env
# files through the shell. Used by both tools:
#   - Cursor: beforeShellExecution hook (.cursor/hooks.json)
#   - Claude Code: PreToolUse hook on Bash (.claude/settings.json)
# Shared by rate-it-ui and rate-it-service; keep both copies in sync.
#
# Fails open: if this script is missing (e.g. on a branch created before it
# existed) or errors, commands are allowed. GitHub branch protection on master
# (required CI checks, enforced for admins) is the server-side backstop.

input=$(cat)

# Claude Code sends { hook_event_name: "PreToolUse", tool_input: { command }, cwd };
# Cursor sends { command, cwd }.
is_claude=false
[ "$(printf '%s' "$input" | jq -r '.hook_event_name // empty')" = "PreToolUse" ] && is_claude=true
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // .command // empty')
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty')
[ -n "$cwd" ] || cwd=$PWD

deny() {
  if $is_claude; then
    jq -n --arg msg "$1" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("Blocked by project hook: " + $msg + " See the Git & PR workflow and data-safety rules in AGENTS.md.")
      }
    }'
  else
    jq -n --arg msg "$1" '{
      permission: "deny",
      user_message: ("Blocked by project hook: " + $msg),
      agent_message: ($msg + " See the Git & PR workflow and data-safety rules in AGENTS.md.")
    }'
  fi
  exit 0
}

branch=$(git -C "$cwd" symbolic-ref --short -q HEAD 2>/dev/null)

# Check each command in a chain (a && b; c | d) on its own.
segments=$(printf '%s\n' "$cmd" | awk '{ gsub(/&&|\|\||;|\|/, "\n"); print }')

while IFS= read -r seg; do
  seg="${seg#"${seg%%[![:space:]]*}"}"

  # Follow branch switches earlier in the chain, e.g. `git switch -c x && git commit`.
  if [[ "$seg" =~ ^git[[:space:]]+(switch|checkout)([[:space:]]+-[qf])*[[:space:]]+(-c|-C|-b|-B|--create)[[:space:]]+([^[:space:]]+) ]]; then
    branch=${BASH_REMATCH[4]}
  elif [[ "$seg" =~ ^git[[:space:]]+(switch|checkout)([[:space:]]+-[qf])*[[:space:]]+([^-[:space:]][^[:space:]]*)([[:space:]]|$) ]]; then
    branch=${BASH_REMATCH[3]}
  fi
  on_default_branch=false
  [[ "$branch" == "master" || "$branch" == "main" ]] && on_default_branch=true

  env_ref=$(printf '%s' "$seg" | grep -oE "(^|[[:space:]/\"'=<])\.env(\.[[:alnum:]_-]+)?([[:space:]\"')>]|$)" | grep -vE '\.env\.(example|sample|template)')
  if [ -n "$env_ref" ]; then
    deny "agents may not read or modify .env files."
  fi

  if [[ "$seg" =~ ^gh[[:space:]]+pr[[:space:]]+merge ]]; then
    deny "agents must not merge PRs; the user reviews and merges."
  fi

  if [[ "$seg" =~ ^git[[:space:]]+commit([[:space:]]|$) ]] && $on_default_branch; then
    deny "commits directly on $branch are not allowed. Create a feature/, fix/, or chore/ branch first."
  fi

  if [[ "$seg" =~ ^git[[:space:]]+push([[:space:]]|$) ]]; then
    if [[ "$seg" =~ [[:space:]](-f|--force|--force-with-lease)([[:space:]=]|$) || "$seg" =~ [[:space:]]\+[^[:space:]] ]]; then
      deny "force pushes are not allowed."
    fi
    if [[ "$seg" =~ [[:space:]:+](master|main)([[:space:]]|$) ]]; then
      deny "pushing to master/main is not allowed. Push a feature branch and open a PR."
    fi
    if $on_default_branch; then
      deny "you are on $branch; pushing from it is not allowed. Switch to a feature branch."
    fi
  fi
done <<< "$segments"

# Claude Code: print nothing so the normal permission flow still applies.
$is_claude || echo '{ "permission": "allow" }'
