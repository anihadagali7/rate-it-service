const request = require("supertest");
const app = require("../app");
const WishlistModel = require("../repository/wishlistModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser, createTestMedia } = require("./helpers/seed");

describe("wishlistRoute", () => {
  let user;
  let otherUser;
  let media;
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

  describe("POST /api/wishlist", () => {
    it("returns 401 when no token is provided", async () => {
      const response = await request(app)
        .post("/api/wishlist")
        .send({ mediaId: media.mediaId });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("adds media to the authenticated user's wishlist", async () => {
      const response = await request(app)
        .post("/api/wishlist")
        .set("Authorization", accessToken)
        .send({ mediaId: media.mediaId });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");

      const storedWishlist = await WishlistModel.findOne({ addedBy: user._id });
      expect(storedWishlist).toBeTruthy();
      expect(storedWishlist.media.toString()).toBe(media._id.toString());
    });

    it("uses JWT identity and ignores userName in the request body", async () => {
      const response = await request(app)
        .post("/api/wishlist")
        .set("Authorization", accessToken)
        .send({
          mediaId: media.mediaId,
          userName: otherUser.userName,
        });

      expect(response.status).toBe(201);

      const userWishlist = await WishlistModel.findOne({ addedBy: user._id });
      const otherWishlist = await WishlistModel.findOne({
        addedBy: otherUser._id,
      });
      expect(userWishlist).toBeTruthy();
      expect(otherWishlist).toBeNull();
    });
  });

  describe("GET /api/wishlist/user/:userName", () => {
    it("requires authentication", async () => {
      const response = await request(app).get(
        `/api/wishlist/user/${user.userName}`
      );

      expect(response.status).toBe(401);
    });

    it("returns wishlist items for the requested user", async () => {
      await WishlistModel.create({
        media: media._id,
        addedBy: user._id,
        isActive: true,
        dateCreated: Date.now(),
      });

      const response = await request(app)
        .get(`/api/wishlist/user/${user.userName}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data.wishlistList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            media: expect.objectContaining({
              mediaId: media.mediaId,
              name: "Test Media",
            }),
            addedBy: expect.objectContaining({
              userName: user.userName,
            }),
          }),
        ])
      );
    });

    it("returns an empty list when the user has no wishlist items", async () => {
      const response = await request(app)
        .get(`/api/wishlist/user/${user.userName}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data.wishlistList).toEqual([]);
    });
  });

  describe("DELETE /api/wishlist/:mediaId", () => {
    it("returns 401 when no token is provided", async () => {
      const response = await request(app).delete(
        `/api/wishlist/${media.mediaId}`
      );

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("removes media from the authenticated user's wishlist", async () => {
      await WishlistModel.create({
        media: media._id,
        addedBy: user._id,
        isActive: true,
        dateCreated: Date.now(),
      });

      const response = await request(app)
        .delete(`/api/wishlist/${media.mediaId}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");

      const storedWishlist = await WishlistModel.findOne({ addedBy: user._id });
      expect(storedWishlist).toBeNull();
    });

    it("returns 404 when the media is not on the wishlist", async () => {
      const response = await request(app)
        .delete(`/api/wishlist/${media.mediaId}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(404);
      expect(response.body.errors.msg).toBe("Wishlist item not found");
    });

    it("does not remove another user's wishlist item", async () => {
      await WishlistModel.create({
        media: media._id,
        addedBy: otherUser._id,
        isActive: true,
        dateCreated: Date.now(),
      });

      const response = await request(app)
        .delete(`/api/wishlist/${media.mediaId}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(404);

      const otherWishlist = await WishlistModel.findOne({
        addedBy: otherUser._id,
      });
      expect(otherWishlist).toBeTruthy();
    });
  });
});
