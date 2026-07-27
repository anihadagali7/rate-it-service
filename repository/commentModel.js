const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  rating: { type: Schema.Types.ObjectId, ref: "rating", required: true },
  commentedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  text: { type: String, required: true, trim: true },
  dateCreated: Date,
});

commentSchema.index({ rating: 1, dateCreated: 1 });
commentSchema.index({ commentedBy: 1 });

const comments = mongoose.model("comment", commentSchema);
module.exports = comments;
