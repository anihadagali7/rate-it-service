#!/bin/bash
# Removes this repo's git worktrees whose work has been merged, plus their local
# branches. Shared by rate-it-ui and rate-it-service; keep both copies in sync.
#
#   bash .agents/scripts/clean-merged-worktrees.sh [--dry-run] [--quiet]
#
# Runs automatically when a Claude Code session starts (.claude/settings.json) and
# at the start of the build-story and ship-feature workflows. A worktree is removed
# only when ALL of these hold, so nothing unfinished or unsaved is ever lost:
#   - it isn't the main checkout, and it's on a branch (not a detached HEAD);
#   - a PR for that branch is merged, its head commit is exactly the worktree's
#     HEAD (no work added after the merge), and no PR for the branch is still open;
#   - `git status` is clean (no uncommitted or untracked files);
#   - no running process has its working directory inside it (another session,
#     a dev server, a terminal);
#   - any .env file in it is identical to the main checkout's (it may hold secrets
#     that exist nowhere else).
# Removal uses plain `git worktree remove` (never --force). Fails open: if gh, jq or
# the network is unavailable, it does nothing.

DRY_RUN=false
QUIET=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --quiet) QUIET=true ;;
  esac
done

say() { $QUIET || echo "$@"; }

command -v gh >/dev/null 2>&1 && command -v jq >/dev/null 2>&1 || {
  say "clean-merged-worktrees: skipped (needs gh and jq)"
  exit 0
}
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

main=$(git worktree list --porcelain | awk '/^worktree /{ print substr($0, 10); exit }')
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) || {
  say "clean-merged-worktrees: skipped (can't reach GitHub)"
  exit 0
}

# Entries whose folder was deleted by hand.
if $DRY_RUN; then
  git -C "$main" worktree prune --dry-run --verbose 2>&1 | sed 's/^/would prune: /' | while read -r line; do say "$line"; done
else
  git -C "$main" worktree prune
fi

# Working directories of every running process (to skip worktrees in use).
in_use_dirs=$(lsof -a -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')

in_use() {
  local dir=$1
  while IFS= read -r cwd; do
    [ -n "$cwd" ] || continue
    case "$cwd/" in "$dir"/*) return 0 ;; esac
  done <<< "$in_use_dirs"
  return 1
}

env_files_safe() {
  local dir=$1 file name
  for file in "$dir"/.env "$dir"/.env.*; do
    [ -e "$file" ] || continue
    name=$(basename "$file")
    case "$name" in *.example | *.sample | *.template) continue ;; esac
    if ! cmp -s "$file" "$main/$name"; then
      echo "$name"
      return 1
    fi
  done
  return 0
}

while IFS=$'\t' read -r path head branch; do
  [ -n "$path" ] || continue
  [ "$path" = "$main" ] && continue
  [ -d "$path" ] || continue
  label="${path/#$HOME/~}"

  if [ -z "$branch" ]; then
    say "keep $label: detached HEAD"
    continue
  fi

  prs=$(gh pr list -R "$repo" --head "$branch" --state all \
    --json number,state,headRefOid 2>/dev/null) || {
    say "keep $label: couldn't look up PRs for $branch"
    continue
  }
  if [ "$(jq '[.[] | select(.state == "OPEN")] | length' <<< "$prs")" != "0" ]; then
    say "keep $label: $branch has an open PR"
    continue
  fi
  merged_pr=$(jq -r --arg head "$head" \
    '[.[] | select(.state == "MERGED" and .headRefOid == $head)][0].number // empty' <<< "$prs")
  if [ -z "$merged_pr" ]; then
    if [ "$(jq '[.[] | select(.state == "MERGED")] | length' <<< "$prs")" != "0" ]; then
      say "keep $label: has commits that weren't in the merged PR"
    else
      say "keep $label: $branch isn't merged"
    fi
    continue
  fi

  if [ -n "$(git -C "$path" status --porcelain 2>/dev/null)" ]; then
    say "keep $label: has uncommitted or untracked changes"
    continue
  fi
  if in_use "$path"; then
    say "keep $label: in use by a running process"
    continue
  fi
  if ! differing=$(env_files_safe "$path"); then
    say "keep $label: its $differing differs from the main checkout's (remove it by hand once saved)"
    continue
  fi

  if $DRY_RUN; then
    echo "would remove $label ($branch, PR #$merged_pr merged)"
    continue
  fi
  if git -C "$main" worktree remove "$path" 2>/dev/null; then
    git -C "$main" branch -D "$branch" >/dev/null 2>&1
    echo "removed $label ($branch, PR #$merged_pr merged)"
  else
    say "keep $label: git worktree remove refused"
  fi
done < <(git worktree list --porcelain | awk '
  /^worktree / { path = substr($0, 10); head = ""; branch = "" }
  /^HEAD /     { head = substr($0, 6) }
  /^branch /   { branch = substr($0, 8); sub(/^refs\/heads\//, "", branch) }
  /^$/         { if (path != "") print path "\t" head "\t" branch; path = "" }
  END          { if (path != "") print path "\t" head "\t" branch }
')

exit 0
