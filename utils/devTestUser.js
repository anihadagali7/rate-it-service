const crypto = require("crypto");
const bcrypt = require("bcrypt");
const UsersModel = require("../repository/userModel");
const { signJwtToken } = require("../services/authenticationService");

const DEV_TEST_USER = {
  userName: "agent-test-user",
  email: "agent-test-user@example.com",
  firstName: "Agent",
  lastName: "Test",
};

const DEV_ONLY_MESSAGE =
  'Refusing to run: APP_ENV must be "dev". This script writes a test user, so it ' +
  "only runs against the dev database.";

const assertDevEnvironment = (appEnv = process.env.APP_ENV) => {
  if (appEnv !== "dev") {
    throw new Error(DEV_ONLY_MESSAGE);
  }
};

// Creates or refreshes the dev test user and returns a login token for it.
// The password is random and never stored in plain text or printed, so the
// account can only be used through the returned token.
const ensureDevTestUser = async () => {
  assertDevEnvironment();

  const unusablePassword = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    10
  );
  const now = Date.now();

  const user = await UsersModel.findOneAndUpdate(
    { email: DEV_TEST_USER.email },
    {
      $set: {
        userName: DEV_TEST_USER.userName,
        firstName: DEV_TEST_USER.firstName,
        lastName: DEV_TEST_USER.lastName,
        isActive: true,
        isAdmin: false,
        isEmailVerified: true,
        dateUpdated: now,
      },
      $setOnInsert: {
        password: unusablePassword,
        followers: [],
        following: [],
        dateCreated: now,
      },
    },
    { upsert: true, new: true }
  );

  return {
    userName: user.userName,
    accessToken: await signJwtToken(user),
  };
};

module.exports = {
  DEV_TEST_USER,
  DEV_ONLY_MESSAGE,
  assertDevEnvironment,
  ensureDevTestUser,
};
