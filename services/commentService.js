const CommentModel = require("../repository/commentModel");
const CommentLikeModel = require("../repository/commentLikeModel");
const RatingModel = require("../repository/ratingModel");
const UserModel = require("../repository/userModel");
const { toPublicUser } = require("../utils/userSerializer");
const {
  sendNotFound,
  sendBadRequest,
  sendConflict,
} = require("../utils/httpErrors");
const { isDuplicateKeyError } = require("../utils/mongoErrors");

const createComment = async (ratingId, text, userName, response) => {
  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (!trimmedText) {
    return sendBadRequest(response, "Comment text is required");
  }

  const existingUser = await UserModel.findOne({ userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const existingRating = await RatingModel.findById(ratingId);
  if (!existingRating) {
    return sendNotFound(response, "Rating not found");
  }

  const newComment = await new CommentModel({
    rating: existingRating._id,
    commentedBy: existingUser._id,
    text: trimmedText,
    dateCreated: Date.now(),
  }).save();

  return response.status(201).json({
    status: "success",
    data: {
      newComment: {
        ...JSON.parse(JSON.stringify(newComment)),
        commentedBy: toPublicUser(existingUser),
        likeCount: 0,
        likedByCurrentUser: false,
      },
    },
  });
};

const removeComment = async (commentId, userName, response) => {
  const existingUser = await UserModel.findOne({ userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const existingComment = await CommentModel.findById(commentId);
  if (!existingComment) {
    return sendNotFound(response, "Comment not found");
  }

  if (existingComment.commentedBy.toString() !== existingUser._id.toString()) {
    return response.status(403).json({
      errors: { msg: "You can only delete your own comments" },
    });
  }

  const deletedComment = await CommentModel.findByIdAndDelete(commentId);
  await CommentLikeModel.deleteMany({ comment: commentId });

  return response.status(200).json({
    status: "success",
    data: {
      deletedComment,
    },
  });
};

const likeComment = async (commentId, userName, response) => {
  const existingUser = await UserModel.findOne({ userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const existingComment = await CommentModel.findById(commentId);
  if (!existingComment) {
    return sendNotFound(response, "Comment not found");
  }

  const existingLike = await CommentLikeModel.findOne({
    likedBy: existingUser._id,
    comment: existingComment._id,
  });

  if (existingLike) {
    return sendConflict(response, "You have already liked this comment");
  }

  try {
    const newLike = await new CommentLikeModel({
      comment: existingComment._id,
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
      return sendConflict(response, "You have already liked this comment");
    }

    throw error;
  }
};

const unlikeComment = async (commentId, userName, response) => {
  const existingUser = await UserModel.findOne({ userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const existingComment = await CommentModel.findById(commentId);
  if (!existingComment) {
    return sendNotFound(response, "Comment not found");
  }

  const deletedLike = await CommentLikeModel.findOneAndDelete({
    likedBy: existingUser._id,
    comment: existingComment._id,
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
  createComment,
  removeComment,
  likeComment,
  unlikeComment,
};
