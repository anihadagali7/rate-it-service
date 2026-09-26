#!/bin/bash
# Cursor beforeShellExecution hook enforcing the Git & PR rules in AGENTS.md:
# no commits or pushes on master/main, no force pushes, no merging PRs, and no
# reading .env files through the shell. Mirrors the deny list in
# .claude/settings.json. Shared by rate-it-ui and rate-it-service; keep both
# copies in sync.

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.command // empty')
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty')
[ -n "$cwd" ] || cwd=$PWD

deny() {
  jq -n --arg msg "$1" '{
    permission: "deny",
    user_message: ("Blocked by project hook: " + $msg),
    agent_message: ($msg + " See the Git & PR workflow and data-safety rules in AGENTS.md.")
  }'
  exit 0
}

branch=$(git -C "$cwd" symbolic-ref --short -q HEAD 2>/dev/null)
on_default_branch=false
[[ "$branch" == "master" || "$branch" == "main" ]] && on_default_branch=true

# Check each command in a chain (a && b; c | d) on its own.
segments=$(printf '%s\n' "$cmd" | awk '{ gsub(/&&|\|\||;|\|/, "\n"); print }')

while IFS= read -r seg; do
  seg="${seg#"${seg%%[![:space:]]*}"}"

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

echo '{ "permission": "allow" }'
