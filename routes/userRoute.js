const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const userService = require("../services/userService");

router.get("/account/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAccountDetails(userName, response);
});

module.exports = router;