const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const ratingService = require("../services/ratingService");

router.post("/rating", authToken, async (request, response) => {
  const { mediaId, rating, comments } = request.body;

  ratingService.createNewRating(mediaId, rating, comments, response);
});

module.exports = router;
