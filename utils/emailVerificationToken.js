const crypto = require("crypto");

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// The raw token goes in the emailed link; only its hash is ever stored, the
// same way passwords are hashed rather than stored in plain text.
const createVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  return { rawToken, tokenHash, expires };
};

const hashToken = (rawToken) => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

module.exports = { createVerificationToken, hashToken };
