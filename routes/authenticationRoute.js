const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const JWT = require("jsonwebtoken");
const authenticationService = require("../services/authenticationService");

require("dotenv").config();

router.get("/", async (request, response) => {
  response.status(200).json({ status: "UP" });
});

router.post(
  "/create-user",
  [
    check("email", "Invalid email").isEmail(),
    check("password", "Password must be at least 6 characters long").isLength({
      min: 6,
    }),
  ],
  async (request, response) => {
    console.log("inside the controller")
    const { firstName, lastName, email, password, phoneNumber } = request.body;

    const errors = validationResult(request);

    if (!errors.isEmpty()) {
      return response.status(400).json({
        errors: errors.array(),
      });
    }

    const newUser = authenticationService.createNewUser(
      firstName,
      lastName,
      email,
      password,
      phoneNumber
    );

    const accessToken = await JWT.sign(
      { email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "10s",
      }
    );

    response.status(201).json({
      status: "success",
      accessToken,
      data: {
        newUser,
      },
    });
  }
);

router.get(
  "/login",
  [
    check("email", "Invalid email").isEmail(),
    check("password", "Password must be at least 6 characters long").isLength({
      min: 6,
    }),
  ],
  async (request, response) => {
    const { email, password } = request.body;

    const errors = validationResult(request);

    if (!errors.isEmpty()) {
      return response.status(400).json({
        errors: errors.array(),
      });
    }

    const newUser = authenticationService.createNewUser(
      firstName,
      lastName,
      email,
      password,
      phoneNumber
    );
    const accessToken = await JWT.sign(
      { email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "10s",
      }
    );

    response.status(201).json({
      status: "success",
      token,
      data: {
        newUser,
      },
    });
  }
);

module.exports = router;
