const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const searchService = require("../services/searchService");

router.post("/search/movie", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchMovies(keyWord, response);
});

router.post("/search/tv", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchTvShows(keyWord, response);
});

router.post("/search/music", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchMusic(keyWord, response);
});

module.exports = router;
