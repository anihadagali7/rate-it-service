const { tmdbUrl } = require("../utils/utils");
const axios = require("axios");

const searchMovie = async (keyword) => {
  const url =
      tmdbUrl + `/movie?api_key=${process.env.TMDB_TOKEN}` + `&query=${keyword}`;

  const result = await axios.get(url);

  return result.data.results;
};


const searchTvShow = async (keyword) => {
  const url =
    tmdbUrl + `/tv?api_key=${process.env.TMDB_TOKEN}` + `&query=${keyword}`;

  const result = await axios.get(url);

  return result.data.results;
};

module.exports = { searchMovie, searchTvShow };
