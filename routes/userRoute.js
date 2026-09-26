const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");
const authRateLimiter = require("../middleware/authRateLimiter");
const uploadProfilePicture = require("../middleware/uploadProfilePicture");
const { sendBadRequest, sendError } = require("../utils/httpErrors");

const userService = require("../services/userService");
const emailVerificationService = require("../services/emailVerificationService");

/**
 * @openapi
 * /api/account/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the logged-in user's account
 *     description: >-
 *       Works for accounts that have no userName yet (social sign-ups that
 *       haven't completed their profile).
 *     security:
 *       - tokenAuth: []
 *     responses:
 *       200:
 *         description: The caller's account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AccountUserResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/account/me", authToken, async (request, response) => {
  return userService.getMe(request.user.id, response);
});

/**
 * @openapi
 * /api/account/{userName}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user's profile
 *     description: >-
 *       Returns the full `AccountUser` when `userName` is the caller's own,
 *       otherwise only the `PublicUser` fields.
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
 *         description: The user's profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserProfileResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/account/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAccountDetails(
    userName,
    request.user.userName,
    response
  );
});

/**
 * @openapi
 * /api/allUsers:
 *   get:
 *     tags: [Users]
 *     summary: List every user
 *     description: Returns all users in one response, with no paging.
 *     security:
 *       - tokenAuth: []
 *     responses:
 *       200:
 *         description: Every user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PublicUserListResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/allUsers", authToken, async (request, response) => {
  return userService.getAllUsers(response);
});

/**
 * @openapi
 * /api/friends/follow:
 *   post:
 *     tags: [Users]
 *     summary: Follow a user
 *     description: The follower always comes from the token.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userToFollow]
 *             properties:
 *               userToFollow:
 *                 type: string
 *                 description: userName of the user to follow.
 *     responses:
 *       200:
 *         description: Now following.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StatusResponse"
 *       400:
 *         description: >-
 *           `"You cannot follow yourself"` or `"You already follow this user"`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/friends/follow", authToken, async (request, response) => {
  const { userToFollow } = request.body;

  return userService.followUser(
    request.user.userName,
    userToFollow,
    response
  );
});

/**
 * @openapi
 * /api/friends/unfollow:
 *   post:
 *     tags: [Users]
 *     summary: Unfollow a user
 *     description: The follower always comes from the token.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userToUnfollow]
 *             properties:
 *               userToUnfollow:
 *                 type: string
 *                 description: userName of the user to unfollow.
 *     responses:
 *       200:
 *         description: No longer following.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StatusResponse"
 *       400:
 *         description: >-
 *           `"You cannot unfollow yourself"` or `"You do not currently follow
 *           this user"`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/friends/unfollow", authToken, async (request, response) => {
  const { userToUnfollow } = request.body;

  return userService.unFollowUser(
    request.user.userName,
    userToUnfollow,
    response
  );
});

/**
 * @openapi
 * /api/{userName}/following:
 *   get:
 *     tags: [Users]
 *     summary: List the users someone follows
 *     description: Users who no longer exist are left out.
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
 *         description: The users `userName` follows.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PublicUserListResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/:userName/following", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAllFollowing(userName, response);
});

/**
 * @openapi
 * /api/{userName}/followers:
 *   get:
 *     tags: [Users]
 *     summary: List someone's followers
 *     description: Users who no longer exist are left out.
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
 *         description: The users following `userName`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PublicUserListResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/:userName/followers", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAllFollowers(userName, response);
});

/**
 * @openapi
 * /api/{userName}/friendsList:
 *   get:
 *     tags: [Users]
 *     summary: List someone's followers and following together
 *     description: Users who no longer exist are left out.
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
 *         description: Both lists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/FriendsListResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/:userName/friendsList", authToken, async (request, response) => {
  const { userName } = request.params;

  return userService.getAllFriends(userName, response);
});

/**
 * @openapi
 * /api/account/update:
 *   put:
 *     tags: [Users]
 *     summary: Update the logged-in user's name and phone number
 *     description: >-
 *       The user always comes from the token; a userName in the body is
 *       ignored. Omitted fields are left unchanged.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: The updated account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AccountUserResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
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

/**
 * @openapi
 * /api/account/complete-profile:
 *   put:
 *     tags: [Users]
 *     summary: Finish a social sign-up by choosing a userName
 *     description: >-
 *       One-time step for accounts created through Google, Facebook, or Apple
 *       sign-in, which start without a userName. Optionally sets a password so
 *       the user can also log in with email.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userName]
 *             properties:
 *               userName:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: The completed account (`isProfileComplete` is true).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AccountUserResponse"
 *       400:
 *         description: >-
 *           `"Profile is already complete"` or `"This username is already being
 *           used"`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
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

/**
 * @openapi
 * /api/account/resend-verification:
 *   post:
 *     tags: [Users]
 *     summary: Resend the email verification link
 *     description: Issues a new link; any earlier link stops working.
 *     security:
 *       - tokenAuth: []
 *     responses:
 *       200:
 *         description: Email sent.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StatusResponse"
 *       400:
 *         description: "`\"This email is already verified\"`."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         $ref: "#/components/responses/BadGateway"
 */
router.post(
  "/account/resend-verification",
  authRateLimiter,
  authToken,
  async (request, response) => {
    return emailVerificationService.resendVerificationEmail(
      request.user.id,
      response
    );
  }
);

/**
 * @openapi
 * /api/account/picture:
 *   put:
 *     tags: [Users]
 *     summary: Upload a new profile picture
 *     description: >-
 *       Uploads to Cloudinary and stores the URL on the account, replacing any
 *       previous picture.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [picture]
 *             properties:
 *               picture:
 *                 type: string
 *                 format: binary
 *                 description: A JPEG, PNG, or WebP image, at most 5 MB.
 *     responses:
 *       200:
 *         description: The account with its new `picture` URL.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AccountUserResponse"
 *       400:
 *         description: >-
 *           No file, a disallowed type (`"Only JPEG, PNG, and WebP images are
 *           allowed"`), a file over 5 MB (`"File too large"`), or an image
 *           Cloudinary rejects.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         $ref: "#/components/responses/BadGateway"
 */
router.put("/account/picture", authRateLimiter, authToken, (request, response) => {
  uploadProfilePicture(request, response, (error) => {
    if (error) {
      return sendBadRequest(response, error.message || "Invalid file upload");
    }

    // updateProfilePicture handles its own errors internally and always
    // resolves, but nothing here awaits it (this callback isn't async) — the
    // catch is a backstop against process-crashing unhandled rejections if
    // that ever stops being true.
    userService
      .updateProfilePicture(request.user.id, request.file, response)
      .catch((error) => {
        console.error("Unexpected error updating profile picture:", error);
        if (!response.headersSent) {
          sendError(response, 500, "Something went wrong. Please try again.");
        }
      });
  });
});

module.exports = router;
