const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const commentService = require("../services/commentService");

/**
 * @openapi
 * /api/comments:
 *   post:
 *     tags: [Comments]
 *     summary: Comment on a rating
 *     description: >-
 *       The author always comes from the token. A malformed `ratingId` returns 500.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ratingId, text]
 *             properties:
 *               ratingId:
 *                 $ref: "#/components/schemas/ObjectId"
 *               text:
 *                 type: string
 *                 description: Trimmed before saving; must not be blank.
 *     responses:
 *       201:
 *         description: The new comment, with its author filled in.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [newComment]
 *                   properties:
 *                     newComment:
 *                       $ref: "#/components/schemas/CreatedComment"
 *       400:
 *         description: '`text` is missing or blank (`"Comment text is required"`).'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: '`"User not found"` or `"Rating not found"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/", authToken, async (request, response) => {
  const { ratingId, text } = request.body;

  return commentService.createComment(
    ratingId,
    text,
    request.user.userName,
    response
  );
});

/**
 * @openapi
 * /api/comments/{commentId}/like:
 *   post:
 *     tags: [Comments]
 *     summary: Like a comment
 *     description: A malformed `commentId` returns 500.
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           $ref: "#/components/schemas/ObjectId"
 *     responses:
 *       201:
 *         description: The new comment like.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [newLike]
 *                   properties:
 *                     newLike:
 *                       $ref: "#/components/schemas/CommentLike"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: '`"User not found"` or `"Comment not found"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: '`"You have already liked this comment"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/:commentId/like", authToken, async (request, response) => {
  const { commentId } = request.params;

  return commentService.likeComment(
    commentId,
    request.user.userName,
    response
  );
});

/**
 * @openapi
 * /api/comments/{commentId}/like:
 *   delete:
 *     tags: [Comments]
 *     summary: Unlike a comment
 *     description: A malformed `commentId` returns 500.
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           $ref: "#/components/schemas/ObjectId"
 *     responses:
 *       200:
 *         description: The removed comment like.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [deletedLike]
 *                   properties:
 *                     deletedLike:
 *                       $ref: "#/components/schemas/CommentLike"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: >-
 *           `"User not found"`, `"Comment not found"`, or `"Like not found"` (the
 *           caller hasn't liked it).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.delete("/:commentId/like", authToken, async (request, response) => {
  const { commentId } = request.params;

  return commentService.unlikeComment(
    commentId,
    request.user.userName,
    response
  );
});

/**
 * @openapi
 * /api/comments/{commentId}:
 *   delete:
 *     tags: [Comments]
 *     summary: Delete one of the caller's comments
 *     description: >-
 *       Also deletes the comment's likes. A malformed `commentId` returns 500.
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           $ref: "#/components/schemas/ObjectId"
 *     responses:
 *       200:
 *         description: The deleted comment.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [deletedComment]
 *                   properties:
 *                     deletedComment:
 *                       $ref: "#/components/schemas/Comment"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         description: >-
 *           The token is invalid (`"Invalid token"`), or the comment is someone
 *           else's (`"You can only delete your own comments"`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       404:
 *         description: '`"User not found"` or `"Comment not found"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.delete("/:commentId", authToken, async (request, response) => {
  const { commentId } = request.params;

  return commentService.removeComment(
    commentId,
    request.user.userName,
    response
  );
});

module.exports = router;
