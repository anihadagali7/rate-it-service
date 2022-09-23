const UsersModel = require("../repository/userModel");
const JWT = require("jsonwebtoken");
const slackClient = require("../client/slackClient");
const bcrypt = require("bcrypt");

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
  let existingUserName = await UsersModel.findOne({ userName: userName });

  if (existingUserEmail) {
    return response.status(400).json({
      errors: {
        msg: "This email is already being used",
      }
    });
  } else if (existingUserName) {
    return response.status(400).json({
      errors: {
        msg: "This username is already being used",
      }
    });
  } else {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await new UsersModel({
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      email: email,
      userName: userName,
      password: hashedPassword,
      isActive: true,
      isAdmin: false,
      dateCreated: Date.now(),
      dateUpdated: Date.now(),
    }).save();

    const accessToken = await signJwtToken(newUser);

    slackClient.postMessage(
      `${userName} created a new account!`,
      process.env.SLACK_LOGIN_URL
    );

    return response.status(201).json({
      status: "success",
      accessToken,
      data: {
        user: newUser,
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
        errors:{
          msg: "Email or password is invalid",
        }
      });
    }

    const accessToken = await signJwtToken(existingUser);

    slackClient.postMessage(
      `${email} logged in!`,
      process.env.SLACK_LOGIN_URL
    );

    return response.status(200).json({
      status: "success",
      accessToken,
      data: {
        user: existingUser
      },
    });
  }

  return response.status(401).json({
    errors: {
      msg: "Invalid email",
    },
  });
};

const signJwtToken = async (user) => {
  const accessToken = await JWT.sign(
    {
      email: user.email,
      userName: user.userName,
      isAdmin: user.isAdmin,
      id: user._id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "365d" }
  );

  return accessToken;
};

module.exports = { createNewUser, login };
