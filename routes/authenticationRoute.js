const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");

const authenticationService = require("../services/authenticationService");
const authToken = require("../middleware/authenticateToken");
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

router.get("/", async (request, response) => {
  response.status(200).json({ status: "UP" });
});

router.post("/create-user", createUserValidators, async (request, response) => {
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
});

router.post("/login", loginValidators, async (request, response) => {
  if (validateRequest(request, response)) {
    return;
  }

  const { email, password } = request.body;

  return authenticationService.login(email, password, response);
});

router.post(
  "/account/resetPassword",
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
