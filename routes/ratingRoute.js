const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const ratingService = require("../services/ratingService");

router.post("", authToken, async (request, response) => {
  const { mediaId, rating, comments, userName } = request.body;

  return ratingService.createNewRating(
    mediaId,
    rating,
    comments,
    userName,
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

router.get("/following/:userName", authToken, async (request, response) => {
  const { userName } = request.params;
  return ratingService.getRatingsByFollowing(userName, response);
});

module.exports = router;
