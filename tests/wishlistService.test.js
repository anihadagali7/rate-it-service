const WishlistModel = require("../repository/wishlistModel");
const wishlistService = require("../services/wishlistService");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createTestUser, createTestMedia } = require("./helpers/seed");

const createMockResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

describe("wishlistService", () => {
  let user;
  let media;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
    media = await createTestMedia();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("createNewWishlist", () => {
    it("adds media to a user's wishlist and returns 201", async () => {
      const response = createMockResponse();

      await wishlistService.createNewWishlist(
        media.mediaId,
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          newWishlist: expect.objectContaining({
            isActive: true,
          }),
        },
      });

      const storedWishlist = await WishlistModel.findOne({ addedBy: user._id });
      expect(storedWishlist).toBeTruthy();
      expect(storedWishlist.media.toString()).toBe(media._id.toString());
    });

    it("returns 404 when the user does not exist", async () => {
      const response = createMockResponse();

      await wishlistService.createNewWishlist(
        media.mediaId,
        "ghostuser",
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "User not found" },
      });
    });

    it("returns 404 when the media does not exist", async () => {
      const response = createMockResponse();

      await wishlistService.createNewWishlist(
        "missing-media",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Media not found" },
      });
    });
  });

  describe("getWishlistForUser", () => {
    it("returns wishlist items with populated media and user", async () => {
      await WishlistModel.create({
        media: media._id,
        addedBy: user._id,
        isActive: true,
        dateCreated: Date.now(),
      });
      const response = createMockResponse();

      await wishlistService.getWishlistForUser(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          wishlistList: [
            expect.objectContaining({
              media: expect.objectContaining({
                name: "Test Media",
                mediaId: "media-1",
              }),
              addedBy: expect.objectContaining({
                userName: user.userName,
              }),
            }),
          ],
        },
      });
      expect(
        response.json.mock.calls[0][0].data.wishlistList[0].addedBy.password
      ).toBeUndefined();
    });

    it("returns an empty list when the user has no wishlist items", async () => {
      const response = createMockResponse();

      await wishlistService.getWishlistForUser(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: { wishlistList: [] },
      });
    });

    it("returns 404 when the user does not exist", async () => {
      const response = createMockResponse();

      await wishlistService.getWishlistForUser("ghostuser", response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "User not found" },
      });
    });
  });
});
