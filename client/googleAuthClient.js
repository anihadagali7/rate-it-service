const { OAuth2Client } = require("google-auth-library");

const client_id = process.env.GOOGLE_OAUTH_CLIENT_ID;
const client_secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

const oAuth2Client = new OAuth2Client(client_id, client_secret);

const getGoogleProfileFromCode = async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken({
      code,
      redirect_uri: "postmessage",
    });

    const ticket = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: client_id,
    });

    const payload = ticket.getPayload();

    return {
      providerId: payload.sub,
      email: payload.email,
      emailVerified: !!payload.email_verified,
      firstName: payload.given_name,
      lastName: payload.family_name,
      picture: payload.picture,
    };
  } catch (error) {
    throw new Error(`Google authentication failed: ${error.message}`);
  }
};

module.exports = { getGoogleProfileFromCode };
