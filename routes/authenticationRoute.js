const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");

const authenticationService = require("../services/authenticationService");

require("dotenv").config();

router.get("/", async (request, response) => {
  response.status(200).json({ status: "UP" });
});

router.post(
  "/create-user",
  async (request, response) => {
    const { firstName, lastName, email, password, phoneNumber, userName } = request.body;

    const errors = validationResult(request);

    if (!errors.isEmpty()) {
      return response.status(400).json({
        errors: errors.array(),
      });
    }

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
  async (request, response) => {
    const { email, password } = request.body;

    const errors = validationResult(request);

    if (!errors.isEmpty()) {
      return response.status(400).json({
        errors: errors.array(),
      });
    }

    return authenticationService.login(
      email,
      password,
      response
    );
  }
);

module.exports = router;
