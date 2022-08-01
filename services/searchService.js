const { response } = require("express");
const TmdbClient = require("../client/tmdbClient");
const SpotifyClient = require("../client/spotifyClient");

const searchMovies = async (keyWord, response) => {
  const results = await TmdbClient.searchMovie(keyWord);
  const mediaList = [];

  results.forEach((movie) => {
    let posterUrl = "";
    if (movie.poster_path) {
      posterUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    }

    let searchMovie = {
      mediaId: movie.id,
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
    mediaType: 'movie'
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
      mediaId: tvShow.id,
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
    mediaType: 'tv'
  });
};

const searchMusic = async (keyWord, response) => {
  const results = await SpotifyClient.searchByTrackArtist(keyWord);
  let mediaList = [];

  results.items.forEach((song) => {
    let albumType = song.album.albumType;
    let albumName = song.album.name;
    let imageList = song.album.images;
    let artistsList = song.artists;

    let artists = [];
    let imageUrl;

    artistsList.forEach((artist) => {
      artists.push(artist.name);
    });

    imageList.forEach((image) => {
      if (image.height == 640) {
        imageUrl = image.url;
      }
    });

    let musicTitle = {
      albumType,
      albumName,
      name: song.name,
      mediaId: song.id,
      poster: imageUrl,
      artists: artists.join(),
    };

    mediaList.push(musicTitle);
  });

  return response.status(200).json({
    status: "success",
    data: {
      mediaList,
    },
    mediaType: 'music'
  });
};

module.exports = { searchMovies, searchTvShows, searchMusic };
