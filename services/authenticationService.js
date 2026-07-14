const UsersModel = require("../repository/userModel");
const JWT = require("jsonwebtoken");
const slackClient = require("../client/slackClient");
const bcrypt = require("bcrypt");
const { toPublicUser } = require("../utils/userSerializer");
const { sendNotFound, sendError } = require("../utils/httpErrors");

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
    return sendError(response, 400, "This email is already being used");
  } else if (existingUserName) {
    return sendError(response, 400, "This username is already being used");
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
        user: toPublicUser(newUser),
      },
    });
  }
};

const login = async (email, password, response) => {
  let existingUser = await UsersModel.findOne({ email: email }).select(
    "+password"
  );

  if (existingUser) {
    let isMatch = await bcrypt.compare(password, existingUser.password);

    if (!isMatch) {
      return sendError(response, 401, "Email or password is invalid");
    }

    const accessToken = await signJwtToken(existingUser);

    slackClient.postMessage(`${email} logged in!`, process.env.SLACK_LOGIN_URL);

    return response.status(200).json({
      status: "success",
      accessToken,
      data: {
        user: toPublicUser(existingUser),
      },
    });
  }

  return sendError(response, 401, "Invalid email");
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

const resetPassword = async (
  userName,
  currentPassword,
  newPassword,
  response
) => {
  let existingUser = await UsersModel.findOne({ userName: userName }).select(
    "+password"
  );

  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  let isMatch = await bcrypt.compare(currentPassword, existingUser.password);

  if (!isMatch) {
    return sendError(response, 400, "Current password is not valid");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const updateExistingUser = await UsersModel.findOneAndUpdate(
    {
      userName: userName,
    },
    {
      password: hashedPassword,
      dateUpdated: Date.now(),
    },
    {
      new: true,
    }
  );

  return response.status(200).json({
    status: "success",
    data: {
      user: toPublicUser(updateExistingUser),
    },
  });
};

module.exports = { createNewUser, login, resetPassword };
