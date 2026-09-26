const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");

const authenticationService = require("../services/authenticationService");
const socialAuthService = require("../services/socialAuthService");
const emailVerificationService = require("../services/emailVerificationService");
const passwordResetService = require("../services/passwordResetService");
const authToken = require("../middleware/authenticateToken");
const authRateLimiter = require("../middleware/authRateLimiter");
const { sendError } = require("../utils/httpErrors");

require("dotenv").config();

const validateRequest = (request, response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return sendError(response, 400, errors.array()[0].msg);
  }
  return null;
};

const createUserValidators = [
  check("firstName").trim().notEmpty().withMessage("First name is required"),
  check("lastName").trim().notEmpty().withMessage("Last name is required"),
  check("email").isEmail().withMessage("A valid email is required"),
  check("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  check("userName").trim().notEmpty().withMessage("Username is required"),
];

const loginValidators = [
  check("email").isEmail().withMessage("A valid email is required"),
  check("password").notEmpty().withMessage("Password is required"),
];

const resetPasswordValidators = [
  check("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  check("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];

const socialCodeValidators = [
  check("code").notEmpty().withMessage("Code is required"),
];

const socialAccessTokenValidators = [
  check("accessToken").notEmpty().withMessage("Access token is required"),
];

const socialIdentityTokenValidators = [
  check("identityToken").notEmpty().withMessage("Identity token is required"),
];

const verifyEmailValidators = [
  check("token").notEmpty().withMessage("Verification token is required"),
];

const forgotPasswordValidators = [
  check("email").isEmail().withMessage("A valid email is required"),
];

const resetPasswordWithTokenValidators = [
  check("token").notEmpty().withMessage("Reset token is required"),
  check("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];

/**
 * @openapi
 * /api:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: The service is running.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [UP]
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/", async (request, response) => {
  response.status(200).json({ status: "UP" });
});

/**
 * @openapi
 * /api/create-user:
 *   post:
 *     tags: [Auth]
 *     summary: Sign up with email and password
 *     description: >-
 *       Creates an active account, sends a verification email (without
 *       waiting for it), and returns a token so the user is logged in right away.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, userName]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               userName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthSuccess"
 *       400:
 *         description: >-
 *           Validation failed, or the email or username is already taken
 *           (`"This email is already being used"`, `"This username is already
 *           being used"`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post(
  "/create-user",
  authRateLimiter,
  createUserValidators,
  async (request, response) => {
    if (validateRequest(request, response)) {
      return;
    }

    const { firstName, lastName, email, password, phoneNumber, userName } =
      request.body;

    return authenticationService.createNewUser(
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      userName,
      response
    );
  }
);

/**
 * @openapi
 * /api/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthSuccess"
 *       400:
 *         $ref: "#/components/responses/ValidationError"
 *       401:
 *         description: >-
 *           `"Email or password is invalid"` — the same message for an unknown
 *           email, a wrong password, an inactive account, or a social-only
 *           account with no password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post(
  "/login",
  authRateLimiter,
  loginValidators,
  async (request, response) => {
    if (validateRequest(request, response)) {
      return;
    }

    const { email, password } = request.body;

    return authenticationService.login(email, password, response);
  }
);

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with Google
 *     description: >-
 *       Logs in the user linked to this Google account. If there isn't one,
 *       links an existing account with the same verified email, or creates a
 *       new account. New accounts have no userName yet
 *       (`isProfileComplete: false`) until they complete their profile.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from Google's OAuth popup.
 *     responses:
 *       200:
 *         description: Logged in to an existing or newly linked account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthSuccess"
 *       201:
 *         description: A new account was created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthSuccess"
 *       400:
 *         $ref: "#/components/responses/ValidationError"
 *       401:
 *         description: "Google rejected the credential (`\"Google authentication failed\"`)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: >-
 *           An account with this email exists, but Google hasn't verified the
 *           email, so it can't be linked safely.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post(
  "/auth/google",
  authRateLimiter,
  socialCodeValidators,
  async (request, response) => {
    if (validateRequest(request, response)) {
      return;
    }

    return socialAuthService.googleLogin(request.body.code, response);
  }
);

/**
 * @openapi
 * /api/auth/facebook:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with Facebook
 *     description: >-
 *       Logs in the user linked to this Facebook account. If there isn't one,
 *       links an existing account with the same verified email, or creates a
 *       new account. New accounts have no userName yet
 *       (`isProfileComplete: false`) until they complete their profile.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accessToken]
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Access token from the Facebook Login SDK.
 *     responses:
 *       200:
 *         description: Logged in to an existing or newly linked account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthSuccess"
 *       201:
 *         description: A new account was created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthSuccess"
 *       400:
 *         $ref: "#/components/responses/ValidationError"
 *       401:
 *         description: "Facebook rejected the credential (`\"Facebook authentication failed\"`)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: >-
 *           An account with this email exists, but Facebook hasn't verified the
 *           email, so it can't be linked safely.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post(
  "/auth/facebook",
  authRateLimiter,
  socialAccessTokenValidators,
  async (request, response) => {
    if (validateRequest(request, response)) {
      return;
    }

    return socialAuthService.facebookLogin(
      request.body.accessToken,
      response
    );
  }
);

/**
 * @openapi
 * /api/auth/apple:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with Apple
 *     description: >-
 *       Logs in the user linked to this Apple account. If there isn't one,
 *       links an existing account with the same verified email, or creates a
 *       new account. New accounts have no userName yet
 *       (`isProfileComplete: false`) until they complete their profile.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identityToken]
 *             properties:
 *               identityToken:
 *                 type: string
 *                 description: Identity token (JWT) from Sign in with Apple.
 *               user:
 *                 type: object
 *                 description: >-
 *                   Apple sends the user's name only on the first authorization.
 *                   Used only when creating a new account.
 *                 properties:
 *                   name:
 *                     type: object
 *                     properties:
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *     responses:
 *       200:
 *         description: Logged in to an existing or newly linked account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthSuccess"
 *       201:
 *         description: A new account was created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthSuccess"
 *       400:
 *         $ref: "#/components/responses/ValidationError"
 *       401:
 *         description: "Apple rejected the credential (`\"Apple authentication failed\"`)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: >-
 *           An account with this email exists, but Apple hasn't verified the
 *           email, so it can't be linked safely.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post(
  "/auth/apple",
  authRateLimiter,
  socialIdentityTokenValidators,
  async (request, response) => {
    if (validateRequest(request, response)) {
      return;
    }

    return socialAuthService.appleLogin(
      request.body.identityToken,
      request.body.user,
      response
    );
  }
);

/**
 * @openapi
 * /api/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify an email address
 *     description: Consumes the one-time token from the verification email link.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AccountUserResponse"
 *       400:
 *         description: >-
 *           Missing token, or `"This verification link is invalid or has expired"`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post(
  "/verify-email",
  authRateLimiter,
  verifyEmailValidators,
  async (request, response) => {
    if (validateRequest(request, response)) {
      return;
    }

    return emailVerificationService.verifyEmail(request.body.token, response);
  }
);

/**
 * @openapi
 * /api/account/resetPassword:
 *   post:
 *     tags: [Auth]
 *     summary: Change the logged-in user's password
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AccountUserResponse"
 *       400:
 *         description: >-
 *           Validation failed, or `"Current password is not valid"`.
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
 */
router.post(
  "/forgot-password",
  forgotPasswordValidators,
  async (request, response) => {
    if (validateRequest(request, response)) {
      return;
    }

    return passwordResetService.requestPasswordReset(
      request.body.email,
      response
    );
  }
);

router.post(
  "/reset-password",
  resetPasswordWithTokenValidators,
  async (request, response) => {
    if (validateRequest(request, response)) {
      return;
    }

    const { token, newPassword } = request.body;

    return passwordResetService.resetPasswordWithToken(
      token,
      newPassword,
      response
    );
  }
);

router.post(
  "/account/resetPassword",
  authRateLimiter,
  authToken,
  resetPasswordValidators,
  async (request, response) => {
    if (validateRequest(request, response)) {
      return;
    }

    const { currentPassword, newPassword } = request.body;

    return authenticationService.resetPassword(
      request.user.userName,
      currentPassword,
      newPassword,
      response
    );
  }
);

module.exports = router;
