// Configure a small limit before requiring the app so this file's rate
// limiter instances are cheap to exhaust in tests, without touching the
// default (20/15min) used everywhere else. Jest gives each test file its
// own module registry, so this only affects the app instance required below.
process.env.AUTH_RATE_LIMIT_MAX = "3";
process.env.AUTH_RATE_LIMIT_WINDOW_MS = "60000";

jest.mock("../client/slackClient", () => ({
  postMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../client/emailClient", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const app = require("../app");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser } = require("./helpers/seed");

describe("auth route rate limiting", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
    delete process.env.AUTH_RATE_LIMIT_MAX;
    delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
  });

  it("returns 429 once an IP exceeds the limit on the login route", async () => {
    for (let i = 0; i < 3; i++) {
      const response = await request(app)
        .post("/api/login")
        .set("X-Forwarded-For", "10.1.0.1")
        .send({ email: "nobody@example.com", password: "WrongPass1!" });

      expect(response.status).toBe(401);
    }

    const blockedResponse = await request(app)
      .post("/api/login")
      .set("X-Forwarded-For", "10.1.0.1")
      .send({ email: "nobody@example.com", password: "WrongPass1!" });

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body.errors.msg).toBe(
      "Too many requests. Please try again later."
    );
  });

  it("scopes the limit per IP, so other clients can still log in", async () => {
    await createTestUser({
      email: "ratelimited@example.com",
      userName: "ratelimiteduser",
    });

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/login")
        .set("X-Forwarded-For", "10.1.0.2")
        .send({ email: "nobody@example.com", password: "WrongPass1!" });
    }

    const otherIpResponse = await request(app)
      .post("/api/login")
      .set("X-Forwarded-For", "10.1.0.3")
      .send({ email: "ratelimited@example.com", password: "Password1!" });

    expect(otherIpResponse.status).toBe(200);
  });

  it("shares the limit across auth-sensitive routes for the same IP", async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/create-user")
        .set("X-Forwarded-For", "10.1.0.4")
        .send({
          firstName: "Rate",
          lastName: "Limited",
          email: `ratelimit${i}@example.com`,
          password: "Password1!",
          phoneNumber: "3135551212",
          userName: `ratelimit${i}`,
        });
    }

    const blockedLogin = await request(app)
      .post("/api/login")
      .set("X-Forwarded-For", "10.1.0.4")
      .send({ email: "ratelimit0@example.com", password: "Password1!" });

    expect(blockedLogin.status).toBe(429);
  });

  it("rate limits the authenticated resend-verification route", async () => {
    const user = await createTestUser({
      email: "resend@example.com",
      userName: "resenduser",
      isEmailVerified: false,
    });
    const accessToken = createAccessToken({
      email: user.email,
      userName: user.userName,
      id: user._id.toString(),
    });

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/account/resend-verification")
        .set("Authorization", accessToken)
        .set("X-Forwarded-For", "10.1.0.5");
    }

    const blockedResponse = await request(app)
      .post("/api/account/resend-verification")
      .set("Authorization", accessToken)
      .set("X-Forwarded-For", "10.1.0.5");

    expect(blockedResponse).toSatisfyApiSpec();
    expect(blockedResponse.status).toBe(429);
  });
});
