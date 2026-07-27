const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const likeSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  rating: { type: Schema.Types.ObjectId, ref: "rating", required: true },
  likedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  dateCreated: Date,
});

likeSchema.index({ likedBy: 1, rating: 1 }, { unique: true });
likeSchema.index({ rating: 1 });

const likes = mongoose.model("like", likeSchema);
module.exports = likes;
