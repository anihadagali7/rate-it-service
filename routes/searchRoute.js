const express = require("express");
const router = express.Router();
const optionalAuthToken = require("../middleware/optionalAuthenticateToken");

const searchService = require("../services/searchService");

router.post("/movie", optionalAuthToken, async (request, response) => {
  const { keyWord, page } = request.body;

  return searchService.searchMovies(keyWord, page, response);
});

router.post("/tv", optionalAuthToken, async (request, response) => {
  const { keyWord, page } = request.body;

  return searchService.searchTvShows(keyWord, page, response);
});

router.post("/music", optionalAuthToken, async (request, response) => {
  const { keyWord, page } = request.body;

  return searchService.searchMusic(keyWord, page, response);
});

router.post("/user", optionalAuthToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchUsers(keyWord, response);
});

router.post("/book", optionalAuthToken, async (request, response) => {
  const { keyWord, page } = request.body;

  return searchService.searchBooks(keyWord, page, response);
});

router.post("/all", optionalAuthToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchAllMedia(keyWord, response);
});

module.exports = router;
