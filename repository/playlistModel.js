const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const playlistSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true },
  addedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  posters: [{ type: String }],
  isActive: Boolean,
  dateCreated: Date,
});

playlistSchema.index({ addedBy: 1 });
playlistSchema.index({ addedBy: 1, dateCreated: -1 });

const playlists = mongoose.model("playlist", playlistSchema);
module.exports = playlists;
