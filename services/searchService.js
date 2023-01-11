const { response } = require("express");
const TmdbClient = require("../client/tmdbClient");
const SpotifyClient = require("../client/spotifyClient");
const UserModel = require("../repository/userModel");
const GoogleClient = require("../client/googleClient");

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

const searchUsers = async (keyWord, response) => {
  let getAllUsers = await UserModel.find();

  const updatedList = getAllUsers.filter(user => {
    return (
        user.userName.toLowerCase().search(keyWord.toLowerCase()) !== -1 ||
        user.firstName.toLowerCase().search(keyWord.toLowerCase()) !== -1
    );
  });

  return response.status(200).json({
    status: "success",
    data: {
      mediaList: updatedList,
    },
    mediaType: 'user'
  });
};

const searchBooks = async (keyWord, response) => {
  const results = await GoogleClient.searchForBooks(keyWord);
  const mediaList = [];

  results.forEach((book) => {
    let searchBook = {
      mediaId: book.id,
      name: book.volumeInfo.title,
      author: book.volumeInfo.authors.join(),
      description: book.volumeInfo.description,
      poster: book.volumeInfo.imageLinks.thumbnail,
    };
    mediaList.push(searchBook);
  });

  return response.status(200).json({
    status: "success",
    data: {
      mediaList,
    },
    mediaType: 'book'
  });
};

module.exports = { searchMovies, searchTvShows, searchMusic, searchUsers, searchBooks };
