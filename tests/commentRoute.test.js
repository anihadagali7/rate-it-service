const request = require("supertest");
const app = require("../app");
const CommentModel = require("../repository/commentModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const {
  createTestUser,
  createTestMedia,
  createTestRating,
} = require("./helpers/seed");

describe("commentRoute", () => {
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

  describe("POST /api/comments", () => {
    it("returns 401 when no token is provided", async () => {
      const response = await request(app)
        .post("/api/comments")
        .send({ ratingId: rating._id.toString(), text: "Hi" });

      expect(response.status).toBe(401);
    });

    it("creates a comment for the authenticated user", async () => {
      const response = await request(app)
        .post("/api/comments")
        .set("Authorization", accessToken)
        .send({ ratingId: rating._id.toString(), text: "Great review" });

      expect(response.status).toBe(201);
      expect(response.body.data.newComment).toMatchObject({
        text: "Great review",
        commentedBy: { userName: user.userName },
      });

      const stored = await CommentModel.findOne({ rating: rating._id });
      expect(stored.commentedBy.toString()).toBe(user._id.toString());
    });

    it("uses JWT identity and ignores userName in the body", async () => {
      const response = await request(app)
        .post("/api/comments")
        .set("Authorization", accessToken)
        .send({
          ratingId: rating._id.toString(),
          text: "Mine",
          userName: otherUser.userName,
        });

      expect(response.status).toBe(201);
      const stored = await CommentModel.findOne({ rating: rating._id });
      expect(stored.commentedBy.toString()).toBe(user._id.toString());
    });
  });

  describe("DELETE /api/comments/:commentId", () => {
    it("requires authentication", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: user._id,
        text: "Hi",
        dateCreated: Date.now(),
      });

      const response = await request(app).delete(
        `/api/comments/${comment._id.toString()}`
      );

      expect(response.status).toBe(401);
    });

    it("deletes the authenticated user's comment", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: user._id,
        text: "Bye",
        dateCreated: Date.now(),
      });

      const response = await request(app)
        .delete(`/api/comments/${comment._id.toString()}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(await CommentModel.findById(comment._id)).toBeNull();
    });
  });

  describe("POST/DELETE /api/comments/:commentId/like", () => {
    it("likes and unlikes a comment", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: otherUser._id,
        text: "Likeable",
        dateCreated: Date.now(),
      });

      const likeResponse = await request(app)
        .post(`/api/comments/${comment._id.toString()}/like`)
        .set("Authorization", accessToken);

      expect(likeResponse.status).toBe(201);

      const unlikeResponse = await request(app)
        .delete(`/api/comments/${comment._id.toString()}/like`)
        .set("Authorization", accessToken);

      expect(unlikeResponse.status).toBe(200);
    });

    it("requires authentication to like", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: user._id,
        text: "Hi",
        dateCreated: Date.now(),
      });

      const response = await request(app).post(
        `/api/comments/${comment._id.toString()}/like`
      );

      expect(response.status).toBe(401);
    });
  });
});
