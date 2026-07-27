const LikeModel = require("../repository/likeModel");
const RatingModel = require("../repository/ratingModel");
const UserModel = require("../repository/userModel");
const { sendNotFound, sendConflict } = require("../utils/httpErrors");
const { isDuplicateKeyError } = require("../utils/mongoErrors");

const createLike = async (ratingId, userName, response) => {
  const existingUser = await UserModel.findOne({ userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const existingRating = await RatingModel.findById(ratingId);
  if (!existingRating) {
    return sendNotFound(response, "Rating not found");
  }

  const existingLike = await LikeModel.findOne({
    likedBy: existingUser._id,
    rating: existingRating._id,
  });

  if (existingLike) {
    return sendConflict(response, "You have already liked this rating");
  }

  try {
    const newLike = await new LikeModel({
      rating: existingRating._id,
      likedBy: existingUser._id,
      dateCreated: Date.now(),
    }).save();

    return response.status(201).json({
      status: "success",
      data: {
        newLike,
      },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return sendConflict(response, "You have already liked this rating");
    }

    throw error;
  }
};

const removeLike = async (ratingId, userName, response) => {
  const existingUser = await UserModel.findOne({ userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const existingRating = await RatingModel.findById(ratingId);
  if (!existingRating) {
    return sendNotFound(response, "Rating not found");
  }

  const deletedLike = await LikeModel.findOneAndDelete({
    likedBy: existingUser._id,
    rating: existingRating._id,
  });

  if (!deletedLike) {
    return sendNotFound(response, "Like not found");
  }

  return response.status(200).json({
    status: "success",
    data: {
      deletedLike,
    },
  });
};

module.exports = {
  createLike,
  removeLike,
};
