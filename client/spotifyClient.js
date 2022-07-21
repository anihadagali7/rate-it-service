const axios = require("axios");
const qs = require("qs");

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const auth_token = Buffer.from(
  `${client_id}:${client_secret}`,
  "utf-8"
).toString("base64");

const getToken = async () => {
  try {
    console.log("token ", auth_token);
    const token_url = "https://accounts.spotify.com/api/token";
    const data = qs.stringify({ grant_type: "client_credentials" });

    const response = await axios.post(token_url, data, {
      headers: {
        Authorization: `Basic ${auth_token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.log(error);
  }
};

const searchByTrackArtist = async (keyWord) => {
  const access_token = await getToken();

  const api_url = `https://api.spotify.com/v1/search?q=${keyWord}&type=track&limit=10&offset=5`;
  try {
    const response = await axios.get(encodeURI(api_url), {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    return response.data.tracks;
  } catch (error) {
    console.log(error);
  }
};

module.exports = { searchByTrackArtist };
