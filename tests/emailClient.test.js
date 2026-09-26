jest.mock("axios");

const axios = require("axios");
const emailClient = require("../client/emailClient");

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

describe("emailClient (Brevo)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockResolvedValue({ status: 201, data: { messageId: "<m1>" } });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it.each([
    [
      "sendVerificationEmail",
      "Verify your Rate It email",
      "https://rate-it-ui.example.com/verify-email?token=abc123",
    ],
    [
      "sendPasswordResetEmail",
      "Reset your Rate It password",
      "https://rate-it-ui.example.com/reset-password?token=abc123",
    ],
  ])("%s sends through Brevo with the link", async (method, subject, link) => {
    await emailClient[method]("ani@example.com", link);

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = axios.post.mock.calls[0];
    expect(url).toBe(BREVO_SEND_URL);
    expect(body).toEqual(
      expect.objectContaining({
        sender: { email: process.env.EMAIL_FROM, name: "Rate It" },
        to: [{ email: "ani@example.com" }],
        subject,
      })
    );
    expect(body.htmlContent).toContain(link);
    expect(body.textContent).toContain(link);
    expect(config.headers["api-key"]).toBe(process.env.BREVO_API_KEY);
    expect(config.timeout).toEqual(expect.any(Number));
  });

  it("uses EMAIL_FROM_NAME for the sender name when set", async () => {
    process.env.EMAIL_FROM_NAME = "Rate It Team";

    await emailClient.sendVerificationEmail("ani@example.com", "https://x.test/v");

    expect(axios.post.mock.calls[0][1].sender.name).toBe("Rate It Team");
  });

  it("throws a loggable error with Brevo's status and message, without the key or recipient", async () => {
    axios.post.mockRejectedValue({
      response: {
        status: 401,
        data: { code: "unauthorized", message: "Key not found" },
      },
    });

    const error = await emailClient
      .sendPasswordResetEmail("ani@example.com", "https://x.test/r")
      .catch((e) => e);

    expect(error.message).toBe(
      "Brevo send failed (401 unauthorized): Key not found"
    );
    expect(error.message).not.toContain(process.env.BREVO_API_KEY);
    expect(error.message).not.toContain("ani@example.com");
  });

  it("throws on a network failure", async () => {
    axios.post.mockRejectedValue(new Error("timeout of 10000ms exceeded"));

    await expect(
      emailClient.sendVerificationEmail("ani@example.com", "https://x.test/v")
    ).rejects.toThrow("Brevo send failed: timeout of 10000ms exceeded");
  });

  it.each(["BREVO_API_KEY", "EMAIL_FROM"])(
    "throws without calling Brevo when %s is not set",
    async (name) => {
      delete process.env[name];

      await expect(
        emailClient.sendVerificationEmail("ani@example.com", "https://x.test/v")
      ).rejects.toThrow(`${name} is not set`);
      expect(axios.post).not.toHaveBeenCalled();
    }
  );
});
