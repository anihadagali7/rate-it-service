const UsersModel = require("../repository/userModel");
const slackClient = require("../client/slackClient");
const googleAuthClient = require("../client/googleAuthClient");
const facebookAuthClient = require("../client/facebookAuthClient");
const appleAuthClient = require("../client/appleAuthClient");
const { signJwtToken } = require("./authenticationService");
const { toAccountUser } = require("../utils/userSerializer");
const { sendError } = require("../utils/httpErrors");

const respondWithUser = async (user, status, response) => {
  const accessToken = await signJwtToken(user);

  return response.status(status).json({
    status: "success",
    accessToken,
    data: {
      user: toAccountUser(user),
    },
  });
};

const findOrCreateSocialUser = async (
  { providerIdField, providerId, email, emailVerified, firstName, lastName, picture },
  response
) => {
  let user = await UsersModel.findOne({ [providerIdField]: providerId });

  if (user) {
    return respondWithUser(user, 200, response);
  }

  if (email) {
    const existingByEmail = await UsersModel.findOne({ email });

    if (existingByEmail) {
      // Only trust the provider's email as proof of ownership for linking
      // if the provider itself vouches it's verified — an unverified email
      // is not safe proof of account ownership. `email` is unique across
      // all users, so we can't silently create a second account with it
      // either; the only safe options are link (verified) or reject
      // (unverified).
      if (!emailVerified) {
        return sendError(
          response,
          409,
          "This email is already associated with an account. Sign in with your password, or verify this email with your provider first."
        );
      }

      existingByEmail[providerIdField] = providerId;
      existingByEmail.picture = existingByEmail.picture || picture;
      existingByEmail.dateUpdated = Date.now();
      await existingByEmail.save();

      return respondWithUser(existingByEmail, 200, response);
    }
  }

  const newUser = await new UsersModel({
    firstName: firstName || "",
    lastName: lastName || "",
    email,
    picture,
    [providerIdField]: providerId,
    isActive: true,
    isAdmin: false,
    dateCreated: Date.now(),
    dateUpdated: Date.now(),
    // userName intentionally omitted so the sparse unique index allows this
    // document to coexist with other not-yet-onboarded users.
  }).save();

  slackClient.postMessage(
    `New social sign-up via ${providerIdField.replace("Id", "")}!`,
    process.env.SLACK_LOGIN_URL
  );

  return respondWithUser(newUser, 201, response);
};

const googleLogin = async (code, response) => {
  let profile;
  try {
    profile = await googleAuthClient.getGoogleProfileFromCode(code);
  } catch (error) {
    return sendError(response, 401, "Google authentication failed");
  }

  return findOrCreateSocialUser(
    { providerIdField: "googleId", providerId: profile.providerId, ...profile },
    response
  );
};

const facebookLogin = async (accessToken, response) => {
  let profile;
  try {
    profile = await facebookAuthClient.getFacebookProfile(accessToken);
  } catch (error) {
    return sendError(response, 401, "Facebook authentication failed");
  }

  return findOrCreateSocialUser(
    { providerIdField: "facebookId", providerId: profile.providerId, ...profile },
    response
  );
};

const appleLogin = async (identityToken, appleUser, response) => {
  let profile;
  try {
    profile = await appleAuthClient.verifyIdentityToken(identityToken);
  } catch (error) {
    return sendError(response, 401, "Apple authentication failed");
  }

  // Apple only ever sends the user's name on the very first authorization.
  // `findOrCreateSocialUser` only reads `firstName`/`lastName` on its
  // brand-new-user branch, so passing them through unconditionally here is
  // safe — a returning or newly-linked user never has them applied.
  return findOrCreateSocialUser(
    {
      providerIdField: "appleId",
      providerId: profile.providerId,
      email: profile.email,
      emailVerified: profile.emailVerified,
      firstName: appleUser?.name?.firstName,
      lastName: appleUser?.name?.lastName,
    },
    response
  );
};

module.exports = { googleLogin, facebookLogin, appleLogin };
