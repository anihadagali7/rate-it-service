const MediaModel = require("../repository/mediaModel");
const slackClient = require("../client/slackClient");
const tmdbClient = require("../client/tmdbClient");
const spotifyClient = require("../client/spotifyClient");
const googleClient = require("../client/googleClient");
const { sendNotFound, sendBadGateway } = require("../utils/httpErrors");

const createNewMedia = async (media, response) => {
  const newMedia = await new MediaModel(media).save();

  slackClient.postMessage(
    `${newMedia.name} - ${newMedia.mediaType} has just been added!`,
    process.env.SLACK_MEDIA_URL
  );

  return response.status(201).json({
    status: "success",
    data: {
      media: newMedia,
    },
  });
};

const getMovieTvShowDetails = async (tmdbId, mediaType, response) => {
  const existingMedia = await MediaModel.findOne({
    mediaId: tmdbId,
    mediaType: mediaType === "movie" ? "MOVIE" : "TV",
  });

  if (existingMedia) {
    return response.status(200).json({
      status: "success",
      data: {
        media: existingMedia,
      },
    });
  }

  try {
    const mediaDetails = await tmdbClient.getDetailsById(tmdbId, mediaType);
    const mediaCast = await tmdbClient.getCreditsById(tmdbId, mediaType);

    if (!mediaDetails || !mediaDetails.id) {
      return sendNotFound(response, "Media not found");
    }

    const movieToBeAdded = {};

    if (mediaType === "movie") {
      movieToBeAdded.name = mediaDetails.original_title;
      movieToBeAdded.dateReleased = mediaDetails.release_date;
    } else {
      movieToBeAdded.name = mediaDetails.original_name;
      movieToBeAdded.dateReleased = mediaDetails.first_air_date;
    }

    movieToBeAdded.description = mediaDetails.overview;
    movieToBeAdded.tagLine = mediaDetails.tagline;
    movieToBeAdded.mediaId = mediaDetails.id;
    movieToBeAdded.mediaType = mediaType.toUpperCase();

    if (mediaDetails.poster_path) {
      movieToBeAdded.picture = `https://image.tmdb.org/t/p/w500${mediaDetails.poster_path}`;
    }

    let castList = [];
    let directorList = [];
    let producerList = [];

    (mediaCast?.cast || []).forEach((cast) => {
      if (cast.known_for_department === "Acting") {
        castList.push(cast.name);
      }
      if (cast.known_for_department === "Directing") {
        directorList.push(cast.name);
      }
      if (cast.known_for_department === "Production") {
        producerList.push(cast.name);
      }
    });

    (mediaCast?.crew || []).forEach((cast) => {
      if (cast.job === "Executive Producer") {
        producerList.push(cast.name);
      }
      if (cast.known_for_department === "Directing") {
        directorList.push(cast.name);
      }
      if (cast.known_for_department === "Production") {
        producerList.push(cast.name);
      }
    });

    castList = castList.slice(0, 4);
    producerList = producerList.slice(0, 4);
    directorList = directorList.slice(0, 4);

    movieToBeAdded.cast = [...new Set(castList)];
    movieToBeAdded.director = [...new Set(directorList)];
    movieToBeAdded.producer = [...new Set(producerList)];

    return createNewMedia(movieToBeAdded, response);
  } catch (error) {
    return sendBadGateway(response, "Unable to fetch media details from TMDB");
  }
};

const getMusicDetails = async (spotifyId, response) => {
  const existingMedia = await MediaModel.findOne({
    mediaId: spotifyId,
    mediaType: "MUSIC",
  });

  if (existingMedia) {
    return response.status(200).json({
      status: "success",
      data: {
        media: existingMedia,
      },
    });
  }

  try {
    const mediaDetails = await spotifyClient.searchTrackBySpotifyId(spotifyId);

    if (!mediaDetails || !mediaDetails.id) {
      return sendNotFound(response, "Media not found");
    }

    const artists = [];
    let imageUrl;

    (mediaDetails.artists || []).forEach((artist) => {
      artists.push(artist.name);
    });

    (mediaDetails.album?.images || []).forEach((image) => {
      if (image.height == 640) {
        imageUrl = image.url;
      }
    });

    const musicToBeAdded = {
      name: mediaDetails.name,
      album: mediaDetails.album?.name,
      mediaId: mediaDetails.id,
      mediaType: "MUSIC",
      picture: imageUrl,
      artist: artists,
    };

    return createNewMedia(musicToBeAdded, response);
  } catch (error) {
    return sendBadGateway(
      response,
      "Unable to fetch media details from Spotify"
    );
  }
};

const getBookDetails = async (googleBookId, response) => {
  const existingMedia = await MediaModel.findOne({
    mediaId: googleBookId,
    mediaType: "BOOK",
  });

  if (existingMedia) {
    return response.status(200).json({
      status: "success",
      data: {
        media: existingMedia,
      },
    });
  }

  try {
    const mediaDetails = await googleClient.searchForBooksById(googleBookId);

    if (!mediaDetails || !mediaDetails.id || !mediaDetails.volumeInfo) {
      return sendNotFound(response, "Media not found");
    }

    const bookToBeAdded = {
      name: mediaDetails.volumeInfo.title,
      dateReleased: mediaDetails.volumeInfo.publishedDate,
      description: mediaDetails.volumeInfo.description,
      mediaId: mediaDetails.id,
      mediaType: "BOOK",
      genre: (mediaDetails.volumeInfo.categories || []).join(),
      picture: mediaDetails.volumeInfo.imageLinks?.thumbnail,
      author: mediaDetails.volumeInfo.authors || [],
    };

    return createNewMedia(bookToBeAdded, response);
  } catch (error) {
    return sendBadGateway(
      response,
      "Unable to fetch media details from Google Books"
    );
  }
};

module.exports = {
  createNewMedia,
  getMovieTvShowDetails,
  getMusicDetails,
  getBookDetails,
};
