const UsersModel = require("../repository/userModel");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");
const slackClient = require("../client/slackClient");
const { RATE_IT_DEV_LOGIN, dbToUIMapperUserModel} = require("../utils/utils");

const createNewUser = async (
  firstName,
  lastName,
  email,
  password,
  phoneNumber,
  userName,
  response
) => {
  let existingUserEmail = await UsersModel.findOne({ email: email });
  let existingUserName = await UsersModel.findOne({ user_name: userName });

  if (existingUserEmail) {
    return response.status(400).json({
      errors: [
        {
          msg: "This email is already being used",
        },
      ],
    });
  } else if (existingUserName) {
    return response.status(400).json({
      errors: [
        {
          msg: "This username is already being used",
        },
      ],
    });
  } else {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await new UsersModel({
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      email: email,
      user_name: userName,
      password: hashedPassword,
      is_active: true,
      is_admin: false,
      date_created: Date.now(),
      date_updated: Date.now(),
    }).save();

    const accessToken = await signJwtToken(newUser);

    slackClient.postMessage(
      `${userName} created a new account!`,
      process.env.SLACK_DEV_LOGIN_URL
    );

    return response.status(201).json({
      status: "success",
      accessToken,
      data: {
        user: dbToUIMapperUserModel(newUser),
      },
    });
  }
};

const login = async (email, password, response) => {
  let existingUser = await UsersModel.findOne({ email: email });

  if (existingUser) {
    let isMatch = await bcrypt.compare(password, existingUser.password);

    if (!isMatch) {
      return response.status(401).json({
        errors: [
          {
            msg: "Email or password is invalid",
          },
        ],
      });
    }

    const accessToken = await signJwtToken(existingUser);

    slackClient.postMessage(
      `${email} logged in!`,
      process.env.SLACK_DEV_LOGIN_URL
    );

    return response.status(200).json({
      status: "success",
      accessToken,
      data: {
        user: dbToUIMapperUserModel(existingUser)
      },
    });
  }

  return response.status(401).json({
    errors: [
      {
        msg: "Invalid credentials",
      },
    ],
  });
};

const signJwtToken = async (user) => {
  const accessToken = await JWT.sign(
    {
      email: user.email,
      userName: user.user_name,
      isAdmin: user.is_admin,
      id: user._id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "45m" }
  );

  return accessToken;
};

module.exports = { createNewUser, login };
