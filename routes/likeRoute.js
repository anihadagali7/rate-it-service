const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const likeService = require("../services/likeService");

router.post("/", authToken, async (request, response) => {
  const { ratingId } = request.body;

  return likeService.createLike(ratingId, request.user.userName, response);
});

router.delete("/:ratingId", authToken, async (request, response) => {
  const { ratingId } = request.params;

  return likeService.removeLike(ratingId, request.user.userName, response);
});

module.exports = router;
