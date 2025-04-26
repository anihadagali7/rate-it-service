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

const searchByTrackArtist = async (keyWord, page = 1) => {
  const access_token = await getToken();
  const limit = 20;
  const offset = (page - 1) * limit;

  const api_url = `https://api.spotify.com/v1/search?q=${keyWord}&type=track&limit=${limit}&offset=${offset}`;

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

const searchTrackBySpotifyId = async (spotifyId) => {
  const access_token = await getToken();

  const api_url = `https://api.spotify.com/v1/tracks/${spotifyId}`;
  try {
    const response = await axios.get(encodeURI(api_url), {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.log(error);
  }
};

module.exports = { searchByTrackArtist, searchTrackBySpotifyId };
