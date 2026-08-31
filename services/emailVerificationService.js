const UsersModel = require("../repository/userModel");
const emailClient = require("../client/emailClient");
const {
  createVerificationToken,
  hashToken,
} = require("../utils/emailVerificationToken");
const { toAccountUser } = require("../utils/userSerializer");
const { sendError, sendNotFound } = require("../utils/httpErrors");

const buildVerificationUrl = (rawToken) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${frontendUrl}/verify-email?token=${rawToken}`;
};

// Generates a token, stores its hash on the user, and emails the raw token.
// Used at signup (both password and social) and for resends. Callers should
// not let a delivery failure block whatever response the user is waiting on
// — a failed send just means they'll need to use the resend endpoint.
const issueVerificationEmail = async (user) => {
  const { rawToken, tokenHash, expires } = createVerificationToken();

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = expires;
  await user.save();

  await emailClient.sendVerificationEmail(
    user.email,
    buildVerificationUrl(rawToken)
  );
};

const verifyEmail = async (token, response) => {
  if (!token) {
    return sendError(response, 400, "Verification token is required");
  }

  const tokenHash = hashToken(token);

  const user = await UsersModel.findOne({
    emailVerificationTokenHash: tokenHash,
  }).select("+emailVerificationTokenHash +emailVerificationExpires");

  if (!user || user.emailVerificationExpires < new Date()) {
    return sendError(
      response,
      400,
      "This verification link is invalid or has expired"
    );
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  user.dateUpdated = Date.now();
  await user.save();

  return response.status(200).json({
    status: "success",
    data: { user: toAccountUser(user) },
  });
};

const resendVerificationEmail = async (userId, response) => {
  const user = await UsersModel.findById(userId);

  if (!user) {
    return sendNotFound(response, "User not found");
  }

  if (user.isEmailVerified) {
    return sendError(response, 400, "This email is already verified");
  }

  await issueVerificationEmail(user);

  return response.status(200).json({ status: "success" });
};

module.exports = { issueVerificationEmail, verifyEmail, resendVerificationEmail };
