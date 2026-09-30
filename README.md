# rate-it-service

Backend API for [Rate It](https://github.com/anihadagali7/rate-it-ui), a social app for discovering, rating, and organizing movies, TV shows, music, and books.

The service is built with **Node.js**, **Express**, and **MongoDB** (via Mongoose). It powers user authentication, media metadata, ratings, playlists, wishlists, search, and social features for the React UI.

## What it does

- **Authentication** — user signup, login, JWT-based auth, and password reset
- **Users** — profiles, follow/unfollow, friends lists, and account updates
- **Media** — fetch and store movie/TV (TMDB), music (Spotify), and book (Google Books) details
- **Ratings** — create ratings, view user/media ratings, explore feed, and following feed
- **Playlists** — create playlists and add/remove media
- **Wishlists** — save media to a personal wishlist
- **Search** — search movies, TV, music, books, users, or all media types at once

Protected routes require a valid JWT in the `Authorization` header. The authenticated user's identity is taken from the token, not from request body fields.

## Prerequisites

- Node.js 24 (see `engines` in `package.json`; `nvm use` picks it up from `.nvmrc`)
- MongoDB database (local or hosted, e.g. MongoDB Atlas)
- API keys for external services (see Environment variables below)

## Environment variables

Create a `.env` file in the project root (this file is gitignored):

```env
MONGO_DB_HOST=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
APP_ENV=dev
ACCESS_TOKEN_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000

TMDB_TOKEN=your-tmdb-api-key
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
GOOGLE_API_KEY=your-google-books-api-key

GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
APPLE_CLIENT_ID=your-apple-services-id

BREVO_API_KEY=your-brevo-api-key
EMAIL_FROM=no-reply@your-domain.com
EMAIL_FROM_NAME=Rate It
FRONTEND_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

SLACK_TOKEN=your-slack-bot-token
SLACK_LOGIN_URL=https://hooks.slack.com/services/...
SLACK_MEDIA_URL=https://hooks.slack.com/services/...
SLACK_RATING_URL=https://hooks.slack.com/services/...

PUBLIC_RATE_LIMIT_WINDOW_MS=60000
PUBLIC_RATE_LIMIT_MAX=60
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20

PORT=8080
```

| Variable | Required | Notes |
|----------|----------|--------|
| `APP_ENV` | Recommended | Which environment this server is: `dev`, `prod` or `test`. `GET /api` reports it as `environment` (anything else, or unset, shows `unknown`) so you can confirm a local server is on the dev database. Set `dev` locally and on the staging app (`rate-it-service`, which uses the dev database), `prod` on `rate-it-service-prod` |
| `ACCESS_TOKEN_SECRET` | Yes | Secret used to sign and verify JWTs |
| `JWT_EXPIRES_IN` | No | JWT lifetime (default `7d`). Examples: `1h`, `12h`, `7d` |
| `CORS_ORIGIN` | Recommended | Comma-separated allowlist of browser origins (e.g. `https://your-app.vercel.app,http://localhost:3000`). In production with no value, browser origins are denied. Locally, defaults to `http://localhost:3000` and `http://127.0.0.1:3000` |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | For Google sign-in | OAuth client credentials from Google Cloud Console. Distinct from `GOOGLE_API_KEY` (Google Books). Used to exchange the frontend's auth code and verify the resulting ID token |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | For Facebook sign-in | From a Facebook Login app. Used to validate that an access token was issued to this app before trusting it |
| `APPLE_CLIENT_ID` | For Apple sign-in | Your Apple Services ID, used as the audience when verifying the identity token against Apple's JWKS |
| `BREVO_API_KEY` | For emails | Brevo API key (Settings → SMTP & API → API keys) used to send verification and password-reset emails. Without it, emails aren't sent and a warning is logged. Heroku has no fixed outbound IP, so turn off Brevo's IP blocking (Settings → Security → Authorized IPs → Deactivate blocking), or Brevo will start rejecting sends. Use separate keys for dev and prod |
| `EMAIL_FROM` | For emails | Sender address. It must be a sender or domain verified in Brevo (Senders, Domains & Dedicated IPs). Authenticate the domain (SPF/DKIM/DMARC) so mail doesn't land in spam |
| `EMAIL_FROM_NAME` | No | Sender display name; defaults to `Rate It` |
| `FRONTEND_URL` | For emails | Base URL used to build the verification and password-reset links emailed to users (e.g. `https://your-app.vercel.app`); defaults to `http://localhost:3000` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | For profile picture uploads | Credentials from your Cloudinary dashboard, used to upload and store user profile pictures |
| `PUBLIC_RATE_LIMIT_WINDOW_MS` / `PUBLIC_RATE_LIMIT_MAX` | No | Per-IP limit on routes reachable without auth (media info, ratings, search, explore). Defaults to 60 requests per 60000ms (1 minute) |
| `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX` | No | Per-IP limit on auth-sensitive routes (login, signup, social sign-in, email verification, password reset/change, profile picture upload). Defaults to 20 requests per 900000ms (15 minutes) |
| `PORT` | No | Defaults to `8080` locally; Heroku sets this automatically |

## Getting started

Install dependencies:

```bash
npm install
```

Start the API locally (uses `nodemon` for auto-reload):

```bash
npm start
```

The server runs at `http://localhost:8080` by default.

Health check:

```bash
curl http://localhost:8080/api
```

Expected response:

```json
{ "status": "UP" }
```

### Testing password reset locally

`POST /api/forgot-password` emails a one-time reset link through Brevo. Outside
production, the server also prints the link to its console, so you can test the flow
without working email:

```text
[dev] Password reset link for you@example.com: http://localhost:3000/reset-password?token=...
```

Open that link with the UI running on port 3000. It's only printed for an **active**
account that exists in the database you're connected to (dev). Auth routes share a
rate limit of 20 requests per 15 minutes per IP, and restarting the server resets it.

## Running tests

Tests use **Jest**, **Supertest**, and an in-memory MongoDB instance. External APIs (TMDB, Spotify, Google, Slack) are mocked in test files.

Run the full test suite:

```bash
npm test
```

Run a specific area:

```bash
npm test -- --testPathPattern="auth"
npm test -- --testPathPattern="media(Service|Route)"
npm test -- --testPathPattern="playlist(Service|Route)"
npm test -- --testPathPattern="rating(Service|Route)"
npm test -- --testPathPattern="search(Service|Route)"
npm test -- --testPathPattern="user(Service|Route)"
npm test -- --testPathPattern="wishlist(Service|Route)"
```

## API overview

Every endpoint is documented in [`openapi.json`](openapi.json); browse it locally at
[`http://localhost:8080/api/docs`](http://localhost:8080/api/docs). The areas are:

| Area | Base path |
|------|-----------|
| Auth | `/api` |
| Users | `/api` |
| Ratings | `/api/ratings` |
| Media | `/api/media` |
| Search | `/api/search` |
| Playlists | `/api/playlist` |
| Wishlists | `/api/wishlist` |
| Likes | `/api/likes` |
| Comments | `/api/comments` |

### OpenAPI spec and interactive docs

The API contract is in [`openapi.json`](openapi.json), generated from `@openapi` comments on
each route plus [`openapi/components.yaml`](openapi/components.yaml):

```bash
npm run openapi         # regenerate openapi.json after changing a route's annotation
npm run openapi:check   # fail if openapi.json is out of date (CI runs this)
```

When the server runs outside production, it serves Swagger UI at
[`http://localhost:8080/api/docs`](http://localhost:8080/api/docs) and the raw spec at
`/api/openapi.json`. To call protected endpoints, click **Authorize** and paste the
`accessToken` from `/api/login` as is, without a `Bearer ` prefix. Neither route exists in
production.

Every route must be documented: `tests/openapi.test.js` fails CI when a route has no
`@openapi` block.

## Deploying to Heroku

The app includes a `Procfile` that starts the server with:

```text
web: node server.js
```

Heroku uses the Node version from `engines` in `package.json` (currently `24.x`). Node 24
needs the `heroku-24` stack; check it with `heroku stack -a <app>`.

### First-time setup

1. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) and log in:

   ```bash
   heroku login
   ```

2. Create the Heroku app (skip if it already exists):

   ```bash
   heroku create your-rate-it-service
   ```

3. Add the Heroku git remote:

   ```bash
   heroku git:remote -a your-rate-it-service
   ```

4. Set config vars on Heroku (same values as your `.env`):

   ```bash
   heroku config:set MONGO_DB_HOST="your-mongodb-uri"
   heroku config:set ACCESS_TOKEN_SECRET="your-jwt-secret"
   heroku config:set JWT_EXPIRES_IN="7d"
   heroku config:set CORS_ORIGIN="https://your-frontend-origin"
   heroku config:set TMDB_TOKEN="your-tmdb-token"
   heroku config:set SPOTIFY_CLIENT_ID="your-spotify-client-id"
   heroku config:set SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
   heroku config:set GOOGLE_API_KEY="your-google-api-key"
   heroku config:set GOOGLE_OAUTH_CLIENT_ID="your-google-oauth-client-id"
   heroku config:set GOOGLE_OAUTH_CLIENT_SECRET="your-google-oauth-client-secret"
   heroku config:set FACEBOOK_APP_ID="your-facebook-app-id"
   heroku config:set FACEBOOK_APP_SECRET="your-facebook-app-secret"
   heroku config:set APPLE_CLIENT_ID="your-apple-services-id"
   heroku config:set BREVO_API_KEY="your-brevo-api-key"
   heroku config:set EMAIL_FROM="no-reply@your-domain.com"
   heroku config:set FRONTEND_URL="https://your-frontend-origin"
   heroku config:set CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
   heroku config:set CLOUDINARY_API_KEY="your-cloudinary-api-key"
   heroku config:set CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
   heroku config:set PUBLIC_RATE_LIMIT_WINDOW_MS="60000"
   heroku config:set PUBLIC_RATE_LIMIT_MAX="60"
   heroku config:set AUTH_RATE_LIMIT_WINDOW_MS="900000"
   heroku config:set AUTH_RATE_LIMIT_MAX="20"
   heroku config:set SLACK_TOKEN="your-slack-token"
   heroku config:set SLACK_LOGIN_URL="your-slack-webhook"
   heroku config:set SLACK_MEDIA_URL="your-slack-webhook"
   heroku config:set SLACK_RATING_URL="your-slack-webhook"
   ```

   Or set them in the Heroku Dashboard under **Settings → Config Vars**.

### Deploy a new version

1. Commit your changes on the branch you deploy from (usually `main`):

   ```bash
   git add .
   git commit -m "Describe your changes"
   ```

2. Push to Heroku:

   ```bash
   git push heroku main
   ```

   If your default branch is `master`:

   ```bash
   git push heroku master
   ```

3. Verify the deployment:

   ```bash
   heroku open
   heroku logs --tail
   ```

4. Confirm the API is up:

   ```bash
   curl https://your-rate-it-service.herokuapp.com/api
   ```

### Notes for Heroku

- Do **not** commit `node_modules` or `.env`. Dependencies are installed during the Heroku build from `package.json` / `package-lock.json`.
- After changing environment variables, restart the dyno if needed:

  ```bash
  heroku restart
  ```

- If the UI points at this API, update the UI's `REACT_APP_BASE_URL` to your Heroku app URL after deployment.

## Project structure

```text
rate-it-service/
├── app.js                 # Express app (used by server and tests)
├── server.js              # Starts the HTTP server
├── configuration/         # MongoDB connection
├── middleware/            # JWT auth middleware
├── routes/                # API route definitions
├── services/              # Business logic
├── repository/            # Mongoose models
├── client/                # External API clients (TMDB, Spotify, Google, Slack)
└── tests/                 # Jest test suites
```
