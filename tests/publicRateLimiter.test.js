// Configure a small limit before requiring the app so this file's rate
// limiter instances are cheap to exhaust in tests, without touching the
// default (60/min) used everywhere else. Jest gives each test file its own
// module registry, so this only affects the app instance required below.
process.env.PUBLIC_RATE_LIMIT_MAX = "3";
process.env.PUBLIC_RATE_LIMIT_WINDOW_MS = "60000";

const request = require("supertest");
const app = require("../app");
const MediaModel = require("../repository/mediaModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser } = require("./helpers/seed");

describe("public route rate limiting", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
    delete process.env.PUBLIC_RATE_LIMIT_MAX;
    delete process.env.PUBLIC_RATE_LIMIT_WINDOW_MS;
  });

  it("allows anonymous requests up to the per-IP limit", async () => {
    await MediaModel.create({
      name: "Limit Test Movie",
      mediaType: "MOVIE",
      mediaId: "limit-movie-1",
    });

    for (let i = 0; i < 3; i++) {
      const response = await request(app)
        .get("/api/media/movie/info/limit-movie-1")
        .set("X-Forwarded-For", "10.0.0.1");

      expect(response.status).toBe(200);
    }
  });

  it("returns 429 once an IP exceeds the limit on a newly-anonymous route", async () => {
    await MediaModel.create({
      name: "Limit Test Movie",
      mediaType: "MOVIE",
      mediaId: "limit-movie-2",
    });

    for (let i = 0; i < 3; i++) {
      const response = await request(app)
        .get("/api/media/movie/info/limit-movie-2")
        .set("X-Forwarded-For", "10.0.0.2");

      expect(response.status).toBe(200);
    }

    const blockedResponse = await request(app)
      .get("/api/media/movie/info/limit-movie-2")
      .set("X-Forwarded-For", "10.0.0.2");

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body.errors.msg).toBe(
      "Too many requests. Please try again later."
    );
  });

  it("scopes the limit per IP, so other clients are unaffected", async () => {
    await MediaModel.create({
      name: "Limit Test Movie",
      mediaType: "MOVIE",
      mediaId: "limit-movie-3",
    });

    for (let i = 0; i < 3; i++) {
      await request(app)
        .get("/api/media/movie/info/limit-movie-3")
        .set("X-Forwarded-For", "10.0.0.3");
    }

    const otherIpResponse = await request(app)
      .get("/api/media/movie/info/limit-movie-3")
      .set("X-Forwarded-For", "10.0.0.4");

    expect(otherIpResponse.status).toBe(200);
  });

  it("shares the limit across the different public routes for the same IP", async () => {
    await MediaModel.create({
      name: "Shared Limit Movie",
      mediaType: "MOVIE",
      mediaId: "shared-limit-1",
    });
    await MediaModel.create({
      name: "Shared Limit Show",
      mediaType: "TV",
      mediaId: "shared-limit-2",
    });

    await request(app)
      .get("/api/media/movie/info/shared-limit-1")
      .set("X-Forwarded-For", "10.0.0.5");
    await request(app)
      .get("/api/media/tv/info/shared-limit-2")
      .set("X-Forwarded-For", "10.0.0.5");
    await request(app)
      .get("/api/media/movie/info/shared-limit-1")
      .set("X-Forwarded-For", "10.0.0.5");

    const blockedResponse = await request(app)
      .get("/api/ratings/media/shared-limit-1")
      .set("X-Forwarded-For", "10.0.0.5");

    expect(blockedResponse.status).toBe(429);
  });

  it("does not rate limit the authenticated-only search route", async () => {
    const user = await createTestUser({
      email: "ratelimit@example.com",
      userName: "ratelimituser",
    });
    const accessToken = createAccessToken({
      email: user.email,
      userName: user.userName,
      id: user._id.toString(),
    });

    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post("/api/search/user")
        .set("Authorization", accessToken)
        .set("X-Forwarded-For", "10.0.0.6")
        .send({ keyWord: "route" });

      expect(response.status).toBe(200);
    }
  });
});
