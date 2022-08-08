const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const userService = require("../services/userService");
const {request, response} = require("express");

router.get("/account/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAccountDetails(userName, response);
});

router.post("/friends/follow", authToken, async (request, response) => {
  const { userRequest, userAccept } = request.body;

  return userService.followUser(userRequest, userAccept, response);
})

module.exports = router;