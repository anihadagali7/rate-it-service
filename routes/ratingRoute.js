const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");
const optionalAuthToken = require("../middleware/optionalAuthenticateToken");

const ratingService = require("../services/ratingService");

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

router.get("/user/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return ratingService.getRatingsForUser(
    userName,
    response,
    request.user.id
  );
});

router.get("/media/:mediaId", optionalAuthToken, async (request, response) => {
  const { mediaId } = request.params;

  return ratingService.getRatingsForMedia(
    mediaId,
    response,
    request.user?.id || null
  );
});

router.get("/explore", optionalAuthToken, async (request, response) => {
  const userName = request.user?.userName || null;
  const currentUserId = request.user?.id || null;
  return ratingService.getExploreRatings(userName, response, currentUserId);
});

router.get("/following", authToken, async (request, response) => {
  return ratingService.getRatingsByFollowing(
    request.user.userName,
    response,
    request.user.id
  );
});

module.exports = router;
