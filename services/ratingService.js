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

  for(let rating of list) {
    let ratingObject = JSON.parse(JSON.stringify(rating));
    ratingObject.media = await MediaModel.findById(rating.media);
    ratingObject.ratedBy = await UserModel.findById(rating.ratedBy);
    ratingsList.push(ratingObject);
  }

  ratingsList.sort((a,b)=>b.dateCreated - a.dateCreated);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
}

const getRatingsForMedia = async (mediaId, response) => {
  let ratingsList = [];
  const existingMedia = await MediaModel.findOne({mediaId: mediaId});
  const list = await RatingModel.find({media: existingMedia});

  for(let rating of list) {
    let ratingObject = JSON.parse(JSON.stringify(rating));
    ratingObject.media = await MediaModel.findById(rating.media);
    ratingObject.ratedBy = await UserModel.findById(rating.ratedBy);
    ratingsList.push(ratingObject);
  }

  ratingsList.sort((a,b)=>b.dateCreated - a.dateCreated);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
}

module.exports = { createNewRating, getRatingsForUser, getRatingsForMedia };
