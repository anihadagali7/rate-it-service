const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");
const optionalAuthToken = require("../middleware/optionalAuthenticateToken");
const publicRateLimiter = require("../middleware/publicRateLimiter");

const ratingService = require("../services/ratingService");

/**
 * @openapi
 * /api/ratings:
 *   post:
 *     tags: [Ratings]
 *     summary: Rate a media item
 *     description: >-
 *       Creates the logged-in user's rating for a media item (one per user
 *       per media). The rater always comes from the token; a userName in the
 *       body is ignored.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaId, rating]
 *             properties:
 *               mediaId:
 *                 type: string
 *                 description: The media's catalog `mediaId` (not its `_id`).
 *               rating:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                 description: The score. Stored as a string.
 *               comments:
 *                 type: string
 *                 description: Review text.
 *     responses:
 *       201:
 *         description: Rating created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [newRating]
 *                   properties:
 *                     newRating:
 *                       $ref: "#/components/schemas/Rating"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       409:
 *         description: "`\"You have already rated this media\"`."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("", authToken, async (request, response) => {
  const { mediaId, rating, comments } = request.body;

  return ratingService.createNewRating(
    mediaId,
    rating,
    comments,
    request.user.userName,
    response
  );
});

/**
 * @openapi
 * /api/ratings/user/{userName}:
 *   get:
 *     tags: [Ratings]
 *     summary: List a user's ratings
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: userName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ratings, newest first.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RatingsListResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/user/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return ratingService.getRatingsForUser(
    userName,
    response,
    request.user.id
  );
});

/**
 * @openapi
 * /api/ratings/media/{mediaId}:
 *   get:
 *     tags: [Ratings]
 *     summary: List ratings for a media item
 *     description: >-
 *       Public. With a valid token, `likedByCurrentUser` is filled in for the
 *       caller.
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         description: The media's catalog `mediaId` (not its `_id`).
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ratings, newest first.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RatingsListResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get(
  "/media/:mediaId",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { mediaId } = request.params;

    return ratingService.getRatingsForMedia(
      mediaId,
      response,
      request.user?.id || null
    );
  }
);

/**
 * @openapi
 * /api/ratings/explore:
 *   get:
 *     tags: [Ratings]
 *     summary: Discover ratings
 *     description: >-
 *       Public. Anonymous callers get every rating. With a valid token,
 *       ratings by the caller and by people they follow are left out, and
 *       `likedByCurrentUser` is filled in.
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     responses:
 *       200:
 *         description: Ratings, newest first.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RatingsListResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get(
  "/explore",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const userName = request.user?.userName || null;
    const currentUserId = request.user?.id || null;
    return ratingService.getExploreRatings(userName, response, currentUserId);
  }
);

/**
 * @openapi
 * /api/ratings/following:
 *   get:
 *     tags: [Ratings]
 *     summary: Feed of ratings from people the user follows
 *     security:
 *       - tokenAuth: []
 *     responses:
 *       200:
 *         description: Ratings, newest first.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RatingsListResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/following", authToken, async (request, response) => {
  return ratingService.getRatingsByFollowing(
    request.user.userName,
    response,
    request.user.id
  );
});

module.exports = router;
