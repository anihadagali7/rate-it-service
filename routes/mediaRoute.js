const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const mediaService = require("../services/mediaService");

router.post("/add", authToken, async (request, response) => {
  const { media } = request.body;

  return mediaService.createNewMedia(media, response);
});

router.get("/movie/info/:tmdbId", authToken, async (request, response) => {
  const { tmdbId } = request.params;

  return mediaService.getMovieDetails(tmdbId, response);
});

module.exports = router;
