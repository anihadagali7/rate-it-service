const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");
const optionalAuthToken = require("../middleware/optionalAuthenticateToken");
const publicRateLimiter = require("../middleware/publicRateLimiter");

const mediaService = require("../services/mediaService");

router.post("/add", authToken, async (request, response) => {
  const { media } = request.body;

  return mediaService.createNewMedia(media, response);
});

router.get(
  "/movie/info/:tmdbId",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { tmdbId } = request.params;

    return mediaService.getMovieTvShowDetails(tmdbId, "movie", response);
  }
);

router.get(
  "/tv/info/:tmdbId",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { tmdbId } = request.params;

    return mediaService.getMovieTvShowDetails(tmdbId, "tv", response);
  }
);

router.get(
  "/music/info/:spotifyId",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { spotifyId } = request.params;

    return mediaService.getMusicDetails(spotifyId, response);
  }
);

router.get(
  "/book/info/:googleBookId",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { googleBookId } = request.params;

    return mediaService.getBookDetails(googleBookId, response);
  }
);

module.exports = router;
