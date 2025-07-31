const mongoose = require("mongoose");
const {ObjectId} = require("mongodb");

const Schema = mongoose.Schema;

const playlistSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true, },
  name: { type: String, required: true },
  addedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  posters: [{ type: String }],
  isActive: Boolean,
  dateCreated: Date,
});

const playlists = mongoose.model("playlist", playlistSchema);
module.exports = playlists;
