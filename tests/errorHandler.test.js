// Raise the auth limiter ceiling: this file sends several login requests.
process.env.AUTH_RATE_LIMIT_MAX = "1000";

jest.mock("../client/slackClient", () => ({
  postMessage: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const app = require("../app");
const errorHandler = require("../middleware/errorHandler");
const ratingService = require("../services/ratingService");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser, createTestMedia } = require("./helpers/seed");

const GENERIC_500 = { errors: { msg: "Something went wrong. Please try again." } };

// Fail fast instead of hanging if an error ever goes unhandled again.
const TIMEOUT_MS = 3000;

describe("error handling", () => {
  let unhandledRejections;
  const onUnhandledRejection = (reason) => unhandledRejections.push(reason);

  beforeAll(async () => {
    await connect();
    process.on("unhandledRejection", onUnhandledRejection);
  });

  beforeEach(() => {
    unhandledRejections = [];
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    // Give any stray rejection a tick to surface before checking.
    await new Promise((resolve) => setImmediate(resolve));
    expect(unhandledRejections).toEqual([]);
    jest.restoreAllMocks();
    await clearDatabase();
  });

  afterAll(async () => {
    process.off("unhandledRejection", onUnhandledRejection);
    await closeDatabase();
  });

  describe("unexpected errors in a route", () => {
    it("returns JSON 500 when a service rejects", async () => {
      jest
        .spyOn(ratingService, "getExploreRatings")
        .mockRejectedValue(new Error("database exploded"));

      const response = await request(app)
        .get("/api/ratings/explore")
        .timeout(TIMEOUT_MS);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(500);
      expect(response.body).toEqual(GENERIC_500);
      expect(JSON.stringify(response.body)).not.toContain("database exploded");
    });

    it("returns JSON 500 when a service throws synchronously", async () => {
      jest.spyOn(ratingService, "getExploreRatings").mockImplementation(() => {
        throw new Error("sync failure");
      });

      const response = await request(app)
        .get("/api/ratings/explore")
        .timeout(TIMEOUT_MS);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(500);
      expect(response.body).toEqual(GENERIC_500);
    });

    it("responds instead of hanging when a rating is saved without a score", async () => {
      // Regression: Mongoose's ValidationError used to be re-thrown out of an
      // Express 4 async handler, so this request never got a response.
      const user = await createTestUser();
      const media = await createTestMedia();
      const token = createAccessToken({
        email: user.email,
        userName: user.userName,
        id: user._id.toString(),
      });

      const response = await request(app)
        .post("/api/ratings")
        .set("Authorization", token)
        .send({ mediaId: media.mediaId })
        .timeout(TIMEOUT_MS);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(500);
      expect(response.body).toEqual(GENERIC_500);
    });

    it("returns JSON 500 for a real uncaught error (invalid ObjectId cast)", async () => {
      const user = await createTestUser();
      const token = createAccessToken({
        email: user.email,
        userName: user.userName,
        id: user._id.toString(),
      });

      const response = await request(app)
        .get("/api/playlist/getPlaylistsWithThisMedia")
        .query({ mediaId: "not-an-object-id" })
        .set("Authorization", token)
        .timeout(TIMEOUT_MS);

      expect(response.status).toBe(500);
      expect(response.body).toEqual(GENERIC_500);
    });

    it("logs the method and path, but not the token or body", async () => {
      jest
        .spyOn(ratingService, "getRatingsByFollowing")
        .mockRejectedValue(new Error("boom"));
      const user = await createTestUser();
      const token = createAccessToken({
        email: user.email,
        userName: user.userName,
        id: user._id.toString(),
      });

      await request(app)
        .get("/api/ratings/following")
        .set("Authorization", token)
        .timeout(TIMEOUT_MS);

      const logged = console.error.mock.calls
        .map((args) => args.map(String).join(" "))
        .join("\n");
      expect(logged).toContain("GET /api/ratings/following");
      expect(logged).not.toContain(token);
    });
  });

  describe("request body errors", () => {
    it("returns JSON 400 for malformed JSON", async () => {
      const response = await request(app)
        .post("/api/login")
        .set("Content-Type", "application/json")
        .send('{"email": "ani@example.com", "password": ')
        .timeout(TIMEOUT_MS);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        errors: { msg: "Request body must be valid JSON" },
      });
    });

    it("returns JSON 413 for a body over the size limit", async () => {
      const response = await request(app)
        .post("/api/login")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ email: "a@example.com", password: "x".repeat(200 * 1024) }))
        .timeout(TIMEOUT_MS);

      expect(response.status).toBe(413);
      expect(response.body).toEqual({
        errors: { msg: "Request body is too large" },
      });
    });
  });

  describe("requests with no body", () => {
    it("still returns the normal validation error from /api/login", async () => {
      const response = await request(app).post("/api/login").timeout(TIMEOUT_MS);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe("A valid email is required");
    });

    it("still returns the normal validation error for a non-JSON content type", async () => {
      const response = await request(app)
        .post("/api/login")
        .set("Content-Type", "text/plain")
        .send("email=ani@example.com")
        .timeout(TIMEOUT_MS);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe("A valid email is required");
    });

    it("gets a prompt JSON response from /api/ratings instead of a TypeError", async () => {
      const user = await createTestUser();
      await createTestMedia();
      const token = createAccessToken({
        email: user.email,
        userName: user.userName,
        id: user._id.toString(),
      });

      const response = await request(app)
        .post("/api/ratings")
        .set("Authorization", token)
        .timeout(TIMEOUT_MS);

      // Same as Express 4 (the body defaults to {}). #56 adds validation that
      // turns this into a 400.
      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(404);
      expect(response.body.errors.msg).toBe("Media not found");
    });
  });

  describe("query strings", () => {
    it("parses a plain query parameter", async () => {
      const user = await createTestUser();
      const media = await createTestMedia();
      const token = createAccessToken({
        email: user.email,
        userName: user.userName,
        id: user._id.toString(),
      });

      const response = await request(app)
        .get("/api/playlist/getPlaylistsWithThisMedia")
        .query({ mediaId: media._id.toString() })
        .set("Authorization", token)
        .timeout(TIMEOUT_MS);

      expect(response.status).toBe(200);
    });

    it("does not turn bracket syntax into an object (no operator injection)", async () => {
      const user = await createTestUser();
      const token = createAccessToken({
        email: user.email,
        userName: user.userName,
        id: user._id.toString(),
      });

      const response = await request(app)
        .get("/api/playlist/getPlaylistsWithThisMedia?mediaId[$ne]=x")
        .set("Authorization", token)
        .timeout(TIMEOUT_MS);

      // `mediaId` is absent (the key is the literal "mediaId[$ne]"), so the
      // lookup finds nothing rather than matching any media.
      expect(response.status).toBe(404);
    });
  });

  describe("errorHandler middleware", () => {
    it("hands off to Express when headers were already sent", () => {
      const next = jest.fn();
      const response = { headersSent: true, status: jest.fn() };
      const error = new Error("late failure");

      errorHandler(error, { method: "GET", originalUrl: "/api/x" }, response, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(response.status).not.toHaveBeenCalled();
    });
  });
});
