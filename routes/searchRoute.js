const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const searchService = require("../services/searchService");

router.post("/movie", authToken, async (request, response) => {
  const { keyWord, page } = request.body;

  return searchService.searchMovies(keyWord, page, response);
});

router.post("/tv", authToken, async (request, response) => {
  const { keyWord, page } = request.body;

  return searchService.searchTvShows(keyWord, page, response);
});

router.post("/music", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchMusic(keyWord, response);
});

router.post("/user", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchUsers(keyWord, response);
});

router.post("/book", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchBooks(keyWord, response);
});

router.post("/all", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchAllMedia(keyWord, response);
});

module.exports = router;
