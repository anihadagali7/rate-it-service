const MediaModel = require("../repository/mediaModel");
const slackClient = require("../client/slackClient");

// as soon as they land on movie/tv show page
const createNewMedia = async (media, response) => {
  const mediaToBeSaved = {};
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
  };
};

module.exports = { createNewMedia };
