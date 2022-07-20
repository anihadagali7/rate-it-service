const TmdbClient = require("../client/tmdbClient");

const searchMovies = async (keyWord, response) => {
  const results = await TmdbClient.searchMovie(keyWord);
  const movieList = [];

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
    movieList.push(searchMovie);
  });

  return response.status(200).json({
    status: "success",
    data: {
      movieList,
    },
  });
};

const searchTvShows = async (keyWord, response) => {
  const results = await TmdbClient.searchTvShow(keyWord);
  const tvShowList = [];

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
    tvShowList.push(searchTvShow);
  });

  return response.status(200).json({
    status: "success",
    data: {
      tvShowList,
    },
  });
};

module.exports = { searchMovies, searchTvShows };
