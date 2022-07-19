const TmdbClient = require("../client/tmdbClient");

const searchMovies = async (keyWord, response) => {
  const results = await TmdbClient.searchMovie(keyWord);
  const movieList = [];

  for (let i = 0; i < results.length; i++) {
    let movie = results[i];
    let posterUrl;
    if (movie.poster_path) {
      posterUrl = await TmdbClient.getPoster(movie.poster_path);
    }

    let searchMovie = {
      tmdbId: movie.id,
      name: movie.original_title,
      description: movie.overview,
      poster: posterUrl ? posterUrl.data : "",
    };
    movieList.push(searchMovie);
  }

  return response.status(200).json({
    status: "success",
    data: {
      movieList,
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
