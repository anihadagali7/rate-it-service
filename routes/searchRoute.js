const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const searchService = require("../services/searchService");

router.get("/search/movie", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchMovies(keyWord, response);
});

module.exports = router;
