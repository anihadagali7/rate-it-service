const MediaModel = require("../repository/mediaModel");
const slackClient = require("../client/slackClient");

const createNewMedia = async (media, response) => {
  const newMedia = await new MediaModel({
    name: media.name,
    cast: media.cast,
    media_type: media.mediaType,
  }).save();

  slackClient.postMessage(
    "C03PCJQ829E",
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

module.exports = { createNewMedia };
