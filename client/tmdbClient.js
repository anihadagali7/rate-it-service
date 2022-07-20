const { tmdbUrl } = require("../utils/utils");
const axios = require("axios");

const searchMovie = async (keyword) => {
  const url =
    tmdbUrl +
    `/search/movie?api_key=${process.env.TMDB_TOKEN}&language=en-US` +
    `&query=${keyword}`;

  const result = await axios.get(url);

  return result.data.results;
};

const searchTvShow = async (keyword) => {
  const url =
    tmdbUrl +
    `/search/tv?api_key=${process.env.TMDB_TOKEN}&query=${keyword}&language=en-US`;

  const result = await axios.get(url);

  return result.data.results;
};

const getCreditsById = async (tmdbId, type) => {
  const url =
    tmdbUrl +
    `/${type}/${tmdbId}/credits?api_key=${process.env.TMDB_TOKEN}&language=en-US`;

  const result = await axios.get(url);

  return result.data;
};

const getDetailsById = async (tmdbId, type) => {
  const url =
    tmdbUrl +
    `/${type}/${tmdbId}?api_key=${process.env.TMDB_TOKEN}&language=en-US`;

  const result = await axios.get(url);

  return result.data;
};

const getPoster = async (posterPath) => {
  const url = `https://image.tmdb.org/t/p/w500${posterPath}`;

  const result = await axios.get(url);

  return result;
};

module.exports = {
  searchMovie,
  searchTvShow,
  getDetailsById,
  getCreditsById,
  getPoster,
};
