const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const wishlistService = require("../services/wishlistService");

router.post("/", authToken, async (request, response) => {
  const { mediaId, userName } = request.body;

  return wishlistService.createNewWishlist(mediaId, userName, response);
});

router.get("/user/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return wishlistService.getWishlistForUser(userName, response);
});

module.exports = router;
