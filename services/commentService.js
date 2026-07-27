const CommentModel = require("../repository/commentModel");
const RatingModel = require("../repository/ratingModel");
const UserModel = require("../repository/userModel");
const { toPublicUser } = require("../utils/userSerializer");
const { sendNotFound, sendBadRequest } = require("../utils/httpErrors");

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

  return response.status(200).json({
    status: "success",
    data: {
      deletedComment,
    },
  });
};

module.exports = {
  createComment,
  removeComment,
};
