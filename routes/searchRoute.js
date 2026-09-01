const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");
const optionalAuthToken = require("../middleware/optionalAuthenticateToken");
const publicRateLimiter = require("../middleware/publicRateLimiter");

const searchService = require("../services/searchService");

router.post(
  "/movie",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord, page } = request.body;

    return searchService.searchMovies(keyWord, page, response);
  }
);

router.post(
  "/tv",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord, page } = request.body;

    return searchService.searchTvShows(keyWord, page, response);
  }
);

router.post(
  "/music",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord, page } = request.body;

    return searchService.searchMusic(keyWord, page, response);
  }
);

// Kept behind required auth, unlike the media search routes above — profile
// pages (/profile/:userName) still require login to view, so surfacing user
// search results to anonymous visitors would just lead to a login-wall on
// click.
router.post("/user", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchUsers(keyWord, response);
});

router.post(
  "/book",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord, page } = request.body;

    return searchService.searchBooks(keyWord, page, response);
  }
);

router.post(
  "/all",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord } = request.body;

    return searchService.searchAllMedia(keyWord, response);
  }
);

module.exports = router;
