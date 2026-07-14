const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const wishlistSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  media: { type: Schema.Types.ObjectId, ref: "media", required: true },
  addedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  isActive: Boolean,
  dateCreated: Date,
});

wishlistSchema.index({ addedBy: 1, media: 1 }, { unique: true });
wishlistSchema.index({ addedBy: 1 });

const wishlists = mongoose.model("wishlist", wishlistSchema);
module.exports = wishlists;
