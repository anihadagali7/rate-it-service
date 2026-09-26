jest.mock("../client/slackClient", () => ({
  postMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../client/emailClient", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const app = require("../app");
const UsersModel = require("../repository/userModel");
const emailClient = require("../client/emailClient");
const { hashToken } = require("../utils/emailVerificationToken");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser } = require("./helpers/seed");

const validUser = {
  firstName: "Ani",
  lastName: "Hadagali",
  email: "ani@example.com",
  password: "Password1!",
  phoneNumber: "3135551212",
  userName: "anihadagali7",
};

describe("Email verification", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("signup dispatch", () => {
    it("sends a verification email and leaves the new account unverified", async () => {
      const response = await request(app)
        .post("/api/create-user")
        .send(validUser);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.data.user.isEmailVerified).toBe(false);
      expect(emailClient.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(emailClient.sendVerificationEmail).toHaveBeenCalledWith(
        validUser.email,
        expect.stringContaining("/verify-email?token=")
      );

      const stored = await UsersModel.findOne({
        email: validUser.email,
      }).select("+emailVerificationTokenHash +emailVerificationExpires");
      expect(stored.emailVerificationTokenHash).toEqual(expect.any(String));
      expect(stored.emailVerificationExpires.getTime()).toBeGreaterThan(
        Date.now()
      );
    });

    it("still creates the account when the verification email fails to send", async () => {
      emailClient.sendVerificationEmail.mockRejectedValueOnce(
        new Error("Brevo send failed (503): down")
      );
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const response = await request(app)
        .post("/api/create-user")
        .send(validUser);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe(validUser.email);
      await new Promise((resolve) => setImmediate(resolve));
      expect(consoleError).toHaveBeenCalledWith(
        "Verification email failed:",
        "Brevo send failed (503): down"
      );
      consoleError.mockRestore();
    });
  });

  describe("POST /api/verify-email", () => {
    it("rejects a missing token", async () => {
      const response = await request(app).post("/api/verify-email").send({});

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
    });

    it("rejects an unknown token", async () => {
      const response = await request(app)
        .post("/api/verify-email")
        .send({ token: "not-a-real-token" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe(
        "This verification link is invalid or has expired"
      );
    });

    it("rejects an expired token without verifying the account", async () => {
      const user = await createTestUser({
        email: "expired@example.com",
        userName: "expireduser",
        isEmailVerified: false,
      });
      await UsersModel.findByIdAndUpdate(user._id, {
        emailVerificationTokenHash: hashToken("expired-raw-token"),
        emailVerificationExpires: new Date(Date.now() - 1000),
      });

      const response = await request(app)
        .post("/api/verify-email")
        .send({ token: "expired-raw-token" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);

      const stillUnverified = await UsersModel.findById(user._id);
      expect(stillUnverified.isEmailVerified).toBe(false);
    });

    it("verifies the account and clears the token on a valid, unexpired token", async () => {
      const user = await createTestUser({
        email: "verifyme@example.com",
        userName: "verifyme",
        isEmailVerified: false,
      });
      await UsersModel.findByIdAndUpdate(user._id, {
        emailVerificationTokenHash: hashToken("valid-raw-token"),
        emailVerificationExpires: new Date(Date.now() + 1000 * 60 * 60),
      });

      const response = await request(app)
        .post("/api/verify-email")
        .send({ token: "valid-raw-token" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.user.isEmailVerified).toBe(true);

      const updated = await UsersModel.findById(user._id).select(
        "+emailVerificationTokenHash +emailVerificationExpires"
      );
      expect(updated.isEmailVerified).toBe(true);
      expect(updated.emailVerificationTokenHash).toBeUndefined();
      expect(updated.emailVerificationExpires).toBeUndefined();
    });

    it("rejects reusing the same token twice", async () => {
      const user = await createTestUser({
        email: "onetime@example.com",
        userName: "onetimeuser",
        isEmailVerified: false,
      });
      await UsersModel.findByIdAndUpdate(user._id, {
        emailVerificationTokenHash: hashToken("one-time-token"),
        emailVerificationExpires: new Date(Date.now() + 1000 * 60 * 60),
      });

      const first = await request(app)
        .post("/api/verify-email")
        .send({ token: "one-time-token" });
      expect(first).toSatisfyApiSpec();
      expect(first.status).toBe(200);

      const second = await request(app)
        .post("/api/verify-email")
        .send({ token: "one-time-token" });
      expect(second).toSatisfyApiSpec();
      expect(second.status).toBe(400);
    });
  });

  describe("POST /api/account/resend-verification", () => {
    let user;
    let accessToken;

    beforeEach(async () => {
      user = await createTestUser({ isEmailVerified: false });
      accessToken = createAccessToken({
        email: user.email,
        userName: user.userName,
        id: user._id.toString(),
      });
    });

    it("returns 401 when no token is provided", async () => {
      const response = await request(app).post(
        "/api/account/resend-verification"
      );

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(401);
    });

    it("sends a fresh verification email for an unverified account", async () => {
      const response = await request(app)
        .post("/api/account/resend-verification")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(emailClient.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(emailClient.sendVerificationEmail).toHaveBeenCalledWith(
        user.email,
        expect.stringContaining("/verify-email?token=")
      );
    });

    it("returns a clean 502 instead of crashing when the email provider fails", async () => {
      emailClient.sendVerificationEmail.mockRejectedValueOnce(
        new Error("Brevo send failed (503): down")
      );
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const response = await request(app)
        .post("/api/account/resend-verification")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(502);
      expect(response.body.errors.msg).toEqual(expect.any(String));
      expect(consoleError).toHaveBeenCalledWith(
        "Verification email failed:",
        "Brevo send failed (503): down"
      );
      consoleError.mockRestore();
    });

    it("rejects resending for an already-verified account", async () => {
      await UsersModel.findByIdAndUpdate(user._id, { isEmailVerified: true });

      const response = await request(app)
        .post("/api/account/resend-verification")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe("This email is already verified");
      expect(emailClient.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("issues a new token that invalidates any previously issued one", async () => {
      await UsersModel.findByIdAndUpdate(user._id, {
        emailVerificationTokenHash: hashToken("stale-token"),
        emailVerificationExpires: new Date(Date.now() + 1000 * 60 * 60),
      });

      const response = await request(app)
        .post("/api/account/resend-verification")
        .set("Authorization", accessToken);
      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);

      const staleAttempt = await request(app)
        .post("/api/verify-email")
        .send({ token: "stale-token" });
      expect(staleAttempt).toSatisfyApiSpec();
      expect(staleAttempt.status).toBe(400);
    });
  });
});
