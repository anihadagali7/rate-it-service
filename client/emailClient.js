const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const fromEmail = () => process.env.SENDGRID_FROM_EMAIL;

const sendVerificationEmail = async (toEmail, verificationUrl) => {
  await sgMail.send({
    to: toEmail,
    from: fromEmail(),
    subject: "Verify your Rate It email",
    text: `Confirm your email to finish setting up your Rate It account: ${verificationUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <p>Confirm your email to finish setting up your Rate It account.</p>
      <p><a href="${verificationUrl}">Verify email address</a></p>
      <p>This link expires in 24 hours. If you didn't create a Rate It account, you can ignore this email.</p>
    `,
  });
};

const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  await sgMail.send({
    to: toEmail,
    from: fromEmail(),
    subject: "Reset your Rate It password",
    text: `We received a request to reset your Rate It password. Choose a new one here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.`,
    html: `
      <p>We received a request to reset your Rate It password.</p>
      <p><a href="${resetUrl}">Choose a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.</p>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
