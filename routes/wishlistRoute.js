const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const wishlistService = require("../services/wishlistService");

router.post("/", authToken, async (request, response) => {
  const { mediaId } = request.body;

  return wishlistService.createNewWishlist(
    mediaId,
    request.user.userName,
    response
  );
});

router.delete("/:mediaId", authToken, async (request, response) => {
  const { mediaId } = request.params;

  return wishlistService.removeFromWishlist(
    mediaId,
    request.user.userName,
    response
  );
});

router.get("/user/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return wishlistService.getWishlistForUser(userName, response);
});

module.exports = router;
