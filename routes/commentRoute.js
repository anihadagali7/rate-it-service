const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const commentService = require("../services/commentService");

router.post("/", authToken, async (request, response) => {
  const { ratingId, text } = request.body;

  return commentService.createComment(
    ratingId,
    text,
    request.user.userName,
    response
  );
});

router.post("/:commentId/like", authToken, async (request, response) => {
  const { commentId } = request.params;

  return commentService.likeComment(
    commentId,
    request.user.userName,
    response
  );
});

router.delete("/:commentId/like", authToken, async (request, response) => {
  const { commentId } = request.params;

  return commentService.unlikeComment(
    commentId,
    request.user.userName,
    response
  );
});

router.delete("/:commentId", authToken, async (request, response) => {
  const { commentId } = request.params;

  return commentService.removeComment(
    commentId,
    request.user.userName,
    response
  );
});

module.exports = router;
