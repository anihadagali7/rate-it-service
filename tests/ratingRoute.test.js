jest.mock("../client/slackClient", () => ({
  postMessage: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const app = require("../app");
const RatingModel = require("../repository/ratingModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const {
  createTestUser,
  createTestMedia,
  createTestRating,
  createTestLike,
  createTestComment,
} = require("./helpers/seed");

describe("ratingRoute", () => {
  let user;
  let followedUser;
  let otherUser;
  let media;
  let accessToken;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
    followedUser = await createTestUser({
      email: "followed@example.com",
      userName: "followeduser",
    });
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
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/ratings", () => {
    it("returns 401 when no token is provided", async () => {
      const response = await request(app).post("/api/ratings").send({
        mediaId: media.mediaId,
        rating: "5",
        comments: "Route rating",
      });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("creates a rating for the authenticated user", async () => {
      const response = await request(app)
        .post("/api/ratings")
        .set("Authorization", accessToken)
        .send({
          mediaId: media.mediaId,
          rating: "5",
          comments: "Route rating",
        });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.data.newRating).toMatchObject({
        rating: "5",
        comments: "Route rating",
      });

      const storedRating = await RatingModel.findOne({
        comments: "Route rating",
      });
      expect(storedRating.ratedBy.toString()).toBe(user._id.toString());
    });

    it("uses JWT identity and ignores userName in the request body", async () => {
      const response = await request(app)
        .post("/api/ratings")
        .set("Authorization", accessToken)
        .send({
          mediaId: media.mediaId,
          rating: "3",
          comments: "Spoofed user rating",
          userName: otherUser.userName,
        });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);

      const storedRating = await RatingModel.findOne({
        comments: "Spoofed user rating",
      });
      expect(storedRating.ratedBy.toString()).toBe(user._id.toString());
      expect(storedRating.ratedBy.toString()).not.toBe(otherUser._id.toString());
    });
  });

  describe("GET /api/ratings/user/:userName", () => {
    it("requires authentication", async () => {
      const response = await request(app).get(
        `/api/ratings/user/${user.userName}`
      );

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(401);
    });

    it("returns ratings for the requested user", async () => {
      await createTestRating(user, media, { comments: "Profile rating" });

      const response = await request(app)
        .get(`/api/ratings/user/${user.userName}`)
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.ratingsList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            comments: "Profile rating",
            ratedBy: expect.objectContaining({ userName: user.userName }),
          }),
        ])
      );
    });
  });

  describe("GET /api/ratings/media/:mediaId", () => {
    it("returns ratings for anonymous visitors with no token", async () => {
      await createTestRating(user, media, { comments: "Anonymous view rating" });

      const response = await request(app).get(
        `/api/ratings/media/${media.mediaId}`
      );

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.ratingsList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ comments: "Anonymous view rating" }),
        ])
      );
    });

    it("returns 403 for a request with an invalid token", async () => {
      const response = await request(app)
        .get(`/api/ratings/media/${media.mediaId}`)
        .set("Authorization", "invalid.token.value");

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(403);
      expect(response.body.errors.msg).toBe("Invalid token");
    });

    it("returns ratings for the requested media", async () => {
      await createTestRating(user, media, { comments: "Media page rating" });

      const response = await request(app)
        .get(`/api/ratings/media/${media.mediaId}`)
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.ratingsList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            comments: "Media page rating",
            media: expect.objectContaining({ mediaId: media.mediaId }),
          }),
        ])
      );
    });
  });

  describe("GET /api/ratings/explore", () => {
    it("includes likes and comments in the documented shape", async () => {
      const rating = await createTestRating(otherUser, media, {
        comments: "Commented rating",
      });
      await createTestLike(user, rating);
      await createTestComment(followedUser, rating, { text: "Agreed!" });

      const response = await request(app)
        .get("/api/ratings/explore")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      const [item] = response.body.data.ratingsList;
      expect(item).toEqual(
        expect.objectContaining({
          likeCount: 1,
          likedByCurrentUser: true,
          commentCount: 1,
          media: expect.objectContaining({ mediaId: media.mediaId }),
          ratedBy: expect.objectContaining({ userName: otherUser.userName }),
        })
      );
      expect(item.commentList[0]).toEqual(
        expect.objectContaining({
          text: "Agreed!",
          likeCount: 0,
          commentedBy: expect.objectContaining({
            userName: followedUser.userName,
          }),
        })
      );
    });

    it("returns ratings without authentication", async () => {
      await createTestRating(user, media, { comments: "Explore rating" });

      const response = await request(app).get("/api/ratings/explore");

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.ratingsList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ comments: "Explore rating" }),
        ])
      );
    });

    it("excludes followed users and self when authenticated", async () => {
      const stranger = await createTestUser({
        email: "stranger@example.com",
        userName: "stranger",
      });
      const strangerMedia = await createTestMedia({
        name: "Stranger Media",
        mediaId: "media-stranger",
      });

      user.following = [followedUser.userName];
      await user.save();

      await createTestRating(user, media, { comments: "Own rating" });
      await createTestRating(followedUser, media, {
        comments: "Followed rating",
      });
      await createTestRating(stranger, strangerMedia, {
        comments: "Discover rating",
      });

      const response = await request(app)
        .get("/api/ratings/explore")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      const ratingsList = response.body.data.ratingsList;
      expect(ratingsList).toHaveLength(1);
      expect(ratingsList[0]).toMatchObject({
        comments: "Discover rating",
        ratedBy: { userName: stranger.userName },
      });
    });

    it("does not expose private user fields on ratedBy", async () => {
      await createTestRating(user, media, { comments: "Public explore rating" });

      const response = await request(app).get("/api/ratings/explore");

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      const ratedBy = response.body.data.ratingsList[0].ratedBy;
      expect(ratedBy).toMatchObject({
        userName: user.userName,
        firstName: "Test",
        lastName: "User",
      });
      expect(ratedBy.email).toBeUndefined();
      expect(ratedBy.phoneNumber).toBeUndefined();
      expect(ratedBy.isAdmin).toBeUndefined();
      expect(ratedBy.password).toBeUndefined();
    });
  });

  describe("GET /api/ratings/following", () => {
    it("requires authentication", async () => {
      const response = await request(app).get("/api/ratings/following");

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(401);
    });

    it("returns ratings from users the authenticated user follows", async () => {
      user.following = [followedUser.userName];
      await user.save();

      await createTestRating(followedUser, media, {
        comments: "Feed rating",
      });
      await createTestRating(user, media, { comments: "Own feed rating" });

      const response = await request(app)
        .get("/api/ratings/following")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      const ratingsList = response.body.data.ratingsList;
      expect(ratingsList).toHaveLength(1);
      expect(ratingsList[0]).toMatchObject({
        comments: "Feed rating",
        ratedBy: { userName: followedUser.userName },
      });
    });
  });
});
