// Several requests per test hit the auth rate limiter; raise the ceiling so it
// doesn't trip (authRateLimiter.test.js covers limiting). Set before the app loads.
process.env.AUTH_RATE_LIMIT_MAX = "1000";

jest.mock("../client/slackClient", () => ({
  postMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../client/emailClient", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../app");
const UsersModel = require("../repository/userModel");
const emailClient = require("../client/emailClient");
const { hashToken } = require("../utils/passwordResetToken");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createTestUser } = require("./helpers/seed");

describe("Password reset", () => {
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

  describe("POST /api/forgot-password", () => {
    it("rejects a malformed email", async () => {
      const response = await request(app)
        .post("/api/forgot-password")
        .send({ email: "not-an-email" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
    });

    it("returns the same generic message for a known email and issues a reset token", async () => {
      const user = await createTestUser({ email: "known@example.com" });

      const response = await request(app)
        .post("/api/forgot-password")
        .send({ email: "known@example.com" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.msg).toEqual(expect.any(String));
      expect(emailClient.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(emailClient.sendPasswordResetEmail).toHaveBeenCalledWith(
        "known@example.com",
        expect.stringContaining("/reset-password?token=")
      );

      const stored = await UsersModel.findById(user._id).select(
        "+passwordResetTokenHash +passwordResetExpires"
      );
      expect(stored.passwordResetTokenHash).toEqual(expect.any(String));
      expect(stored.passwordResetExpires.getTime()).toBeGreaterThan(
        Date.now()
      );
    });

    it("returns the identical generic message for an unknown email, without sending anything", async () => {
      const known = await createTestUser({ email: "known2@example.com" });

      const knownResponse = await request(app)
        .post("/api/forgot-password")
        .send({ email: "known2@example.com" });

      const unknownResponse = await request(app)
        .post("/api/forgot-password")
        .send({ email: "nobody-here@example.com" });

      expect(unknownResponse).toSatisfyApiSpec();
      expect(unknownResponse.status).toBe(200);
      expect(unknownResponse.body).toEqual(knownResponse.body);
      expect(emailClient.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(emailClient.sendPasswordResetEmail).toHaveBeenCalledWith(
        "known2@example.com",
        expect.any(String)
      );

      const untouched = await UsersModel.findOne({
        _id: { $ne: known._id },
      });
      expect(untouched).toBeNull();
    });

    it("does not issue a reset token for an inactive account", async () => {
      const user = await createTestUser({
        email: "inactive@example.com",
        isActive: false,
      });

      const response = await request(app)
        .post("/api/forgot-password")
        .send({ email: "inactive@example.com" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(emailClient.sendPasswordResetEmail).not.toHaveBeenCalled();

      const stored = await UsersModel.findById(user._id).select(
        "+passwordResetTokenHash"
      );
      expect(stored.passwordResetTokenHash).toBeUndefined();
    });
  });

  describe("dev-only reset link log", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      console.log.mockRestore();
    });

    const resetLogLines = () =>
      console.log.mock.calls
        .map((args) => args.join(" "))
        .filter((line) => line.includes("/reset-password?token="));

    it("logs a working reset link outside production", async () => {
      const user = await createTestUser({ email: "devlog@example.com" });

      await request(app)
        .post("/api/forgot-password")
        .send({ email: "devlog@example.com" });

      const [line] = resetLogLines();
      expect(line).toContain("devlog@example.com");
      const token = new URL(line.split(": ").pop()).searchParams.get("token");
      const stored = await UsersModel.findById(user._id).select(
        "+passwordResetTokenHash"
      );
      expect(hashToken(token)).toBe(stored.passwordResetTokenHash);
    });

    it("never logs the link in production", async () => {
      await createTestUser({ email: "prodlog@example.com" });
      process.env.NODE_ENV = "production";

      const response = await request(app)
        .post("/api/forgot-password")
        .send({ email: "prodlog@example.com" });

      expect(response.status).toBe(200);
      expect(emailClient.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(resetLogLines()).toEqual([]);
    });

    it("logs nothing for an unknown email", async () => {
      await request(app)
        .post("/api/forgot-password")
        .send({ email: "nobody@example.com" });

      expect(resetLogLines()).toEqual([]);
    });
  });

  describe("POST /api/reset-password", () => {
    it("rejects a missing token", async () => {
      const response = await request(app)
        .post("/api/reset-password")
        .send({ newPassword: "NewPassword1!" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
    });

    it("rejects a short new password", async () => {
      const response = await request(app)
        .post("/api/reset-password")
        .send({ token: "some-token", newPassword: "short" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
    });

    it("rejects an unknown token", async () => {
      const response = await request(app)
        .post("/api/reset-password")
        .send({ token: "not-a-real-token", newPassword: "NewPassword1!" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe(
        "This password reset link is invalid or has expired"
      );
    });

    it("rejects an expired token without changing the password", async () => {
      const user = await createTestUser({ email: "expired@example.com" });
      await UsersModel.findByIdAndUpdate(user._id, {
        passwordResetTokenHash: hashToken("expired-raw-token"),
        passwordResetExpires: new Date(Date.now() - 1000),
      });

      const response = await request(app)
        .post("/api/reset-password")
        .send({ token: "expired-raw-token", newPassword: "NewPassword1!" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);

      const stillOld = await UsersModel.findById(user._id).select(
        "+password"
      );
      expect(await bcrypt.compare("Password1!", stillOld.password)).toBe(
        true
      );
    });

    it("resets the password, clears the token, and logs the user in", async () => {
      const user = await createTestUser({ email: "resetme@example.com" });
      await UsersModel.findByIdAndUpdate(user._id, {
        passwordResetTokenHash: hashToken("valid-raw-token"),
        passwordResetExpires: new Date(Date.now() + 1000 * 60 * 60),
      });

      const response = await request(app)
        .post("/api/reset-password")
        .send({ token: "valid-raw-token", newPassword: "NewPassword1!" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.data.user.email).toBe("resetme@example.com");
      expect(response.body.data.user.password).toBeUndefined();

      const decoded = jwt.verify(
        response.body.accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );
      expect(decoded.email).toBe("resetme@example.com");

      const updated = await UsersModel.findById(user._id).select(
        "+password +passwordResetTokenHash +passwordResetExpires"
      );
      expect(await bcrypt.compare("NewPassword1!", updated.password)).toBe(
        true
      );
      expect(updated.passwordResetTokenHash).toBeUndefined();
      expect(updated.passwordResetExpires).toBeUndefined();

      const loginResponse = await request(app).post("/api/login").send({
        email: "resetme@example.com",
        password: "NewPassword1!",
      });
      expect(loginResponse).toSatisfyApiSpec();
      expect(loginResponse.status).toBe(200);
    });

    it("rejects reusing the same token twice", async () => {
      const user = await createTestUser({ email: "onetime@example.com" });
      await UsersModel.findByIdAndUpdate(user._id, {
        passwordResetTokenHash: hashToken("one-time-token"),
        passwordResetExpires: new Date(Date.now() + 1000 * 60 * 60),
      });

      const first = await request(app)
        .post("/api/reset-password")
        .send({ token: "one-time-token", newPassword: "NewPassword1!" });
      expect(first).toSatisfyApiSpec();
      expect(first.status).toBe(200);

      const second = await request(app)
        .post("/api/reset-password")
        .send({ token: "one-time-token", newPassword: "AnotherPass1!" });
      expect(second).toSatisfyApiSpec();
      expect(second.status).toBe(400);
    });

    it("rejects a valid, unexpired token for a deactivated account", async () => {
      const user = await createTestUser({
        email: "deactivated@example.com",
        isActive: false,
      });
      await UsersModel.findByIdAndUpdate(user._id, {
        passwordResetTokenHash: hashToken("deactivated-token"),
        passwordResetExpires: new Date(Date.now() + 1000 * 60 * 60),
      });

      const response = await request(app)
        .post("/api/reset-password")
        .send({ token: "deactivated-token", newPassword: "NewPassword1!" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);

      const stillOld = await UsersModel.findById(user._id).select(
        "+password"
      );
      expect(await bcrypt.compare("Password1!", stillOld.password)).toBe(
        true
      );
    });
  });
});
