const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const mediaSchema = new Schema({
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
  tag_line: String,
  mediaType: {
    type: String,
    enum: ["MOVIE", "BOOK", "PODCAST", "TV", "MUSIC", "THEATRE"],
    // default: "user",
    required: true,
  },
  picture: String,
  dateReleased: Date,
  mediaId: String,
});

const media = mongoose.model("media", mediaSchema);
module.exports = media;
