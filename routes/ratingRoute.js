const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

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

  return ratingService.getRatingsForUser(userName, response);
});

router.get("/media/:mediaId", authToken, async (request, response) => {
  const { mediaId } = request.params;

  return ratingService.getRatingsForMedia(mediaId, response);
});

router.get("/explore", async (request, response) => {
  return ratingService.getExploreRatings(response);
});

router.get("/following", authToken, async (request, response) => {
  return ratingService.getRatingsByFollowing(request.user.userName, response);
});

module.exports = router;
