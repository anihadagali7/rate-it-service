const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const playlistService = require("../services/playlistService");

router.post("/playlist/create", authToken, async (request, response) => {
  const { playlistName, userName } = request.body;

  return playlistService.createNewPlaylist(playlistName, userName, response);
});

router.post("/playlist/addMedia", authToken, async (request, response) => {
  const { playlistId, mediaId } = request.body;

  return playlistService.addMediaToPlaylist(playlistId, mediaId, response);
});

router.get("/playlist/user/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return playlistService.getPlaylistForUser(userName, response);
});

router.get("/playlist/:playlist", authToken, async (request, response) => {
  const { playlist } = request.params;

  return playlistService.getAllMediaInPlaylist(playlist, response);
});

module.exports = router;
