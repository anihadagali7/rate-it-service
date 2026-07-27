const RatingModel = require("../repository/ratingModel");
const LikeModel = require("../repository/likeModel");
const CommentModel = require("../repository/commentModel");
const CommentLikeModel = require("../repository/commentLikeModel");
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

const getRatingsForUser = async (userName, response, currentUserId = null) => {
  const existingUser = await UserModel.findOne({ userName: userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const list = await RatingModel.find({ ratedBy: existingUser });
  const ratingsList = await prepareRatingsList(list, currentUserId);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
};

const getRatingsForMedia = async (mediaId, response, currentUserId = null) => {
  const existingMedia = await MediaModel.findOne({ mediaId: mediaId });
  if (!existingMedia) {
    return sendNotFound(response, "Media not found");
  }

  const list = await RatingModel.find({ media: existingMedia });
  const ratingsList = await prepareRatingsList(list, currentUserId);

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
};

const getExploreRatings = async (userName, response, currentUserId = null) => {
  const getAllRatings = await RatingModel.find();
  let ratingsList = await prepareRatingsList(getAllRatings, currentUserId);

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

const getRatingsByFollowing = async (userName, response, currentUserId = null) => {
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

  const ratingsList = await prepareRatingsList(
    listOfRatingsByFollowers,
    currentUserId
  );

  return response.status(200).json({
    status: "success",
    data: {
      ratingsList,
    },
  });
};

const prepareRatingsList = async (ratings, currentUserId = null) => {
  const ratingIds = ratings.map((rating) => rating._id);

  const [counts, likedIds, commentDocs] = await Promise.all([
    ratingIds.length
      ? LikeModel.aggregate([
          { $match: { rating: { $in: ratingIds } } },
          { $group: { _id: "$rating", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    currentUserId && ratingIds.length
      ? LikeModel.find({
          rating: { $in: ratingIds },
          likedBy: currentUserId,
        }).distinct("rating")
      : Promise.resolve([]),
    ratingIds.length
      ? CommentModel.find({ rating: { $in: ratingIds } }).sort({
          dateCreated: 1,
        })
      : Promise.resolve([]),
  ]);

  const countByRating = new Map(
    counts.map((entry) => [entry._id.toString(), entry.count])
  );
  const likedSet = new Set(likedIds.map((id) => id.toString()));

  const commenterIds = [
    ...new Set(commentDocs.map((comment) => comment.commentedBy.toString())),
  ];
  const commentIds = commentDocs.map((comment) => comment._id);

  const [commenters, commentLikeCounts, likedCommentIds] = await Promise.all([
    commenterIds.length
      ? UserModel.find({ _id: { $in: commenterIds } })
      : Promise.resolve([]),
    commentIds.length
      ? CommentLikeModel.aggregate([
          { $match: { comment: { $in: commentIds } } },
          { $group: { _id: "$comment", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    currentUserId && commentIds.length
      ? CommentLikeModel.find({
          comment: { $in: commentIds },
          likedBy: currentUserId,
        }).distinct("comment")
      : Promise.resolve([]),
  ]);

  const commenterById = new Map(
    commenters.map((user) => [user._id.toString(), toPublicUser(user)])
  );
  const commentLikeCountById = new Map(
    commentLikeCounts.map((entry) => [entry._id.toString(), entry.count])
  );
  const likedCommentSet = new Set(
    likedCommentIds.map((id) => id.toString())
  );

  const commentsByRating = new Map();
  for (const comment of commentDocs) {
    const ratingKey = comment.rating.toString();
    const list = commentsByRating.get(ratingKey) || [];
    list.push({
      _id: comment._id,
      text: comment.text,
      dateCreated: comment.dateCreated,
      commentedBy: commenterById.get(comment.commentedBy.toString()) || null,
      likeCount: commentLikeCountById.get(comment._id.toString()) || 0,
      likedByCurrentUser: currentUserId
        ? likedCommentSet.has(comment._id.toString())
        : false,
    });
    commentsByRating.set(ratingKey, list);
  }

  const ratingsList = [];
  for (const rating of ratings) {
    const ratingObject = JSON.parse(JSON.stringify(rating));
    ratingObject.media = await MediaModel.findById(rating.media);
    ratingObject.ratedBy = toPublicUser(
      await UserModel.findById(rating.ratedBy)
    );
    ratingObject.likeCount = countByRating.get(rating._id.toString()) || 0;
    ratingObject.likedByCurrentUser = currentUserId
      ? likedSet.has(rating._id.toString())
      : false;
    const commentList = commentsByRating.get(rating._id.toString()) || [];
    ratingObject.commentList = commentList;
    ratingObject.commentCount = commentList.length;
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
