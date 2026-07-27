jest.mock("../client/slackClient", () => ({
  postMessage: jest.fn().mockResolvedValue(undefined),
}));

const slackClient = require("../client/slackClient");
const RatingModel = require("../repository/ratingModel");
const ratingService = require("../services/ratingService");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const {
  createTestUser,
  createTestMedia,
  createTestRating,
  createTestLike,
  createTestComment,
} = require("./helpers/seed");

const createMockResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

describe("ratingService", () => {
  let user;
  let followedUser;
  let media;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
    followedUser = await createTestUser({
      email: "followed@example.com",
      userName: "followeduser",
    });
    media = await createTestMedia();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("createNewRating", () => {
    it("creates a rating, notifies Slack, and returns 201", async () => {
      const response = createMockResponse();

      await ratingService.createNewRating(
        media.mediaId,
        "4",
        "Really enjoyed it",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          newRating: expect.objectContaining({
            rating: "4",
            comments: "Really enjoyed it",
          }),
        },
      });
      expect(slackClient.postMessage).toHaveBeenCalledWith(
        `Rating has been added for ${media.name} - ${media.mediaType} by ${user.userName}!`,
        process.env.SLACK_RATING_URL
      );

      const storedRating = await RatingModel.findOne({ comments: "Really enjoyed it" });
      expect(storedRating).toBeTruthy();
      expect(storedRating.ratedBy.toString()).toBe(user._id.toString());
      expect(storedRating.media.toString()).toBe(media._id.toString());
    });

    it("returns 404 when the user does not exist", async () => {
      const response = createMockResponse();

      await ratingService.createNewRating(
        media.mediaId,
        "4",
        "Missing user rating",
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

      await ratingService.createNewRating(
        "missing-media",
        "4",
        "Missing media rating",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Media not found" },
      });
    });

    it("returns 409 when the user has already rated the media", async () => {
      await createTestRating(user, media, { comments: "First rating" });
      const response = createMockResponse();

      await ratingService.createNewRating(
        media.mediaId,
        "5",
        "Duplicate rating",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(409);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "You have already rated this media" },
      });
      expect(slackClient.postMessage).not.toHaveBeenCalled();
    });
  });

  describe("getRatingsForUser", () => {
    it("returns ratings created by the user with populated media and ratedBy", async () => {
      await createTestRating(user, media, { comments: "User rating" });
      const response = createMockResponse();

      await ratingService.getRatingsForUser(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          ratingsList: [
            expect.objectContaining({
              comments: "User rating",
              media: expect.objectContaining({
                name: "Test Media",
                mediaId: "media-1",
              }),
              ratedBy: expect.objectContaining({
                userName: user.userName,
              }),
            }),
          ],
        },
      });
      expect(
        response.json.mock.calls[0][0].data.ratingsList[0].ratedBy.password
      ).toBeUndefined();
    });

    it("returns 404 when the user does not exist", async () => {
      const response = createMockResponse();

      await ratingService.getRatingsForUser("ghostuser", response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "User not found" },
      });
    });

    it("includes likeCount and likedByCurrentUser", async () => {
      const rating = await createTestRating(user, media, {
        comments: "Liked rating",
      });
      await createTestLike(followedUser, rating);
      await createTestLike(user, rating);
      const response = createMockResponse();

      await ratingService.getRatingsForUser(
        user.userName,
        response,
        user._id.toString()
      );

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json.mock.calls[0][0].data.ratingsList[0]).toEqual(
        expect.objectContaining({
          comments: "Liked rating",
          likeCount: 2,
          likedByCurrentUser: true,
        })
      );
    });

    it("includes commentList and commentCount", async () => {
      const rating = await createTestRating(user, media, {
        comments: "Review with replies",
      });
      await createTestComment(followedUser, rating, { text: "First!" });
      await createTestComment(user, rating, { text: "Thanks" });
      const response = createMockResponse();

      await ratingService.getRatingsForUser(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      const ratingPayload = response.json.mock.calls[0][0].data.ratingsList[0];
      expect(ratingPayload.commentCount).toBe(2);
      expect(ratingPayload.commentList).toEqual([
        expect.objectContaining({
          text: "First!",
          commentedBy: expect.objectContaining({
            userName: followedUser.userName,
          }),
        }),
        expect.objectContaining({
          text: "Thanks",
          commentedBy: expect.objectContaining({ userName: user.userName }),
        }),
      ]);
    });
  });

  describe("getRatingsForMedia", () => {
    it("returns ratings for a media item", async () => {
      await createTestRating(user, media, { comments: "Media rating" });
      const response = createMockResponse();

      await ratingService.getRatingsForMedia(media.mediaId, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          ratingsList: [
            expect.objectContaining({
              comments: "Media rating",
              media: expect.objectContaining({ mediaId: "media-1" }),
            }),
          ],
        },
      });
    });

    it("returns 404 when the media does not exist", async () => {
      const response = createMockResponse();

      await ratingService.getRatingsForMedia("missing-media", response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Media not found" },
      });
    });
  });

  describe("getExploreRatings", () => {
    it("returns all ratings when no user is provided", async () => {
      const otherMedia = await createTestMedia({
        name: "Other Media",
        mediaId: "media-2",
      });
      await createTestRating(user, media, { comments: "First rating" });
      await createTestRating(user, otherMedia, { comments: "Second rating" });
      const response = createMockResponse();

      await ratingService.getExploreRatings(null, response);

      expect(response.status).toHaveBeenCalledWith(200);
      const ratingsList = response.json.mock.calls[0][0].data.ratingsList;
      expect(ratingsList).toHaveLength(2);
      expect(ratingsList.map((rating) => rating.comments)).toEqual(
        expect.arrayContaining(["First rating", "Second rating"])
      );
    });

    it("excludes followed users and the requester from discover", async () => {
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
      const response = createMockResponse();

      await ratingService.getExploreRatings(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      const ratingsList = response.json.mock.calls[0][0].data.ratingsList;
      expect(ratingsList).toHaveLength(1);
      expect(ratingsList[0]).toEqual(
        expect.objectContaining({
          comments: "Discover rating",
          ratedBy: expect.objectContaining({ userName: stranger.userName }),
        })
      );
    });

    it("returns 404 when the authenticated user does not exist", async () => {
      const response = createMockResponse();

      await ratingService.getExploreRatings("ghostuser", response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "User not found" },
      });
    });
  });

  describe("getRatingsByFollowing", () => {
    it("returns ratings from users the requester follows", async () => {
      user.following = [followedUser.userName];
      await user.save();

      await createTestRating(followedUser, media, {
        comments: "Followed user rating",
      });
      await createTestRating(user, media, { comments: "Own rating" });
      const response = createMockResponse();

      await ratingService.getRatingsByFollowing(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      const ratingsList = response.json.mock.calls[0][0].data.ratingsList;
      expect(ratingsList).toHaveLength(1);
      expect(ratingsList[0]).toEqual(
        expect.objectContaining({
          comments: "Followed user rating",
          ratedBy: expect.objectContaining({
            userName: followedUser.userName,
          }),
        })
      );
    });

    it("returns an empty list when the user follows nobody", async () => {
      const response = createMockResponse();

      await ratingService.getRatingsByFollowing(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: { ratingsList: [] },
      });
    });

    it("returns 404 when the user does not exist", async () => {
      const response = createMockResponse();

      await ratingService.getRatingsByFollowing("ghostuser", response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "User not found" },
      });
    });
  });
});
