const TmdbClient = require("../client/tmdbClient");
const SpotifyClient = require("../client/spotifyClient");
const UserModel = require("../repository/userModel");
const GoogleClient = require("../client/googleClient");
const { toPublicUsers } = require("../utils/userSerializer");
const { sendBadGateway } = require("../utils/httpErrors");

const searchMovies = async (keyWord, page, response) => {
  try {
    const results = await TmdbClient.searchMovie(keyWord, page);
    const mediaList = [];

    prepareMovieTvShowResults(results?.data || [], mediaList, "movie");

    return response.status(200).json({
      status: "success",
      data: {
        mediaList,
        totalPages: results?.totalPages || 0,
      },
      mediaType: "movie",
    });
  } catch (error) {
    return sendBadGateway(response, "Unable to search movies");
  }
};

const searchTvShows = async (keyWord, page, response) => {
  try {
    const results = await TmdbClient.searchTvShow(keyWord, page);
    const mediaList = [];

    prepareMovieTvShowResults(results?.data || [], mediaList, "tv");

    return response.status(200).json({
      status: "success",
      data: {
        mediaList,
        totalPages: results?.totalPages || 0,
      },
      mediaType: "tv",
    });
  } catch (error) {
    return sendBadGateway(response, "Unable to search TV shows");
  }
};

const searchMusic = async (keyWord, page, response) => {
  try {
    const results = await SpotifyClient.searchByTrackArtist(keyWord, page);
    const mediaList = [];

    prepareMusicResults(results?.items || [], mediaList);

    return response.status(200).json({
      status: "success",
      data: {
        mediaList,
        totalPages: Math.ceil((results?.total || 0) / 20),
      },
      mediaType: "music",
    });
  } catch (error) {
    return sendBadGateway(response, "Unable to search music");
  }
};

const searchUsers = async (keyWord, response) => {
  const getAllUsers = await UserModel.find();

  const updatedList = getAllUsers.filter((user) => {
    return (
      user.userName.toLowerCase().search(keyWord.toLowerCase()) !== -1 ||
      user.firstName.toLowerCase().search(keyWord.toLowerCase()) !== -1
    );
  });

  return response.status(200).json({
    status: "success",
    data: {
      mediaList: toPublicUsers(updatedList),
    },
    mediaType: "user",
  });
};

const searchBooks = async (keyWord, page, response) => {
  try {
    const results = await GoogleClient.searchForBooks(keyWord, page);
    const mediaList = [];

    prepareBookResults(results?.items || [], mediaList);

    return response.status(200).json({
      status: "success",
      data: {
        mediaList,
        totalPages: Math.ceil((results?.totalItems || 0) / 20),
      },
      mediaType: "book",
    });
  } catch (error) {
    return sendBadGateway(response, "Unable to search books");
  }
};

const searchAllMedia = async (keyWord, response) => {
  const [movieList, tvShowList, musicList, bookList] = await Promise.all([
    TmdbClient.searchMovie(keyWord).catch(() => null),
    TmdbClient.searchTvShow(keyWord).catch(() => null),
    SpotifyClient.searchByTrackArtist(keyWord).catch(() => null),
    GoogleClient.searchForBooks(keyWord).catch(() => null),
  ]);

  const movieResults = [];
  const tvResults = [];
  const musicResults = [];
  const bookResults = [];

  (movieList?.data || []).forEach((movie) => {
    movieResults.push(buildMovieTvResult(movie, "movie"));
  });

  (tvShowList?.data || []).forEach((tv) => {
    tvResults.push(buildMovieTvResult(tv, "tv"));
  });

  (musicList?.items || []).forEach((music) => {
    musicResults.push(buildMusicResult(music));
  });

  (bookList?.items || []).forEach((book) => {
    bookResults.push(buildBookResult(book));
  });

  return response.status(200).json({
    status: "success",
    data: {
      fullSearchList: {
        movie: movieResults,
        tv: tvResults,
        music: musicResults,
        book: bookResults,
      },
    },
  });
};

const prepareMovieTvShowResults = (results, fullSearchList, mediaType) => {
  (results || []).forEach((media) => {
    fullSearchList.push(buildMovieTvResult(media, mediaType));
  });
};

const prepareMusicResults = (results, fullSearchList) => {
  (results || []).forEach((song) => {
    fullSearchList.push(buildMusicResult(song));
  });
};

const prepareBookResults = (results, fullSearchList) => {
  (results || []).forEach((book) => {
    fullSearchList.push(buildBookResult(book));
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
  const albumType = song?.album?.albumType;
  const albumName = song?.album?.name;
  const imageList = song?.album?.images || [];
  const artistsList = song?.artists || [];

  const artists = [];
  let imageUrl;

  artistsList.forEach((artist) => {
    artists.push(artist.name);
  });

  imageList.forEach((image) => {
    if (image.height == 640) {
      imageUrl = image.url;
    }
  });

  return {
    albumType,
    albumName,
    name: song?.name,
    mediaId: song?.id,
    poster: imageUrl,
    artists: artists.join(),
    mediaType: "music",
  };
}

function buildMovieTvResult(media, mediaType) {
  let posterUrl = "";
  if (media.poster_path) {
    posterUrl = `https://image.tmdb.org/t/p/w500${media.poster_path}`;
  }

  return {
    mediaId: media.id,
    name: mediaType === "movie" ? media.original_title : media.name,
    description: media.overview,
    poster: posterUrl,
    mediaType: mediaType,
  };
}
