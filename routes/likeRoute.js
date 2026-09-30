const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const likeService = require("../services/likeService");

/**
 * @openapi
 * /api/likes:
 *   post:
 *     tags: [Likes]
 *     summary: Like a rating
 *     description: >-
 *       The liker always comes from the token. A malformed `ratingId` returns 500.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ratingId]
 *             properties:
 *               ratingId:
 *                 $ref: "#/components/schemas/ObjectId"
 *     responses:
 *       201:
 *         description: The new like.
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
 *                       $ref: "#/components/schemas/Like"
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
 *       409:
 *         description: '`"You have already liked this rating"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/", authToken, async (request, response) => {
  const { ratingId } = request.body;

  return likeService.createLike(ratingId, request.user.userName, response);
});

/**
 * @openapi
 * /api/likes/{ratingId}:
 *   delete:
 *     tags: [Likes]
 *     summary: Unlike a rating
 *     description: A malformed `ratingId` returns 500.
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           $ref: "#/components/schemas/ObjectId"
 *     responses:
 *       200:
 *         description: The removed like.
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
 *                       $ref: "#/components/schemas/Like"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: >-
 *           `"User not found"`, `"Rating not found"`, or `"Like not found"` (the
 *           caller hasn't liked it).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.delete("/:ratingId", authToken, async (request, response) => {
  const { ratingId } = request.params;

  return likeService.removeLike(ratingId, request.user.userName, response);
});

module.exports = router;
