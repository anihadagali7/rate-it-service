const TmdbClient = require("../client/tmdbClient");

const searchMovies = async (keyWord, response) => {
  const results = await TmdbClient.searchMovie(keyWord);
  const mediaList = [];

  results.forEach((movie) => {
    let posterUrl = "";
    if (movie.poster_path) {
      posterUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    }

    let searchMovie = {
      tmdbId: movie.id,
      name: movie.original_title,
      description: movie.overview,
      poster: posterUrl,
    };
    mediaList.push(searchMovie);
  });

  return response.status(200).json({
    status: "success",
    data: {
      mediaList,
    },
  });
};

const searchTvShows = async (keyWord, response) => {
  const results = await TmdbClient.searchTvShow(keyWord);
  const mediaList = [];

  results.forEach((tvShow) => {
    let posterUrl = "";
    if (tvShow.poster_path) {
      posterUrl = `https://image.tmdb.org/t/p/w500${tvShow.poster_path}`;
    }

    let searchTvShow = {
      tmdbId: tvShow.id,
      name: tvShow.name,
      description: tvShow.overview,
      poster: posterUrl,
    };
    mediaList.push(searchTvShow);
  });

  return response.status(200).json({
    status: "success",
    data: {
      mediaList,
    },
  });
};

module.exports = { searchMovies, searchTvShows };
