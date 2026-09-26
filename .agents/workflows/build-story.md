# Workflow: build a story

Implement one GitHub Issue end to end and open a pull request for review.

> This file is shared by Claude Code (`/build-story`) and Cursor (`/build-story`). An
> identical copy lives in both `rate-it-ui` and `rate-it-service` — keep them in sync.

**Input:** an issue reference: `58`, `#58`, `ui#58`, `service#14`, or a full issue URL.
A bare number means the repo you're currently in.

## Repos

| Short name | GitHub | Local path (from either repo) |
|------------|--------|-------------------------------|
| `ui` | `anihadagali7/rate-it-ui` | `../rate-it-ui` |
| `service` | `anihadagali7/rate-it-service` | `../rate-it-service` |

Do the work in the repo that owns the issue. If you're in the other repo, work in the
sibling path.

## Steps

### 1. Read the story

```bash
gh issue view <n> -R anihadagali7/<repo> --comments
```

Stop and tell the user (don't start coding) if:
- the issue has no acceptance criteria, or is too vague to test → suggest `/story` to refine it;
- it's size **L** with no split → suggest splitting it;
- a dependency listed under *Dependencies* is still open. Check with
  `gh issue view <dep> -R <repo> --json state`. A service dependency must be merged
  before its UI story can be built.

Read `AGENTS.md` in the owning repo (and the other repo's, if the story touches the API
contract).

### 2. Set up a branch

- The working tree must be clean (`git status`). If it isn't, stop and ask — never
  stash, reset, or discard someone else's changes.
- Start from the latest `master`: `git fetch origin && git switch -c <branch> origin/master`.
- Branch name: `feature/<n>-<short-slug>` (or `fix/` for bugs, `chore/` for tech debt).

### 3. Plan

Map each acceptance criterion to the files you'll change. Reuse existing patterns and
shared components listed in `AGENTS.md`. For a size **M** story, or if you had to make a
judgment call the story doesn't cover, show the plan to the user briefly before coding.

### 4. Implement

- Follow the conventions in `AGENTS.md` exactly (layering, response shapes, styling,
  auth, error handling).
- Write or update tests alongside the code — every acceptance criterion should be
  covered by a test where practical.
- Stay in scope. Note unrelated problems you find as follow-ups; don't fix them here.
- If the story turns out to be wrong or impossible as written, stop and explain
  rather than inventing a different feature.

### 5. Verify

- Run the full test suite: `npm test` (service) or `npm run test:ci` (ui). All tests must pass.
- **service:** if the local server is running against the **dev** database, exercise
  new endpoints with `curl`. Never touch prod.
- **ui:** run the app and check the feature in a browser at mobile (375px) and desktop
  widths, including logged-out and error states where relevant. Check the console for
  errors. Take screenshots for the PR if your tools support it.
- Re-read the full diff (`git diff origin/master`). Remove debug logging, commented-out
  code, and unrelated changes. Make sure no secrets or `.env` values were added.

### 6. Commit, push, open the PR

```bash
git add <files>
git commit -m "<Imperative summary> (#<n>)"
git push -u origin <branch>
gh pr create -R anihadagali7/<repo> --base master --title "<title>" --body-file <file>
```

Fill in the PR body using `.github/pull_request_template.md`. It must include
`Closes #<n>` and the acceptance criteria as a checklist, each ticked only if it's done
and verified.

Don't merge the PR — the user reviews and merges.

### 7. Report

Give the user:
- the PR URL;
- the acceptance-criteria checklist with status;
- anything not done, any deviations from the story, and why;
- deploy notes: new env vars, migrations/scripts to run, backend dependencies;
- suggested follow-up stories, if any.
