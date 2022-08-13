const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ratingSchema = new Schema({
  media: { type: Schema.Types.ObjectId, ref: "media", required: true },
  ratedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  rating: { type: String, required: true },
  comments: String,
  isActive: Boolean,
  dateCreated: Date,
  dateUpdated: Date,
});

const ratings = mongoose.model("rating", ratingSchema);
module.exports = ratings;
