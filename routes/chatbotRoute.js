const express = require("express");
const router = express.Router();

const chatbotService = require("../services/chatbotService");

const optionalAuthToken = require("../middleware/optionalAuthenticateToken");
const publicRateLimiter = require("../middleware/publicRateLimiter");

/**
 * @openapi
 * /api/chatbot:
 *   post:
 *     tags: [Chatbot]
 *     summary: Send a message to the chatbot
 *     description: >-
 *       Returns a fixed reply for now. Works with or without a login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 description: The conversation so far oldest first.
 *                 items:
 *                   type: object
 *                   required: [role, content]
 *                   properties:
 *                     role:
 *                       type: string
 *                       description: Who wrote the message.
 *                     content:
 *                       type: string
 *                       description: The message text.
 *     responses:
 *       200:
 *         description: The chatbot's reply.
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
 *                   required: [reply]
 *                   properties:
 *                     reply:
 *                       type: string
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */

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
