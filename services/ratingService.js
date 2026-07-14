const RatingModel = require("../repository/ratingModel");
const slackClient = require("../client/slackClient");
const MediaModel = require("../repository/mediaModel");
const UserModel = require("../repository/userModel");
const { toPublicUser } = require("../utils/userSerializer");

const createNewRating = async (mediaId, rating, comments, userName, response) => {
  const existingUser = await UserModel.findOne({ userName: userName });
  if (!existingUser) {
    return response.status(404).json({
      errors: {
        msg: "User not found",
      },
    });
  }

  const existingMedia = await MediaModel.findOne({ mediaId: mediaId });
  if (!existingMedia) {
    return response.status(404).json({
      errors: {
        msg: "Media not found",
      },
    });
  }

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
    process.env.SLACK_RATING_URL
  );

  return response.status(201).json({
    status: "success",
    data: {
      newRating,
    },
  });
};

const getRatingsForUser = async (userName, response) => {
  const existingUser = await UserModel.findOne({ userName: userName });
  if (!existingUser) {
    return response.status(404).json({
      errors: {
        msg: "User not found",
      },
    });
  }

  const list = await RatingModel.find({ ratedBy: existingUser });
  const ratingsList = await prepareRatingsList(list);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
};

const getRatingsForMedia = async (mediaId, response) => {
  const existingMedia = await MediaModel.findOne({ mediaId: mediaId });
  if (!existingMedia) {
    return response.status(404).json({
      errors: {
        msg: "Media not found",
      },
    });
  }

  const list = await RatingModel.find({ media: existingMedia });
  const ratingsList = await prepareRatingsList(list);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
};

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
  const existingUser = await UserModel.findOne({ userName: userName });
  if (!existingUser) {
    return response.status(404).json({
      errors: {
        msg: "User not found",
      },
    });
  }

  const listOfRatingsByFollowers = [];
  const followingList = existingUser.following || [];

  for (const user of followingList) {
    const userModel = await UserModel.findOne({ userName: user });
    if (!userModel) {
      continue;
    }

    const list = await RatingModel.find({ ratedBy: userModel });
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
  const ratingsList = [];
  for (const rating of ratings) {
    const ratingObject = JSON.parse(JSON.stringify(rating));
    ratingObject.media = await MediaModel.findById(rating.media);
    ratingObject.ratedBy = toPublicUser(
      await UserModel.findById(rating.ratedBy)
    );
    ratingsList.push(ratingObject);
  }

  ratingsList.sort((a, b) => a.dateCreated - b.dateCreated);
  return ratingsList;
};

module.exports = {
  createNewRating,
  getRatingsForUser,
  getRatingsForMedia,
  getExploreRatings,
  getRatingsByFollowing,
};
