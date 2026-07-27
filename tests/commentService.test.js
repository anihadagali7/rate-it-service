const CommentModel = require("../repository/commentModel");
const commentService = require("../services/commentService");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const {
  createTestUser,
  createTestMedia,
  createTestRating,
} = require("./helpers/seed");

const createMockResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

describe("commentService", () => {
  let user;
  let media;
  let rating;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
    media = await createTestMedia();
    rating = await createTestRating(user, media);
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("createComment", () => {
    it("creates a comment and returns 201", async () => {
      const response = createMockResponse();

      await commentService.createComment(
        rating._id.toString(),
        "  Love this review  ",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          newComment: expect.objectContaining({
            text: "Love this review",
            commentedBy: expect.objectContaining({ userName: user.userName }),
          }),
        },
      });

      const stored = await CommentModel.findOne({ rating: rating._id });
      expect(stored.text).toBe("Love this review");
    });

    it("returns 400 when text is empty", async () => {
      const response = createMockResponse();

      await commentService.createComment(
        rating._id.toString(),
        "   ",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Comment text is required" },
      });
    });

    it("returns 404 when the rating does not exist", async () => {
      const response = createMockResponse();

      await commentService.createComment(
        "507f1f77bcf86cd799439011",
        "Hello",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Rating not found" },
      });
    });
  });

  describe("removeComment", () => {
    it("deletes the author's comment", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: user._id,
        text: "Delete me",
        dateCreated: Date.now(),
      });
      const response = createMockResponse();

      await commentService.removeComment(
        comment._id.toString(),
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(200);
      expect(await CommentModel.findById(comment._id)).toBeNull();
    });

    it("returns 403 when deleting someone else's comment", async () => {
      const otherUser = await createTestUser({
        email: "other@example.com",
        userName: "otheruser",
      });
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: otherUser._id,
        text: "Not yours",
        dateCreated: Date.now(),
      });
      const response = createMockResponse();

      await commentService.removeComment(
        comment._id.toString(),
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "You can only delete your own comments" },
      });
    });
  });

  describe("likeComment", () => {
    it("likes a comment and returns 201", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: user._id,
        text: "Like me",
        dateCreated: Date.now(),
      });
      const response = createMockResponse();

      await commentService.likeComment(
        comment._id.toString(),
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(201);
      const CommentLikeModel = require("../repository/commentLikeModel");
      expect(
        await CommentLikeModel.findOne({ comment: comment._id })
      ).toBeTruthy();
    });

    it("returns 409 when already liked", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: user._id,
        text: "Like me",
        dateCreated: Date.now(),
      });
      const CommentLikeModel = require("../repository/commentLikeModel");
      await CommentLikeModel.create({
        comment: comment._id,
        likedBy: user._id,
        dateCreated: Date.now(),
      });
      const response = createMockResponse();

      await commentService.likeComment(
        comment._id.toString(),
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(409);
    });
  });

  describe("unlikeComment", () => {
    it("removes a comment like", async () => {
      const comment = await CommentModel.create({
        rating: rating._id,
        commentedBy: user._id,
        text: "Unlike me",
        dateCreated: Date.now(),
      });
      const CommentLikeModel = require("../repository/commentLikeModel");
      await CommentLikeModel.create({
        comment: comment._id,
        likedBy: user._id,
        dateCreated: Date.now(),
      });
      const response = createMockResponse();

      await commentService.unlikeComment(
        comment._id.toString(),
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(200);
      expect(
        await CommentLikeModel.findOne({ comment: comment._id })
      ).toBeNull();
    });
  });
});
