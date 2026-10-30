const express = require("express");
const router = express.Router();

const chatbotService = require("../services/chatbotService");

const optionalAuthToken = require("../middleware/optionalAuthenticateToken");
const publicRateLimiter = require("../middleware/publicRateLimiter");

router.post(
  "/",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { messages } = request.body;
    return chatbotService.sendMessage(messages, response);
  },
);

module.exports = router;
