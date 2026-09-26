const crypto = require("crypto");

// Shorter-lived than the email-verification token (24h) — a leaked password
// reset link is more immediately dangerous than a leaked verification link.
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// The raw token goes in the emailed link; only its hash is ever stored, the
// same way passwords are hashed rather than stored in plain text.
const createPasswordResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  return { rawToken, tokenHash, expires };
};

const hashToken = (rawToken) => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

module.exports = { createPasswordResetToken, hashToken };
