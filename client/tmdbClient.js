const { tmdbUrl } = require("../utils/utils");
const axios = require("axios");

const searchMovie = async (keyword, page = 1) => {
  try {
    const url =
      tmdbUrl +
      `/search/movie?api_key=${process.env.TMDB_TOKEN}&language=en-US` +
      `&query=${keyword}&page=${page}`;

    const result = await axios.get(url);
    const data = result.data?.results || [];
    const totalPages = result.data?.total_pages || 0;

    return { data, totalPages };
  } catch (error) {
    throw new Error(`TMDB movie search failed: ${error.message}`);
  }
};

const searchTvShow = async (keyword, page = 1) => {
  try {
    const url =
      tmdbUrl +
      `/search/tv?api_key=${process.env.TMDB_TOKEN}&query=${keyword}&language=en-US&page=${page}`;

    const result = await axios.get(url);
    const data = result.data?.results || [];
    const totalPages = result.data?.total_pages || 0;

    return { data, totalPages };
  } catch (error) {
    throw new Error(`TMDB TV search failed: ${error.message}`);
  }
};

const getCreditsById = async (tmdbId, type) => {
  try {
    const url =
      tmdbUrl +
      `/${type}/${tmdbId}/credits?api_key=${process.env.TMDB_TOKEN}&language=en-US`;

    const result = await axios.get(url);
    return result.data;
  } catch (error) {
    throw new Error(`TMDB credits request failed: ${error.message}`);
  }
};

const getDetailsById = async (tmdbId, type) => {
  try {
    const url =
      tmdbUrl +
      `/${type}/${tmdbId}?api_key=${process.env.TMDB_TOKEN}&language=en-US`;

    const result = await axios.get(url);
    return result.data;
  } catch (error) {
    throw new Error(`TMDB details request failed: ${error.message}`);
  }
};

const getPoster = async (posterPath) => {
  try {
    const url = `https://image.tmdb.org/t/p/w500${posterPath}`;
    const result = await axios.get(url);
    return result;
  } catch (error) {
    throw new Error(`TMDB poster request failed: ${error.message}`);
  }
};

module.exports = {
  searchMovie,
  searchTvShow,
  getDetailsById,
  getCreditsById,
  getPoster,
};
