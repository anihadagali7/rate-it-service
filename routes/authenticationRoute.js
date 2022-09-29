const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const authenticationService = require("../services/authenticationService");
const path = require('node:path');

require("dotenv").config();

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '/uploads/'));
    },
    filename: function(req, file, cb) {
        cb(null, new Date().toISOString() + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    // reject a file
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
});

router.get("/", async (request, response) => {
  response.status(200).json({ status: "UP" });
});

router.post(
  "/create-user", upload.single('profilePicture'),
  async (request, response) => {
    const { firstName, lastName, email, password, phoneNumber, userName } = request.body;
    const profilePicture = request.file.path;

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
      profilePicture,
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
