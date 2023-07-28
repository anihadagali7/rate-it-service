const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const playlistMediaSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true },
    playlist: { type: Schema.Types.ObjectId, ref: "media", required: true },
    media: { type: Schema.Types.ObjectId, ref: "playlist", required: true },
});

const playlistMedia = mongoose.model("playlistMedia", playlistMediaSchema);
module.exports = playlistMedia;