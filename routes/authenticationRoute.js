const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");

const authenticationService = require("../services/authenticationService");
const socialAuthService = require("../services/socialAuthService");
const emailVerificationService = require("../services/emailVerificationService");
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

router.get("/", async (request, response) => {
  response.status(200).json({ status: "UP" });
});

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
