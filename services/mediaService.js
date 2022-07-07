const MediaModel = require("../repository/mediaModel");

const createNewMedia = async (media, response) => {
  const newMedia = new MediaModel({
    name: media.name,
    cast: media.cast,
    media_type: media.mediaType,
  }).save();

  return response.status(201).json({
    status: "success",
    data: {
      newMedia,
    },
  });
};

module.exports = { createNewMedia };
