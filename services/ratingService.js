const RatingModel = require("../repository/ratingModel");
const slackClient = require("../client/slackClient");
const MediaModel = require("../repository/mediaModel");
const UserModel = require("../repository/userModel");
const { toPublicUser } = require("../utils/userSerializer");
const { sendNotFound, sendConflict } = require("../utils/httpErrors");
const { isDuplicateKeyError } = require("../utils/mongoErrors");

const createNewRating = async (mediaId, rating, comments, userName, response) => {
  const existingUser = await UserModel.findOne({ userName: userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const existingMedia = await MediaModel.findOne({ mediaId: mediaId });
  if (!existingMedia) {
    return sendNotFound(response, "Media not found");
  }

  const existingRating = await RatingModel.findOne({
    ratedBy: existingUser._id,
    media: existingMedia._id,
  });

  if (existingRating) {
    return sendConflict(response, "You have already rated this media");
  }

  try {
    const newRating = await new RatingModel({
      media: existingMedia._id,
      ratedBy: existingUser._id,
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
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return sendConflict(response, "You have already rated this media");
    }

    throw error;
  }
};

const getRatingsForUser = async (userName, response) => {
  const existingUser = await UserModel.findOne({ userName: userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
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
    return sendNotFound(response, "Media not found");
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

const getExploreRatings = async (userName, response) => {
  const getAllRatings = await RatingModel.find();
  let ratingsList = await prepareRatingsList(getAllRatings);

  // Signed-in Discover: only ratings from people you don't follow
  // (and not your own), so it surfaces new people and reviews.
  if (userName) {
    const existingUser = await UserModel.findOne({ userName });
    if (!existingUser) {
      return sendNotFound(response, "User not found");
    }

    const excludedUserNames = new Set([
      existingUser.userName,
      ...(existingUser.following || []),
    ]);

    ratingsList = ratingsList.filter(
      (rating) =>
        rating.ratedBy?.userName &&
        !excludedUserNames.has(rating.ratedBy.userName)
    );
  }

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
    return sendNotFound(response, "User not found");
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

  ratingsList.sort(
    (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
  );
  return ratingsList;
};

module.exports = {
  createNewRating,
  getRatingsForUser,
  getRatingsForMedia,
  getExploreRatings,
  getRatingsByFollowing,
};
