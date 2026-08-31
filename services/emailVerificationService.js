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

// Generates a token and stores its hash on the user, without sending
// anything yet — split out so callers can decide whether the outbound send
// itself should be awaited (resend) or fire-and-forget (signup).
const issueVerificationToken = async (user) => {
  const { rawToken, tokenHash, expires } = createVerificationToken();

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = expires;
  await user.save();

  return rawToken;
};

// Generates a token, stores its hash on the user, and emails the raw token.
// Used for resends, where the caller awaits this and needs to know whether
// the send actually succeeded.
const issueVerificationEmail = async (user) => {
  const rawToken = await issueVerificationToken(user);

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

  // A single atomic findOneAndUpdate (rather than findOne then save) closes
  // the race where two requests with the same still-valid token could both
  // pass the expiry check before either write lands.
  const user = await UsersModel.findOneAndUpdate(
    {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    },
    {
      isEmailVerified: true,
      $unset: { emailVerificationTokenHash: 1, emailVerificationExpires: 1 },
      dateUpdated: Date.now(),
    },
    { new: true }
  );

  if (!user) {
    return sendError(
      response,
      400,
      "This verification link is invalid or has expired"
    );
  }

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

  try {
    await issueVerificationEmail(user);
  } catch (error) {
    return sendError(
      response,
      502,
      "Could not send the verification email. Please try again shortly."
    );
  }

  return response.status(200).json({ status: "success" });
};

// For signup-time call sites. Awaits the (fast, local) token save so a
// verify-email click immediately after signup works even before the email
// arrives, but does not await the outbound SendGrid call itself — mirrors
// the existing non-blocking slackClient.postMessage pattern used elsewhere
// for post-signup side effects. Never rejects: the account is created either
// way, and a failed send just means the user needs the resend endpoint.
const issueVerificationEmailSilently = async (user) => {
  try {
    const rawToken = await issueVerificationToken(user);
    emailClient
      .sendVerificationEmail(user.email, buildVerificationUrl(rawToken))
      .catch(() => {});
  } catch (error) {
    // Signup still succeeds even if we can't persist/send the verification
    // token — the user can request another one via the resend endpoint.
  }
};

module.exports = {
  issueVerificationEmail,
  issueVerificationEmailSilently,
  verifyEmail,
  resendVerificationEmail,
};
