const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const ratingService = require("../services/ratingService");

router.post("/rating", authToken, async (request, response) => {
  const { mediaId, rating, comments, userId } = request.body;

  return ratingService.createNewRating(mediaId, rating, comments, userId, response);
});

router.get("/ratings/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return ratingService.getRatingsForUser(userName, response);
});

module.exports = router;
