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

const MISSING_ID = "0123456789abcdef01234567";

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

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(401);
    });

    it("creates a comment for the authenticated user", async () => {
      const response = await request(app)
        .post("/api/comments")
        .set("Authorization", accessToken)
        .send({ ratingId: rating._id.toString(), text: "Great review" });

      expect(response).toSatisfyApiSpec();
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

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      const stored = await CommentModel.findOne({ rating: rating._id });
      expect(stored.commentedBy.toString()).toBe(user._id.toString());
    });

    it("returns 400 when the text is blank", async () => {
      const response = await request(app)
        .post("/api/comments")
        .set("Authorization", accessToken)
        .send({ ratingId: rating._id.toString(), text: "   " });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(400);
      expect(response.body.errors.msg).toBe("Comment text is required");
    });

    it("returns 404 when the rating doesn't exist", async () => {
      const response = await request(app)
        .post("/api/comments")
        .set("Authorization", accessToken)
        .send({ ratingId: MISSING_ID, text: "Hi" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(404);
      expect(response.body.errors.msg).toBe("Rating not found");
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

      expect(response).toSatisfyApiSpec();
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

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(await CommentModel.findById(comment._id)).toBeNull();
    });

    it("returns 403 when deleting someone else's comment", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: otherUser._id,
        text: "Not yours",
        dateCreated: Date.now(),
      });

      const response = await request(app)
        .delete(`/api/comments/${comment._id.toString()}`)
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(403);
      expect(response.body.errors.msg).toBe(
        "You can only delete your own comments"
      );
      expect(await CommentModel.findById(comment._id)).not.toBeNull();
    });

    it("returns 404 when the comment doesn't exist", async () => {
      const response = await request(app)
        .delete(`/api/comments/${MISSING_ID}`)
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(404);
      expect(response.body.errors.msg).toBe("Comment not found");
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

      expect(likeResponse).toSatisfyApiSpec();
      expect(likeResponse.status).toBe(201);

      const unlikeResponse = await request(app)
        .delete(`/api/comments/${comment._id.toString()}/like`)
        .set("Authorization", accessToken);

      expect(unlikeResponse).toSatisfyApiSpec();
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

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(401);
    });

    it("returns 409 when liking the same comment twice", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: otherUser._id,
        text: "Likeable",
        dateCreated: Date.now(),
      });
      await request(app)
        .post(`/api/comments/${comment._id.toString()}/like`)
        .set("Authorization", accessToken);

      const response = await request(app)
        .post(`/api/comments/${comment._id.toString()}/like`)
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(409);
      expect(response.body.errors.msg).toBe(
        "You have already liked this comment"
      );
    });

    it("returns 404 when liking a comment that doesn't exist", async () => {
      const response = await request(app)
        .post(`/api/comments/${MISSING_ID}/like`)
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(404);
      expect(response.body.errors.msg).toBe("Comment not found");
    });

    it("returns 404 when unliking a comment the user hasn't liked", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: otherUser._id,
        text: "Not liked",
        dateCreated: Date.now(),
      });

      const response = await request(app)
        .delete(`/api/comments/${comment._id.toString()}/like`)
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(404);
      expect(response.body.errors.msg).toBe("Like not found");
    });
  });
});
