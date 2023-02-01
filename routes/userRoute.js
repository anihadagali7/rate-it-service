const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const userService = require("../services/userService");
const {request, response} = require("express");

router.get("/account/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAccountDetails(userName, response);
});

router.get("/allUsers", authToken, async (request, response) => {
  return userService.getAllUsers(response);
});

router.post("/friends/follow", authToken, async (request, response) => {
  const { currentUser, userToFollow } = request.body;

  return userService.followUser(currentUser, userToFollow, response);
});

router.post("/friends/unfollow", authToken, async (request, response) => {
  const { currentUser, userToUnfollow } = request.body;

  return userService.unFollowUser(currentUser, userToUnfollow, response);
});

router.get("/:userName/following", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAllFollowing(userName, response);
});

router.get("/:userName/followers", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAllFollowers(userName, response);
});

router.put("/account/update", authToken, async (request, response) => {
  const { firstName, lastName, email, phoneNumber, userName } = request.body;

  return userService.updateUser(firstName, lastName, email, phoneNumber, userName, response);
});

module.exports = router;
