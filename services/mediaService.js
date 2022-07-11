const MediaModel = require("../repository/mediaModel");
const slackClient = require("../client/slackClient");
const tmdbClient = require("../client/tmdbClient");

const createNewMedia = async (media, response) => {
  let mediaToBeSaved = {};
  if (media.mediaType === "MOVIE" || media.mediaType === "TV SHOW") {
    mediaToBeSaved = newMovieOrTvShow(media);
  }

  const newMedia = await new MediaModel(mediaToBeSaved).save();

  slackClient.postMessage(
    `${newMedia.name} - ${newMedia.media_type} has just been added!`,
    process.env.SLACK_DEV_MEDIA_URL
  );

  return response.status(201).json({
    status: "success",
    data: {
      newMedia,
    },
  });
};

// media is coming from UI
const newMovieOrTvShow = (media) => {
  return {
    name: media.name,
    description: media.description,
    date_released: media.dateReleased,
    picture: media.picture,
    media_type: media.mediaType,
    tmdb_id: media.tmdbId,
    cast: media.cast,
    director: media.director,
    producer: media.producer,
    tag_line: media.tagLine,
  };
};

const getMovieTvShowDetails = async (tmdbId, mediaType, response) => {
  const existingMedia = await MediaModel.findOne({ tmdb_id: tmdbId });

  if (existingMedia) {
    return response.status(200).json({
      status: "success",
      data: {
        existingMovie: existingMedia,
      },
    });
  } else {
    const mediaDetails = await tmdbClient.getDetailsById(tmdbId, mediaType);
    const mediaCast = await tmdbClient.getCreditsById(tmdbId, mediaType);

    let movieToBeAdded = {};

    if (mediaType == "movie") {
      movieToBeAdded["name"] = mediaDetails.original_title;
      movieToBeAdded["dateReleased"] = mediaDetails.release_date;
    } else {
      movieToBeAdded["name"] = mediaDetails.original_name;
      movieToBeAdded["dateReleased"] = mediaDetails.first_air_date;
    }

    movieToBeAdded["description"] = mediaDetails.overview;
    movieToBeAdded["tagLine"] = mediaDetails.tagLine;
    movieToBeAdded["tmdbId"] = mediaDetails.id;
    movieToBeAdded["mediaType"] =
      mediaType === "tv" ? "TV SHOW" : mediaType.toUpperCase();
    // movieToBeAdded["picture"] = movieDetails.original_title;

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

    movieToBeAdded["cast"] = castList;
    movieToBeAdded["director"] = directorList;
    movieToBeAdded["producer"] = producerList;

    const newMedia = createNewMedia(movieToBeAdded, response);

    return newMedia;
  }
};

module.exports = { createNewMedia, getMovieTvShowDetails };
