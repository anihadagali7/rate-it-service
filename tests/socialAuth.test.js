jest.mock("../client/slackClient", () => ({
  postMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../client/emailClient", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../client/googleAuthClient");
jest.mock("../client/facebookAuthClient");
jest.mock("../client/appleAuthClient");

const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../app");
const UsersModel = require("../repository/userModel");
const googleAuthClient = require("../client/googleAuthClient");
const facebookAuthClient = require("../client/facebookAuthClient");
const appleAuthClient = require("../client/appleAuthClient");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

const createPasswordUser = async ({ email, userName = "existinguser" }) => {
  const salt = await bcrypt.genSalt(10);
  return new UsersModel({
    firstName: "Existing",
    lastName: "User",
    email,
    userName,
    password: await bcrypt.hash("Password1!", salt),
    isActive: true,
    isAdmin: false,
    dateCreated: Date.now(),
    dateUpdated: Date.now(),
  }).save();
};

describe("Social auth flow", () => {
  beforeAll(async () => {
    await connect();
    await UsersModel.init();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/auth/google", () => {
    it("creates a brand-new, not-yet-onboarded user on first sign-in", async () => {
      googleAuthClient.getGoogleProfileFromCode.mockResolvedValue({
        providerId: "google-sub-1",
        email: "newgoogle@example.com",
        emailVerified: true,
        firstName: "Gia",
        lastName: "Google",
        picture: "https://example.com/gia.jpg",
      });

      const response = await request(app)
        .post("/api/auth/google")
        .send({ code: "auth-code" });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.data.user.userName).toBeUndefined();
      expect(response.body.data.user.isProfileComplete).toBe(false);
      expect(response.body.data.user.email).toBe("newgoogle@example.com");

      const stored = await UsersModel.findOne({ googleId: "google-sub-1" });
      expect(stored).not.toBeNull();
      expect(stored.userName).toBeUndefined();
    });

    it("logs the same identity in again without creating a duplicate", async () => {
      googleAuthClient.getGoogleProfileFromCode.mockResolvedValue({
        providerId: "google-sub-2",
        email: "repeat@example.com",
        emailVerified: true,
        firstName: "Rae",
        lastName: "Peat",
      });

      const first = await request(app)
        .post("/api/auth/google")
        .send({ code: "auth-code" });
      const second = await request(app)
        .post("/api/auth/google")
        .send({ code: "auth-code" });

      expect(second.status).toBe(200);
      expect(second.body.data.user._id).toBe(first.body.data.user._id);

      const count = await UsersModel.countDocuments({
        googleId: "google-sub-2",
      });
      expect(count).toBe(1);
    });

    it("links to an existing password account by verified email instead of duplicating", async () => {
      const existing = await createPasswordUser({
        email: "linkme@example.com",
      });

      googleAuthClient.getGoogleProfileFromCode.mockResolvedValue({
        providerId: "google-sub-3",
        email: "linkme@example.com",
        emailVerified: true,
        firstName: "Existing",
        lastName: "User",
      });

      const response = await request(app)
        .post("/api/auth/google")
        .send({ code: "auth-code" });

      expect(response.status).toBe(200);
      expect(response.body.data.user._id).toBe(existing._id.toString());
      expect(response.body.data.user.isProfileComplete).toBe(true);

      const linked = await UsersModel.findById(existing._id);
      expect(linked.googleId).toBe("google-sub-3");

      const loginWithOldPassword = await request(app)
        .post("/api/login")
        .send({ email: "linkme@example.com", password: "Password1!" });
      expect(loginWithOldPassword.status).toBe(200);
    });

    it("rejects the sign-in when the matching email is unverified, without touching the existing account", async () => {
      const existing = await createPasswordUser({
        email: "unverified@example.com",
      });

      googleAuthClient.getGoogleProfileFromCode.mockResolvedValue({
        providerId: "google-sub-4",
        email: "unverified@example.com",
        emailVerified: false,
        firstName: "Sneaky",
        lastName: "Impersonator",
      });

      const response = await request(app)
        .post("/api/auth/google")
        .send({ code: "auth-code" });

      expect(response.status).toBe(409);

      const untouched = await UsersModel.findById(existing._id);
      expect(untouched.googleId).toBeUndefined();

      const duplicateCount = await UsersModel.countDocuments({
        email: "unverified@example.com",
      });
      expect(duplicateCount).toBe(1);
    });

    it("returns a clean 401 when Google verification fails", async () => {
      googleAuthClient.getGoogleProfileFromCode.mockRejectedValue(
        new Error("invalid code")
      );

      const response = await request(app)
        .post("/api/auth/google")
        .send({ code: "bad-code" });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Google authentication failed");
    });

    it("rejects a request with no code", async () => {
      const response = await request(app).post("/api/auth/google").send({});

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/facebook", () => {
    it("creates a brand-new user on first sign-in", async () => {
      facebookAuthClient.getFacebookProfile.mockResolvedValue({
        providerId: "fb-1",
        email: "newfb@example.com",
        emailVerified: true,
        firstName: "Fiona",
        lastName: "Book",
      });

      const response = await request(app)
        .post("/api/auth/facebook")
        .send({ accessToken: "fb-access-token" });

      expect(response.status).toBe(201);
      expect(response.body.data.user.isProfileComplete).toBe(false);
    });

    it("links to an existing password account by verified email", async () => {
      const existing = await createPasswordUser({
        email: "fblink@example.com",
      });

      facebookAuthClient.getFacebookProfile.mockResolvedValue({
        providerId: "fb-2",
        email: "fblink@example.com",
        emailVerified: true,
        firstName: "Existing",
        lastName: "User",
      });

      const response = await request(app)
        .post("/api/auth/facebook")
        .send({ accessToken: "fb-access-token" });

      expect(response.status).toBe(200);
      expect(response.body.data.user._id).toBe(existing._id.toString());
    });

    it("returns a clean 401 when Facebook verification fails", async () => {
      facebookAuthClient.getFacebookProfile.mockRejectedValue(
        new Error("token failed verification")
      );

      const response = await request(app)
        .post("/api/auth/facebook")
        .send({ accessToken: "bad-token" });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Facebook authentication failed");
    });
  });

  describe("POST /api/auth/apple", () => {
    it("uses the one-time name payload only when creating a brand-new user", async () => {
      appleAuthClient.verifyIdentityToken.mockResolvedValue({
        providerId: "apple-1",
        email: "newapple@example.com",
        emailVerified: true,
      });

      const response = await request(app)
        .post("/api/auth/apple")
        .send({
          identityToken: "identity-token",
          user: { name: { firstName: "Ali", lastName: "Pine" } },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.firstName).toBe("Ali");
      expect(response.body.data.user.lastName).toBe("Pine");
    });

    it("ignores a resent name payload on a returning login", async () => {
      appleAuthClient.verifyIdentityToken.mockResolvedValue({
        providerId: "apple-2",
        email: "returning@example.com",
        emailVerified: true,
      });

      await request(app)
        .post("/api/auth/apple")
        .send({
          identityToken: "identity-token",
          user: { name: { firstName: "Original", lastName: "Name" } },
        });

      const secondResponse = await request(app)
        .post("/api/auth/apple")
        .send({
          identityToken: "identity-token",
          user: { name: { firstName: "Forged", lastName: "Rename" } },
        });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.data.user.firstName).toBe("Original");
    });

    it("returns a clean 401 when Apple verification fails", async () => {
      appleAuthClient.verifyIdentityToken.mockRejectedValue(
        new Error("invalid signature")
      );

      const response = await request(app)
        .post("/api/auth/apple")
        .send({ identityToken: "bad-token" });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Apple authentication failed");
    });
  });
});
