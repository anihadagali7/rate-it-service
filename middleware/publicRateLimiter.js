require("dotenv").config();
const rateLimit = require("express-rate-limit");

/**
 * Guards routes reachable without auth (media info, ratings-by-media,
 * search) from scripted abuse now that a registered account is no longer
 * a prerequisite. Scoped by IP; overridable via env for tests.
 */
const WINDOW_MS =
  Number(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS) || 60 * 1000;
const MAX_REQUESTS = Number(process.env.PUBLIC_RATE_LIMIT_MAX) || 60;

const publicRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    errors: {
      msg: "Too many requests. Please try again later.",
    },
  },
});

module.exports = publicRateLimiter;
