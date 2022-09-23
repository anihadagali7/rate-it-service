const MediaModel = require("../repository/mediaModel");
const slackClient = require("../client/slackClient");
const tmdbClient = require("../client/tmdbClient");
const spotifyClient = require("../client/spotifyClient");

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
  const existingMedia = await MediaModel.findOne({ mediaId: tmdbId });

  if (existingMedia) {
    return response.status(200).json({
      status: "success",
      data: {
        media: existingMedia,
      },
    });
  } else {
    const mediaDetails = await tmdbClient.getDetailsById(tmdbId, mediaType);
    const mediaCast = await tmdbClient.getCreditsById(tmdbId, mediaType);

    let movieToBeAdded = {};

    if (mediaType === "movie") {
      movieToBeAdded["name"] = mediaDetails.original_title;
      movieToBeAdded["dateReleased"] = mediaDetails.release_date;
    } else {
      movieToBeAdded["name"] = mediaDetails.original_name;
      movieToBeAdded["dateReleased"] = mediaDetails.first_air_date;
    }

    movieToBeAdded["description"] = mediaDetails.overview;
    movieToBeAdded["tagLine"] = mediaDetails.tagLine;
    movieToBeAdded["mediaId"] = mediaDetails.id;
    movieToBeAdded["mediaType"] = mediaType.toUpperCase();

    if (mediaDetails.poster_path) {
      let posterUrl = `https://image.tmdb.org/t/p/w500${mediaDetails.poster_path}`;
      movieToBeAdded["picture"] = posterUrl;
    }

    let castList = [];
    let directorList = [];
    let producerList = [];

    mediaCast.cast.forEach((cast) => {
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

    mediaCast.crew.forEach((cast) => {
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

    movieToBeAdded["cast"] = [...new Set(castList)];
    movieToBeAdded["director"] = [...new Set(directorList)];
    movieToBeAdded["producer"] = [...new Set(producerList)];

    const newMedia = createNewMedia(movieToBeAdded, response);

    return newMedia;
  }
};

const getMusicDetails = async (spotifyId, response) => {
  const existingMedia = await MediaModel.findOne({ mediaId: spotifyId });
  if (existingMedia) {
    return response.status(200).json({
      status: "success",
      data: {
        media: existingMedia,
      },
    });
  } else {
    const mediaDetails = await spotifyClient.searchTrackBySpotifyId(spotifyId);

    let musicToBeAdded = {};

    musicToBeAdded["name"] = mediaDetails.name;
    musicToBeAdded["dateReleased"] = mediaDetails.first_air_date;
    musicToBeAdded["album"] = mediaDetails.album.name;

    let artists = [];
    let imageUrl;

    let imageList = mediaDetails.album.images;
    let artistsList = mediaDetails.artists;

    artistsList.forEach((artist) => {
      artists.push(artist.name);
    });

    imageList.forEach((image) => {
      if (image.height == 640) {
        imageUrl = image.url;
      }
    });

    musicToBeAdded["mediaId"] = mediaDetails.id;
    musicToBeAdded["mediaType"] = "MUSIC";
    musicToBeAdded["picture"] = imageUrl;
    musicToBeAdded["artist"] = artists;

    const newMedia = createNewMedia(musicToBeAdded, response);

    return newMedia;
  }
};

module.exports = { createNewMedia, getMovieTvShowDetails, getMusicDetails };
