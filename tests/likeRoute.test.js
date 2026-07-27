const request = require("supertest");
const app = require("../app");
const LikeModel = require("../repository/likeModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const {
  createTestUser,
  createTestMedia,
  createTestRating,
} = require("./helpers/seed");

describe("likeRoute", () => {
  let user;
  let otherUser;
  let media;
  let rating;
  let accessToken;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
    otherUser = await createTestUser({
      email: "other@example.com",
      userName: "otheruser",
    });
    media = await createTestMedia();
    rating = await createTestRating(user, media);
    accessToken = createAccessToken({
      email: user.email,
      userName: user.userName,
      id: user._id.toString(),
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/likes", () => {
    it("returns 401 when no token is provided", async () => {
      const response = await request(app)
        .post("/api/likes")
        .send({ ratingId: rating._id.toString() });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("likes a rating for the authenticated user", async () => {
      const response = await request(app)
        .post("/api/likes")
        .set("Authorization", accessToken)
        .send({ ratingId: rating._id.toString() });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");

      const storedLike = await LikeModel.findOne({ likedBy: user._id });
      expect(storedLike).toBeTruthy();
      expect(storedLike.rating.toString()).toBe(rating._id.toString());
    });

    it("uses JWT identity and ignores userName in the request body", async () => {
      const response = await request(app)
        .post("/api/likes")
        .set("Authorization", accessToken)
        .send({
          ratingId: rating._id.toString(),
          userName: otherUser.userName,
        });

      expect(response.status).toBe(201);

      const userLike = await LikeModel.findOne({ likedBy: user._id });
      const otherLike = await LikeModel.findOne({ likedBy: otherUser._id });
      expect(userLike).toBeTruthy();
      expect(otherLike).toBeNull();
    });
  });

  describe("DELETE /api/likes/:ratingId", () => {
    it("requires authentication", async () => {
      const response = await request(app).delete(
        `/api/likes/${rating._id.toString()}`
      );

      expect(response.status).toBe(401);
    });

    it("removes the authenticated user's like", async () => {
      await LikeModel.create({
        rating: rating._id,
        likedBy: user._id,
        dateCreated: Date.now(),
      });

      const response = await request(app)
        .delete(`/api/likes/${rating._id.toString()}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(await LikeModel.findOne({ likedBy: user._id })).toBeNull();
    });
  });
});
