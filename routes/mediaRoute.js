const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const mediaService = require("../services/mediaService");

router.post("/media", authToken, async (request, response) => {
  const { media } = request.body;

  return mediaService.createNewMedia(media, response);
});

module.exports = router;
