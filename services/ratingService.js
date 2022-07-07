const RatingModel = require("../repository/ratingModel");
const slackClient = require("../client/slackClient");

const createNewRating = async (mediaId, rating, comments, response) => {
  // search for media Id
  // search for user Id
  const newRating = await new RatingModel({
    media: mediaId,
    rated_by: "62c45900a11b0479091e353b",
    rating: rating,
    comments: comments,
    is_active: true,
    date_created: Date.now(),
    date_updated: Date.now(),
  }).save();

  slackClient.postMessage(
    `Rating has been added!`,
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
