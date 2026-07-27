const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentLikeSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  comment: { type: Schema.Types.ObjectId, ref: "comment", required: true },
  likedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  dateCreated: Date,
});

commentLikeSchema.index({ likedBy: 1, comment: 1 }, { unique: true });
commentLikeSchema.index({ comment: 1 });

const commentLikes = mongoose.model("commentLike", commentLikeSchema);
module.exports = commentLikes;
