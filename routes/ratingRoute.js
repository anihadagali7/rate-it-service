const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const ratingService = require("../services/ratingService");

router.post("/rating", authToken, async (request, response) => {
  const { mediaId, rating, comments, userId } = request.body;

  ratingService.createNewRating(mediaId, rating, comments, userId, response);
});

module.exports = router;
