const RatingModel = require("../repository/ratingModel");

const createNewRating = async (mediaId, rating, comments, response) => {
    const newRating = new RatingModel({
      media: mediaId,
      rated_by: "62c45900a11b0479091e353b",
      rating: rating,
      comments: comments,
      is_active: true,
      date_created: Date.now(),
      date_updated: Date.now(),
    }).save();

    return response.status(201).json({
      status: "success",
      data: {
        newRating,
      },
    });
};

module.exports = { createNewRating };
