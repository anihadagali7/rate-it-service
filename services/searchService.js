const { response } = require("express");
const TmdbClient = require("../client/tmdbClient");
const SpotifyClient = require("../client/spotifyClient");
const UserModel = require("../repository/userModel");
const GoogleClient = require("../client/googleClient");

const searchMovies = async (keyWord, response) => {
  const results = await TmdbClient.searchMovie(keyWord);
  const mediaList = [];

  await prepareMovieTvShowResults(results, mediaList, "movie");

  return response.status(200).json({
    status: "success",
    data: {
      mediaList,
    },
    mediaType: "movie",
  });
};

const searchTvShows = async (keyWord, response) => {
  const results = await TmdbClient.searchTvShow(keyWord);
  const mediaList = [];

  await prepareMovieTvShowResults(results, mediaList, "tv");

  return response.status(200).json({
    status: "success",
    data: {
      mediaList,
    },
    mediaType: "tv",
  });
};

const searchMusic = async (keyWord, response) => {
  const results = await SpotifyClient.searchByTrackArtist(keyWord);
  let mediaList = [];

  await prepareMusicResults(results, mediaList);

  return response.status(200).json({
    status: "success",
    data: {
      mediaList,
    },
    mediaType: "music",
  });
};

const searchUsers = async (keyWord, response) => {
  let getAllUsers = await UserModel.find();

  const updatedList = getAllUsers.filter((user) => {
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
    mediaType: "user",
  });
};

const searchBooks = async (keyWord, response) => {
  const results = await GoogleClient.searchForBooks(keyWord);
  const mediaList = [];

  await prepareBookResults(results, mediaList);

  return response.status(200).json({
    status: "success",
    data: {
      mediaList,
    },
    mediaType: "book",
  });
};

const searchAllMedia = async (keyWord, response) => {
  const movieList = await TmdbClient.searchMovie(keyWord);
  const tvShowList = await TmdbClient.searchTvShow(keyWord);
  const musicList = await SpotifyClient.searchByTrackArtist(keyWord);
  const bookList = await GoogleClient.searchForBooks(keyWord);

  let fullSearchList = {};

  let movieResults = [];
  let tvResults = [];
  let musicResults = [];
  let bookResults = [];

  movieList &&
    movieList.forEach((movie) => {
      let result = buildMovieTvResult(movie, "movie");
      movieResults.push(result);
    });

  tvShowList &&
    tvShowList.forEach((tv) => {
      let result = buildMovieTvResult(tv, "tv");
      tvResults.push(result);
    });

  musicList &&
    musicList.items &&
    musicList.items.length > 0 &&
    musicList.items.forEach((music) => {
      let result = buildMusicResult(music);
      musicResults.push(result);
    });

  bookList &&
    bookList.forEach((book) => {
      let result = buildBookResult(book);
      bookResults.push(result);
    });

  fullSearchList["movie"] = movieResults;
  fullSearchList["tv"] = tvResults;
  fullSearchList["music"] = musicResults;
  fullSearchList["book"] = bookResults;

  return response.status(200).json({
    status: "success",
    data: {
      fullSearchList,
    },
  });
};

const prepareMovieTvShowResults = async (
  results,
  fullSearchList,
  mediaType
) => {
  results.forEach((media) => {
    let searchMovie = buildMovieTvResult(media, mediaType);
    fullSearchList.push(searchMovie);
  });
};

const prepareMusicResults = async (results, fullSearchList) => {
  results.items.forEach((song) => {
    let searchMusic = buildMusicResult(song);

    fullSearchList.push(searchMusic);
  });
};

const prepareBookResults = async (results, fullSearchList) => {
  results.forEach((book) => {
    let searchBook = buildBookResult(book);
    fullSearchList.push(searchBook);
  });
};

module.exports = {
  searchMovies,
  searchTvShows,
  searchMusic,
  searchUsers,
  searchBooks,
  searchAllMedia,
};

function buildBookResult(book) {
  return {
    mediaId: book?.id,
    name: book?.volumeInfo?.title,
    author: book?.volumeInfo?.authors?.join(),
    description: book?.volumeInfo?.description,
    poster: book?.volumeInfo?.imageLinks?.thumbnail,
    mediaType: "book",
  };
}

function buildMusicResult(song) {
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
    mediaType: "music",
  };
  return musicTitle;
}

function buildMovieTvResult(media, mediaType) {
  let posterUrl = "";
  if (media.poster_path) {
    posterUrl = `https://image.tmdb.org/t/p/w500${media.poster_path}`;
  }

  let searchMovie = {
    mediaId: media.id,
    name: mediaType === "movie" ? media.original_title : media.name,
    description: media.overview,
    poster: posterUrl,
    mediaType: mediaType,
  };
  return searchMovie;
}
