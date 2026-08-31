const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");
const uploadProfilePicture = require("../middleware/uploadProfilePicture");
const { sendBadRequest } = require("../utils/httpErrors");

const userService = require("../services/userService");

router.get("/account/me", authToken, async (request, response) => {
  return userService.getMe(request.user.id, response);
});

router.get("/account/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAccountDetails(
    userName,
    request.user.userName,
    response
  );
});

router.get("/allUsers", authToken, async (request, response) => {
  return userService.getAllUsers(response);
});

router.post("/friends/follow", authToken, async (request, response) => {
  const { userToFollow } = request.body;

  return userService.followUser(
    request.user.userName,
    userToFollow,
    response
  );
});

router.post("/friends/unfollow", authToken, async (request, response) => {
  const { userToUnfollow } = request.body;

  return userService.unFollowUser(
    request.user.userName,
    userToUnfollow,
    response
  );
});

router.get("/:userName/following", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAllFollowing(userName, response);
});

router.get("/:userName/followers", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAllFollowers(userName, response);
});

router.get("/:userName/friendsList", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAllFriends(userName, response);
});

router.put("/account/update", authToken, async (request, response) => {
  const { firstName, lastName, phoneNumber } = request.body;

  return userService.updateUser(
    firstName,
    lastName,
    phoneNumber,
    request.user.userName,
    response
  );
});

router.put(
  "/account/complete-profile",
  authToken,
  async (request, response) => {
    const { userName, firstName, lastName, password } = request.body;

    return userService.completeProfile(
      request.user.id,
      { userName, firstName, lastName, password },
      response
    );
  }
);

router.put("/account/picture", authToken, (request, response) => {
  uploadProfilePicture(request, response, (error) => {
    if (error) {
      return sendBadRequest(response, error.message || "Invalid file upload");
    }

    return userService.updateProfilePicture(
      request.user.id,
      request.file,
      response
    );
  });
});

module.exports = router;
