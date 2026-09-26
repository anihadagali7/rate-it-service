const axios = require("axios");

// Transactional email through Brevo's API:
// https://developers.brevo.com/reference/sendtransacemail
const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 10000;

const sender = () => ({
  email: process.env.EMAIL_FROM,
  name: process.env.EMAIL_FROM_NAME || "Rate It",
});

// Throws an error that is safe to log: status and Brevo's error code/message,
// never the API key or the recipient's address.
const sendEmail = async ({ to, subject, textContent, htmlContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("Email not sent: BREVO_API_KEY is not set");
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error("Email not sent: EMAIL_FROM is not set");
  }

  try {
    await axios.post(
      BREVO_SEND_URL,
      {
        sender: sender(),
        to: [{ email: to }],
        subject,
        textContent,
        htmlContent,
      },
      {
        headers: {
          "api-key": apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );
  } catch (error) {
    const status = error.response?.status;
    const { code, message } = error.response?.data || {};
    throw new Error(
      status
        ? `Brevo send failed (${status}${code ? ` ${code}` : ""}): ${message || "no message"}`
        : `Brevo send failed: ${error.message}`
    );
  }
};

const sendVerificationEmail = async (toEmail, verificationUrl) => {
  await sendEmail({
    to: toEmail,
    subject: "Verify your Rate It email",
    textContent: `Confirm your email to finish setting up your Rate It account: ${verificationUrl}\n\nThis link expires in 24 hours.`,
    htmlContent: `
      <p>Confirm your email to finish setting up your Rate It account.</p>
      <p><a href="${verificationUrl}">Verify email address</a></p>
      <p>This link expires in 24 hours. If you didn't create a Rate It account, you can ignore this email.</p>
    `,
  });
};

const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  await sendEmail({
    to: toEmail,
    subject: "Reset your Rate It password",
    textContent: `We received a request to reset your Rate It password. Choose a new one here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.`,
    htmlContent: `
      <p>We received a request to reset your Rate It password.</p>
      <p><a href="${resetUrl}">Choose a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.</p>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
