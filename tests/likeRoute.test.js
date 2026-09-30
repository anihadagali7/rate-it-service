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

const MISSING_ID = "0123456789abcdef01234567";

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

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("likes a rating for the authenticated user", async () => {
      const response = await request(app)
        .post("/api/likes")
        .set("Authorization", accessToken)
        .send({ ratingId: rating._id.toString() });

      expect(response).toSatisfyApiSpec();
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

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);

      const userLike = await LikeModel.findOne({ likedBy: user._id });
      const otherLike = await LikeModel.findOne({ likedBy: otherUser._id });
      expect(userLike).toBeTruthy();
      expect(otherLike).toBeNull();
    });

    it("returns 409 when liking the same rating twice", async () => {
      await LikeModel.create({
        rating: rating._id,
        likedBy: user._id,
        dateCreated: Date.now(),
      });

      const response = await request(app)
        .post("/api/likes")
        .set("Authorization", accessToken)
        .send({ ratingId: rating._id.toString() });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(409);
      expect(response.body.errors.msg).toBe(
        "You have already liked this rating"
      );
    });

    it("returns 404 when the rating doesn't exist", async () => {
      const response = await request(app)
        .post("/api/likes")
        .set("Authorization", accessToken)
        .send({ ratingId: MISSING_ID });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(404);
      expect(response.body.errors.msg).toBe("Rating not found");
    });
  });

  describe("DELETE /api/likes/:ratingId", () => {
    it("requires authentication", async () => {
      const response = await request(app).delete(
        `/api/likes/${rating._id.toString()}`
      );

      expect(response).toSatisfyApiSpec();
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

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(await LikeModel.findOne({ likedBy: user._id })).toBeNull();
    });

    it("returns 404 when the user hasn't liked the rating", async () => {
      const response = await request(app)
        .delete(`/api/likes/${rating._id.toString()}`)
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(404);
      expect(response.body.errors.msg).toBe("Like not found");
    });
  });
});
