# Bugbot review rules — rate-it-service

Express 4 + Mongoose 6 API for Rate It. Full conventions are in `AGENTS.md`; these are
the rules most worth flagging in review. The UI (`anihadagali7/rate-it-ui`) depends on
the response shapes below.

## Security (highest priority)
- Never return raw user documents. Users must pass through `toPublicUser()` so password
  hashes and private fields never leak — including users embedded via `populate()`.
- Mutating endpoints need `authenticateToken`, and must check that `request.user` owns
  the resource being changed or deleted (ratings, comments, playlists, wishlist). Flag
  any update/delete keyed only by an ID from the request.
- Don't pass request values straight into Mongo queries without validation — an object
  like `{ "$ne": null }` in `request.body` or `request.query` enables NoSQL injection.
  Validate with `express-validator` or coerce to strings/ObjectIds.
- Public unauthenticated GETs need `publicRateLimiter`; login/signup/password/upload
  endpoints need `authRateLimiter`.
- Don't use the messages `"Token not found"` or `"Invalid token"` for non-auth errors —
  the UI logs the user out when it sees them with a 401/403.
- Flag secrets, tokens, or `.env` values in code, logs, or tests.

## Reliability
- Express 4 doesn't catch rejected promises. Service code that awaits DB writes or
  external calls must catch and respond: `sendError` (500), `sendBadGateway` (502) for
  upstream failures, `isDuplicateKeyError` → `sendConflict` (409). Flag unguarded awaits.
- Slack notifications are fire-and-forget; a Slack failure must never fail the request.
- Prod runs **Node 24** (`engines` in `package.json`, `.nvmrc`). Flag new dependencies
  whose `engines` exclude Node 24, or that need a native build step (prefer packages that
  ship prebuilt binaries).

## API contract
- Success: `{ status: "success", data: { <namedPayload> } }`. Error: `{ errors: { msg } }`
  via `utils/httpErrors.js`. Flag responses that break this shape.
- Routes stay thin (route → service → repository). Services write to `response` directly.
- A changed path, param, or response shape must be backward compatible or come with the
  matching UI change (`rate-it-ui/src/client/*Client.js`). New/changed routes must update
  the API map in `AGENTS.md`.

## Tests and config
- New or changed endpoints need both a route test (Supertest) and a service test,
  covering happy path, 401/403, not-found, and validation errors.
- External clients must be mocked (`jest.mock("../client/<name>Client")`); tests must never
  hit a real network service or database.
- New indexes need a case in `tests/modelIndexes.test.js`.
- New env vars must be added to `README.md` and `tests/setupEnv.js` and called out in the PR.
- Schema changes needing a data migration need an idempotent script in `scripts/`.
