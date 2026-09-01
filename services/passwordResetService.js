const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
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

const RESET_TOKEN_INVALID_MESSAGE =
  "This password reset link is invalid or has expired";

const buildResetUrl = (rawToken) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${frontendUrl}/reset-password?token=${rawToken}`;
};

const requestPasswordReset = async (email, response) => {
  const user = await UsersModel.findOne({ email, isActive: true });

  try {
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
    } else {
      // A real write round trip of comparable cost to `user.save()` above,
      // so response timing doesn't give away whether the email is
      // registered — the identical response body alone isn't enough if the
      // "account exists" branch is consistently slower.
      await UsersModel.updateOne({ _id: new mongoose.Types.ObjectId() }, {});
    }
  } catch (error) {
    // Never let a DB hiccup here surface as anything other than the same
    // generic response — a differing error path would itself be an
    // existence oracle.
  }

  return response.status(200).json({
    status: "success",
    data: { msg: GENERIC_REQUEST_MESSAGE },
  });
};

const resetPasswordWithToken = async (token, newPassword, response) => {
  const tokenHash = hashToken(token);
  const tokenFilter = {
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
    isActive: true,
  };

  // Cheap lookup before paying for bcrypt — this endpoint is public and
  // unrated-limited, so a garbage/expired token shouldn't cost a full
  // ~50-100ms hash before being rejected.
  const candidate = await UsersModel.findOne(tokenFilter);
  if (!candidate) {
    return sendBadRequest(response, RESET_TOKEN_INVALID_MESSAGE);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Atomic findOneAndUpdate (rather than a plain save on `candidate`) closes
  // the race where two requests with the same still-valid token could both
  // pass the lookup above before either write lands — this re-checks the
  // same filter at the moment of the write.
  const user = await UsersModel.findOneAndUpdate(
    tokenFilter,
    {
      password: hashedPassword,
      $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
      dateUpdated: Date.now(),
    },
    { new: true }
  );

  if (!user) {
    return sendBadRequest(response, RESET_TOKEN_INVALID_MESSAGE);
  }

  const accessToken = await signJwtToken(user);

  return response.status(200).json({
    status: "success",
    accessToken,
    data: { user: toAccountUser(user) },
  });
};

module.exports = { requestPasswordReset, resetPasswordWithToken };
