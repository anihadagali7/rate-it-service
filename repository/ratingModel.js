const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ratingSchema = new Schema({
  media: [{ type: Schema.Types.ObjectId, ref: "media", required: true }],
  rated_by: [{ type: Schema.Types.ObjectId, ref: "user", required: true }],
  rating: { type: String, required: true },
  comments: String,
  is_active: Boolean,
  date_created: Date,
  date_updated: Date,
});

const ratings = mongoose.model("rating", ratingSchema);
module.exports = ratings;
