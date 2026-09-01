// This file exercises the auth flows themselves, not rate limiting, and
// legitimately makes far more than the default (20/15min) auth-route
// requests across its own test cases — raise the ceiling so it doesn't trip
// the limiter added for authRateLimiter.test.js's dedicated coverage of
// that behavior. Must be set before the app (and authRateLimiter) is
// required.
process.env.AUTH_RATE_LIMIT_MAX = "1000";

jest.mock("../client/slackClient", () => ({
  postMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../client/emailClient", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const app = require("../app");
const UsersModel = require("../repository/userModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

const validUser = {
  firstName: "Ani",
  lastName: "Hadagali",
  email: "ani@example.com",
  password: "Password1!",
  phoneNumber: "3135551212",
  userName: "anihadagali7",
};

const createUser = async (overrides = {}) => {
  return request(app)
    .post("/api/create-user")
    .send({ ...validUser, ...overrides });
};

describe("Auth flow", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
    delete process.env.AUTH_RATE_LIMIT_MAX;
  });

  describe("GET /api", () => {
    it("returns service health status", async () => {
      const response = await request(app).get("/api");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "UP" });
    });
  });

  describe("POST /api/create-user", () => {
    it("creates a user and returns an access token without a password hash", async () => {
      const response = await createUser();

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.data.user).toMatchObject({
        firstName: validUser.firstName,
        lastName: validUser.lastName,
        email: validUser.email,
        userName: validUser.userName,
        phoneNumber: validUser.phoneNumber,
        isAdmin: false,
        isActive: true,
      });
      expect(response.body.data.user.password).toBeUndefined();

      const decoded = jwt.verify(
        response.body.accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );
      expect(decoded).toMatchObject({
        email: validUser.email,
        userName: validUser.userName,
        isAdmin: false,
      });
      expect(decoded.id).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
    });

    it("stores a bcrypt-hashed password in the database", async () => {
      await createUser();

      const rawUser = await UsersModel.collection.findOne({
        email: validUser.email,
      });

      expect(rawUser.password).toBeDefined();
      expect(rawUser.password).not.toBe(validUser.password);
      expect(await bcrypt.compare(validUser.password, rawUser.password)).toBe(
        true
      );
    });

    it("rejects invalid signup payloads", async () => {
      const response = await createUser({
        email: "not-an-email",
        password: "short",
        userName: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toEqual(expect.any(String));
    });

    it("rejects duplicate email addresses", async () => {
      await createUser();

      const response = await createUser({
        userName: "someoneelse",
      });

      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe("This email is already being used");
    });

    it("rejects duplicate usernames", async () => {
      await createUser();

      const response = await createUser({
        email: "other@example.com",
      });

      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe(
        "This username is already being used"
      );
    });
  });

  describe("POST /api/login", () => {
    beforeEach(async () => {
      await createUser();
    });

    it("logs in with valid credentials and returns a token without a password hash", async () => {
      const response = await request(app).post("/api/login").send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.data.user.email).toBe(validUser.email);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it("rejects invalid login payloads", async () => {
      const response = await request(app).post("/api/login").send({
        email: "not-an-email",
        password: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toEqual(expect.any(String));
    });

    it("rejects an invalid password", async () => {
      const response = await request(app).post("/api/login").send({
        email: validUser.email,
        password: "WrongPassword1!",
      });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Email or password is invalid");
    });

    it("rejects an unknown email with the same message", async () => {
      const response = await request(app).post("/api/login").send({
        email: "missing@example.com",
        password: validUser.password,
      });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Email or password is invalid");
    });

    it("rejects a social-only user with no password, without crashing", async () => {
      await UsersModel.findOneAndUpdate(
        { email: validUser.email },
        { $unset: { password: 1 }, googleId: "google-sub-123" },
        { runValidators: false }
      );

      const response = await request(app).post("/api/login").send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Email or password is invalid");
    });

    it("rejects inactive users with the same message", async () => {
      await UsersModel.findOneAndUpdate(
        { email: validUser.email },
        { isActive: false }
      );

      const response = await request(app).post("/api/login").send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Email or password is invalid");
    });
  });

  describe("POST /api/account/resetPassword", () => {
    let accessToken;

    beforeEach(async () => {
      const signup = await createUser();
      accessToken = signup.body.accessToken;
    });

    it("returns 401 when no token is provided", async () => {
      const response = await request(app).post("/api/account/resetPassword").send({
        currentPassword: validUser.password,
        newPassword: "NewPassword1!",
      });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("returns 403 when the token is invalid", async () => {
      const response = await request(app)
        .post("/api/account/resetPassword")
        .set("Authorization", "invalid.token.value")
        .send({
          currentPassword: validUser.password,
          newPassword: "NewPassword1!",
        });

      expect(response.status).toBe(403);
      expect(response.body.errors.msg).toBe("Invalid token");
    });

    it("returns 403 when the authenticated user is inactive", async () => {
      await UsersModel.findOneAndUpdate(
        { email: validUser.email },
        { isActive: false }
      );

      const response = await request(app)
        .post("/api/account/resetPassword")
        .set("Authorization", accessToken)
        .send({
          currentPassword: validUser.password,
          newPassword: "NewPassword1!",
        });

      expect(response.status).toBe(403);
      expect(response.body.errors.msg).toBe("Invalid token");
    });

    it("rejects an incorrect current password", async () => {
      const response = await request(app)
        .post("/api/account/resetPassword")
        .set("Authorization", accessToken)
        .send({
          currentPassword: "WrongPassword1!",
          newPassword: "NewPassword1!",
        });

      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe("Current password is not valid");
    });

    it("rejects a short new password", async () => {
      const response = await request(app)
        .post("/api/account/resetPassword")
        .set("Authorization", accessToken)
        .send({
          currentPassword: validUser.password,
          newPassword: "short",
        });

      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe(
        "New password must be at least 8 characters"
      );
    });

    it("resets the authenticated user's password and excludes the hash from the response", async () => {
      const response = await request(app)
        .post("/api/account/resetPassword")
        .set("Authorization", accessToken)
        .send({
          currentPassword: validUser.password,
          newPassword: "NewPassword1!",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.user.password).toBeUndefined();

      const loginWithOldPassword = await request(app).post("/api/login").send({
        email: validUser.email,
        password: validUser.password,
      });
      expect(loginWithOldPassword.status).toBe(401);

      const loginWithNewPassword = await request(app).post("/api/login").send({
        email: validUser.email,
        password: "NewPassword1!",
      });
      expect(loginWithNewPassword.status).toBe(200);
    });

    it("uses JWT identity and ignores userName in the request body", async () => {
      const victimSignup = await createUser({
        email: "victim@example.com",
        userName: "victimuser",
        password: "VictimPass1!",
      });

      const attackerResponse = await request(app)
        .post("/api/account/resetPassword")
        .set("Authorization", accessToken)
        .send({
          userName: "victimuser",
          currentPassword: validUser.password,
          newPassword: "HackedPass1!",
        });

      expect(attackerResponse.status).toBe(200);

      const attackerLogin = await request(app).post("/api/login").send({
        email: validUser.email,
        password: "HackedPass1!",
      });
      expect(attackerLogin.status).toBe(200);

      const victimLogin = await request(app).post("/api/login").send({
        email: "victim@example.com",
        password: "VictimPass1!",
      });
      expect(victimLogin.status).toBe(200);
      expect(victimSignup.body.data.user.userName).toBe("victimuser");
    });
  });

  describe("JWT identity for protected account actions", () => {
    it("updates the authenticated user even if another userName is sent in the body", async () => {
      const attackerSignup = await createUser();
      await createUser({
        email: "victim@example.com",
        userName: "victimuser",
        password: "VictimPass1!",
      });

      const response = await request(app)
        .put("/api/account/update")
        .set("Authorization", attackerSignup.body.accessToken)
        .send({
          firstName: "Updated",
          lastName: "Attacker",
          phoneNumber: "9999999999",
          userName: "victimuser",
          email: "victim@example.com",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.userName).toBe(validUser.userName);
      expect(response.body.data.user.firstName).toBe("Updated");
      expect(response.body.data.user.password).toBeUndefined();

      const victim = await UsersModel.findOne({ userName: "victimuser" });
      expect(victim.firstName).toBe("Ani");
    });

    it("follows as the authenticated user, ignoring a spoofed currentUser in the body", async () => {
      const attackerSignup = await createUser();
      await createUser({
        email: "target@example.com",
        userName: "targetuser",
        password: "TargetPass1!",
      });
      await createUser({
        email: "spoofed@example.com",
        userName: "spoofeduser",
        password: "SpoofPass1!",
      });

      const response = await request(app)
        .post("/api/friends/follow")
        .set("Authorization", attackerSignup.body.accessToken)
        .send({
          currentUser: "spoofeduser",
          userToFollow: "targetuser",
        });

      expect(response.status).toBe(200);

      const attacker = await UsersModel.findOne({
        userName: validUser.userName,
      });
      const spoofed = await UsersModel.findOne({ userName: "spoofeduser" });
      const target = await UsersModel.findOne({ userName: "targetuser" });

      expect(attacker.following).toContain("targetuser");
      expect(spoofed.following).not.toContain("targetuser");
      expect(target.followers).toContain(validUser.userName);
      expect(target.followers).not.toContain("spoofeduser");
    });
  });
});
