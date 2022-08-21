const RatingModel = require("../repository/ratingModel");
const slackClient = require("../client/slackClient");
const MediaModel = require("../repository/mediaModel");
const UserModel = require("../repository/userModel");
const {response} = require("express");

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
  const existingUser = await UserModel.findOne({userName: userName});
  const list = await RatingModel.find({ratedBy: existingUser});

  let ratingsList = await prepareRatingsList(list);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
}

const getRatingsForMedia = async (mediaId, response) => {
  const existingMedia = await MediaModel.findOne({mediaId: mediaId});
  const list = await RatingModel.find({media: existingMedia});

  let ratingsList = await prepareRatingsList(list);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
}

const getExploreRatings = async (response) => {
  const getAllRatings = await RatingModel.find();

  const ratingsList = await prepareRatingsList(getAllRatings);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
};

const getRatingsByFollowing = async (userName, response) => {
  const existingUser = await UserModel.findOne({userName: userName});
  const listOfRatingsByFollowers = [];
  let followingList = existingUser.following;

  for(let user of followingList){
    const userModel = await UserModel.findOne({userName: user});
    const list = await RatingModel.find({ratedBy: userModel});
    listOfRatingsByFollowers.push(...list);
  }

  const ratingsList = await prepareRatingsList(listOfRatingsByFollowers);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
};

const prepareRatingsList = async (ratings) => {
  let ratingsList = [];
  for(let rating of ratings) {
    let ratingObject = JSON.parse(JSON.stringify(rating));
    ratingObject.media = await MediaModel.findById(rating.media);
    ratingObject.ratedBy = await UserModel.findById(rating.ratedBy);
    ratingsList.push(ratingObject);
  }

  ratingsList.sort((a,b)=>a.dateCreated - b.dateCreated);
  return ratingsList;
}

module.exports = { createNewRating, getRatingsForUser, getRatingsForMedia, getExploreRatings, getRatingsByFollowing };
