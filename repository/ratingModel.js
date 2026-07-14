const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ratingSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  media: { type: Schema.Types.ObjectId, ref: "media", required: true },
  ratedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  rating: { type: String, required: true },
  comments: String,
  isActive: Boolean,
  dateCreated: Date,
  dateUpdated: Date,
});

ratingSchema.index({ ratedBy: 1, media: 1 }, { unique: true });
ratingSchema.index({ ratedBy: 1 });
ratingSchema.index({ media: 1 });
ratingSchema.index({ dateCreated: -1 });

const ratings = mongoose.model("rating", ratingSchema);
module.exports = ratings;
