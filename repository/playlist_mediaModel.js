const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const playlistMediaSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  playlist: { type: Schema.Types.ObjectId, ref: "playlist", required: true },
  media: { type: Schema.Types.ObjectId, ref: "media", required: true },
});

playlistMediaSchema.index({ playlist: 1, media: 1 }, { unique: true });
playlistMediaSchema.index({ playlist: 1 });
playlistMediaSchema.index({ media: 1 });

const playlistMedia = mongoose.model("playlistMedia", playlistMediaSchema);
module.exports = playlistMedia;
