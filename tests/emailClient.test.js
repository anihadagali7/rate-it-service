jest.mock("@sendgrid/mail");

const sgMail = require("@sendgrid/mail");
const emailClient = require("../client/emailClient");

describe("emailClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends a verification email via SendGrid with the given link", async () => {
    sgMail.send.mockResolvedValue();

    await emailClient.sendVerificationEmail(
      "ani@example.com",
      "https://rate-it-ui.example.com/verify-email?token=abc123"
    );

    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ani@example.com",
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: "Verify your Rate It email",
      })
    );
    const call = sgMail.send.mock.calls[0][0];
    expect(call.html).toContain(
      "https://rate-it-ui.example.com/verify-email?token=abc123"
    );
    expect(call.text).toContain(
      "https://rate-it-ui.example.com/verify-email?token=abc123"
    );
  });

  it("propagates a SendGrid failure to the caller", async () => {
    sgMail.send.mockRejectedValue(new Error("SendGrid is down"));

    await expect(
      emailClient.sendVerificationEmail("ani@example.com", "https://x.test/v")
    ).rejects.toThrow("SendGrid is down");
  });

  it("sends a password reset email via SendGrid with the given link", async () => {
    sgMail.send.mockResolvedValue();

    await emailClient.sendPasswordResetEmail(
      "ani@example.com",
      "https://rate-it-ui.example.com/reset-password?token=abc123"
    );

    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ani@example.com",
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: "Reset your Rate It password",
      })
    );
    const call = sgMail.send.mock.calls[0][0];
    expect(call.html).toContain(
      "https://rate-it-ui.example.com/reset-password?token=abc123"
    );
    expect(call.text).toContain(
      "https://rate-it-ui.example.com/reset-password?token=abc123"
    );
  });

  it("propagates a SendGrid failure for the password reset email to the caller", async () => {
    sgMail.send.mockRejectedValue(new Error("SendGrid is down"));

    await expect(
      emailClient.sendPasswordResetEmail("ani@example.com", "https://x.test/r")
    ).rejects.toThrow("SendGrid is down");
  });
});
