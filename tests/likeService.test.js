const LikeModel = require("../repository/likeModel");
const likeService = require("../services/likeService");
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

describe("likeService", () => {
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

  describe("createLike", () => {
    it("creates a like and returns 201", async () => {
      const response = createMockResponse();

      await likeService.createLike(rating._id.toString(), user.userName, response);

      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          newLike: expect.objectContaining({
            rating: rating._id,
            likedBy: user._id,
          }),
        },
      });

      const storedLike = await LikeModel.findOne({ likedBy: user._id });
      expect(storedLike).toBeTruthy();
      expect(storedLike.rating.toString()).toBe(rating._id.toString());
    });

    it("returns 404 when the user does not exist", async () => {
      const response = createMockResponse();

      await likeService.createLike(rating._id.toString(), "ghostuser", response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "User not found" },
      });
    });

    it("returns 404 when the rating does not exist", async () => {
      const response = createMockResponse();

      await likeService.createLike(
        "507f1f77bcf86cd799439011",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Rating not found" },
      });
    });

    it("returns 409 when the rating is already liked", async () => {
      await LikeModel.create({
        rating: rating._id,
        likedBy: user._id,
        dateCreated: Date.now(),
      });
      const response = createMockResponse();

      await likeService.createLike(rating._id.toString(), user.userName, response);

      expect(response.status).toHaveBeenCalledWith(409);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "You have already liked this rating" },
      });
    });
  });

  describe("removeLike", () => {
    it("removes a like and returns 200", async () => {
      await LikeModel.create({
        rating: rating._id,
        likedBy: user._id,
        dateCreated: Date.now(),
      });
      const response = createMockResponse();

      await likeService.removeLike(rating._id.toString(), user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(await LikeModel.findOne({ likedBy: user._id })).toBeNull();
    });

    it("returns 404 when the like does not exist", async () => {
      const response = createMockResponse();

      await likeService.removeLike(rating._id.toString(), user.userName, response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Like not found" },
      });
    });
  });
});
