const RatingModel = require("../repository/ratingModel");
const slackClient = require("../client/slackClient");
const MediaModel = require("../repository/mediaModel");
const UserModel = require("../repository/userModel");

const createNewRating = async (mediaId, rating, comments, userId, response) => {
  const existingUser = await UserModel.findById(userId);
  const existingMedia = await MediaModel.findOne({ mediaId: mediaId });

  const newRating = await new RatingModel({
    media: existingMedia,
    rated_by: existingUser,
    rating: rating,
    comments: comments,
    is_active: true,
    date_created: Date.now(),
    date_updated: Date.now(),
  }).save();

  slackClient.postMessage(
    `Rating has been added for ${existingMedia.name} - ${existingMedia.media_type} by ${existingUser.user_name}!`,
    process.env.SLACK_DEV_RATING_URL
  );

  return response.status(201).json({
    status: "success",
    data: {
      newRating,
    },
  });
};

module.exports = { createNewRating };
