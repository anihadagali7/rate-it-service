const axios = require("axios");

const app_id = process.env.FACEBOOK_APP_ID;
const app_secret = process.env.FACEBOOK_APP_SECRET;

const getFacebookProfile = async (accessToken) => {
  try {
    const appAccessToken = `${app_id}|${app_secret}`;

    const debugResponse = await axios.get(
      "https://graph.facebook.com/debug_token",
      {
        params: {
          input_token: accessToken,
          access_token: appAccessToken,
        },
      }
    );

    const { is_valid, app_id: tokenAppId } = debugResponse.data.data || {};

    if (!is_valid || tokenAppId !== app_id) {
      throw new Error("token failed verification");
    }

    const profileResponse = await axios.get("https://graph.facebook.com/me", {
      params: {
        fields: "id,first_name,last_name,email,picture",
        access_token: accessToken,
      },
    });

    const profile = profileResponse.data;

    return {
      providerId: profile.id,
      email: profile.email,
      // Facebook's Graph API only ever returns `email` once it has been verified.
      emailVerified: !!profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      picture: profile.picture?.data?.url,
    };
  } catch (error) {
    throw new Error(`Facebook authentication failed: ${error.message}`);
  }
};

module.exports = { getFacebookProfile };
