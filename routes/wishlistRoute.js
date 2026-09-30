const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const wishlistService = require("../services/wishlistService");

/**
 * @openapi
 * /api/wishlist:
 *   post:
 *     tags: [Wishlist]
 *     summary: Add a media item to the caller's wishlist
 *     description: The owner always comes from the token.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaId]
 *             properties:
 *               mediaId:
 *                 type: string
 *                 description: >-
 *                   The media's catalog id (`Media.mediaId`), not its `_id`. The
 *                   media must already be stored.
 *     responses:
 *       201:
 *         description: The new wishlist entry.
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
 *                   required: [newWishlist]
 *                   properties:
 *                     newWishlist:
 *                       $ref: "#/components/schemas/Wishlist"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: '`"User not found"` or `"Media not found"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: '`"This media is already in your wishlist"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/", authToken, async (request, response) => {
  const { mediaId } = request.body;

  return wishlistService.createNewWishlist(
    mediaId,
    request.user.userName,
    response
  );
});

/**
 * @openapi
 * /api/wishlist/{mediaId}:
 *   delete:
 *     tags: [Wishlist]
 *     summary: Remove a media item from the caller's wishlist
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         description: The media's catalog id (`Media.mediaId`), not its `_id`.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The removed wishlist entry.
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
 *                   required: [deletedWishlist]
 *                   properties:
 *                     deletedWishlist:
 *                       $ref: "#/components/schemas/Wishlist"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: >-
 *           `"User not found"`, `"Media not found"`, or `"Wishlist item not found"`
 *           (the media isn't on the caller's wishlist).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.delete("/:mediaId", authToken, async (request, response) => {
  const { mediaId } = request.params;

  return wishlistService.removeFromWishlist(
    mediaId,
    request.user.userName,
    response
  );
});

/**
 * @openapi
 * /api/wishlist/user/{userName}:
 *   get:
 *     tags: [Wishlist]
 *     summary: List a user's wishlist
 *     description: Any logged-in user can view anyone's wishlist.
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: userName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The user's wishlist (an empty list if it has nothing).
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
 *                   required: [wishlistList]
 *                   properties:
 *                     wishlistList:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/WishlistItem"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: No user has that userName (`"User not found"`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/user/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return wishlistService.getWishlistForUser(userName, response);
});

module.exports = router;
