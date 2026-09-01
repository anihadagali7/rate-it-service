const bcrypt = require("bcrypt");
const UsersModel = require("../repository/userModel");
const emailClient = require("../client/emailClient");
const {
  createPasswordResetToken,
  hashToken,
} = require("../utils/passwordResetToken");
const { signJwtToken } = require("./authenticationService");
const { toAccountUser } = require("../utils/userSerializer");
const { sendBadRequest } = require("../utils/httpErrors");

// Identical for every request regardless of whether the email matches an
// account — the whole point is to not let a response reveal which emails
// are registered.
const GENERIC_REQUEST_MESSAGE =
  "If an account with that email exists, we've sent a link to reset the password.";

const buildResetUrl = (rawToken) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${frontendUrl}/reset-password?token=${rawToken}`;
};

const requestPasswordReset = async (email, response) => {
  const user = await UsersModel.findOne({ email, isActive: true });

  if (user) {
    const { rawToken, tokenHash, expires } = createPasswordResetToken();
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpires = expires;
    await user.save();

    // Fire-and-forget, same as signup's verification email — the response
    // below must go out identically whether this succeeds or not, both to
    // avoid leaking account existence and because a delivery failure here
    // isn't actionable by the requester anyway.
    emailClient
      .sendPasswordResetEmail(user.email, buildResetUrl(rawToken))
      .catch(() => {});
  }

  return response.status(200).json({
    status: "success",
    data: { msg: GENERIC_REQUEST_MESSAGE },
  });
};

const resetPasswordWithToken = async (token, newPassword, response) => {
  const tokenHash = hashToken(token);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Atomic findOneAndUpdate (rather than findOne then save) closes the race
  // where two requests with the same still-valid token could both pass the
  // expiry check before either write lands.
  const user = await UsersModel.findOneAndUpdate(
    {
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    },
    {
      password: hashedPassword,
      $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
      dateUpdated: Date.now(),
    },
    { new: true }
  );

  if (!user) {
    return sendBadRequest(
      response,
      "This password reset link is invalid or has expired"
    );
  }

  const accessToken = await signJwtToken(user);

  return response.status(200).json({
    status: "success",
    accessToken,
    data: { user: toAccountUser(user) },
  });
};

module.exports = { requestPasswordReset, resetPasswordWithToken };
