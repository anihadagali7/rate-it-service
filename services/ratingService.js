const RatingModel = require("../repository/ratingModel");
const slackClient = require("../client/slackClient");
const MediaModel = require("../repository/mediaModel");
const UserModel = require("../repository/userModel");

const createNewRating = async (mediaId, rating, comments, userName, response) => {
  const existingUser = await UserModel.findOne({userName: userName});
  const existingMedia = await MediaModel.findOne({ mediaId: mediaId });

  const newRating = await new RatingModel({
    media: existingMedia,
    ratedBy: existingUser,
    rating: rating,
    comments: comments,
    isActive: true,
    dateCreated: Date.now(),
    dateUpdated: Date.now(),
  }).save();

  slackClient.postMessage(
    `Rating has been added for ${existingMedia.name} - ${existingMedia.mediaType} by ${existingUser.userName}!`,
    process.env.SLACK_DEV_RATING_URL
  );

  return response.status(201).json({
    status: "success",
    data: {
      newRating,
    },
  });
};

const getRatingsForUser = async (userName, response) => {
  let ratingsList = [];
  const existingUser = await UserModel.findOne({userName: userName});
  const list = await RatingModel.find({ratedBy: existingUser});

  list.sort((a,b)=>b.date_created - a.date_created);

  return response.status(201).json({
    status: "success",
    data: {
      list,
    },
  });
}

module.exports = { createNewRating, getRatingsForUser };
