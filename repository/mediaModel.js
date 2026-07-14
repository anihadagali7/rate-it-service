const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const mediaSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true },
  artist: [{ type: String }],
  author: [{ type: String }],
  producer: [{ type: String }],
  director: [{ type: String }],
  host: [{ type: String }],
  cast: [{ type: String }],
  genre: String,
  album: String,
  description: String,
  tagLine: String,
  mediaType: {
    type: String,
    enum: ["MOVIE", "BOOK", "PODCAST", "TV", "MUSIC", "THEATRE"],
    required: true,
  },
  picture: String,
  dateReleased: Date,
  mediaId: String,
});

mediaSchema.index(
  { mediaId: 1, mediaType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      mediaId: { $exists: true, $ne: null },
    },
  }
);
mediaSchema.index({ mediaType: 1 });

const media = mongoose.model("media", mediaSchema);
module.exports = media;
