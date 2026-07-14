const axios = require("axios");
const qs = require("qs");

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const auth_token = Buffer.from(
  `${client_id}:${client_secret}`,
  "utf-8"
).toString("base64");

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
const DEFAULT_TOKEN_TTL_MS = 3600 * 1000;

let cachedToken = null;
let tokenExpiresAt = 0;
let inFlightTokenRequest = null;

const clearTokenCache = () => {
  cachedToken = null;
  tokenExpiresAt = 0;
  inFlightTokenRequest = null;
};

const fetchTokenFromSpotify = async () => {
  const token_url = "https://accounts.spotify.com/api/token";
  const data = qs.stringify({ grant_type: "client_credentials" });

  const response = await axios.post(token_url, data, {
    headers: {
      Authorization: `Basic ${auth_token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  cachedToken = response.data.access_token;
  const expiresInMs = (response.data.expires_in || 3600) * 1000;
  tokenExpiresAt = Date.now() + expiresInMs;

  return cachedToken;
};

const getToken = async () => {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) {
    return cachedToken;
  }

  if (inFlightTokenRequest) {
    return inFlightTokenRequest;
  }

  try {
    inFlightTokenRequest = fetchTokenFromSpotify();
    return await inFlightTokenRequest;
  } catch (error) {
    throw new Error(`Spotify auth failed: ${error.message}`);
  } finally {
    inFlightTokenRequest = null;
  }
};

const searchByTrackArtist = async (keyWord, page = 1) => {
  try {
    const access_token = await getToken();
    const limit = 20;
    const offset = (page - 1) * limit;
    const api_url = `https://api.spotify.com/v1/search?q=${keyWord}&type=track&limit=${limit}&offset=${offset}`;

    const response = await axios.get(encodeURI(api_url), {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    return response.data.tracks;
  } catch (error) {
    throw new Error(`Spotify search failed: ${error.message}`);
  }
};

const searchTrackBySpotifyId = async (spotifyId) => {
  try {
    const access_token = await getToken();
    const api_url = `https://api.spotify.com/v1/tracks/${spotifyId}`;

    const response = await axios.get(encodeURI(api_url), {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(`Spotify track lookup failed: ${error.message}`);
  }
};

module.exports = {
  searchByTrackArtist,
  searchTrackBySpotifyId,
  clearTokenCache,
};
