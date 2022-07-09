const TmdbClient = require("../client/tmdbClient");

const searchMovies = async (keyWord, response) => {
  const results = await TmdbClient.searchMovie(keyWord);

  return response.status(200).json({
    status: "success",
    data: {
      results,
    },
  });
};

const searchTvShows = async (keyWord, response) => {
  const results = await TmdbClient.searchTvShow(keyWord);

  return response.status(200).json({
    status: "success",
    data: {
      results,
    },
  });
};

module.exports = { searchMovies, searchTvShows };
