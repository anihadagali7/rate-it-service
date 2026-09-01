require("dotenv").config();
const rateLimit = require("express-rate-limit");

/**
 * Guards auth-sensitive routes — login, signup, social-auth token exchange,
 * email verification, password reset/change — from brute-force, credential
 * stuffing, spam-registration, and email-bombing abuse. Tighter than
 * publicRateLimiter since these actions are higher-value targets than plain
 * browsing/search. Scoped by IP; overridable via env for tests.
 */
const WINDOW_MS =
  Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX) || 20;

const authRateLimiter = rateLimit({
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

module.exports = authRateLimiter;
