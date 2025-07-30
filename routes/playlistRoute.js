const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const playlistService = require("../services/playlistService");

router.post("/create", authToken, async (request, response) => {
  const { playlistName, userName } = request.body;

  return playlistService.createNewPlaylist(playlistName, userName, response);
});

router.post("/addMediaToMultiplePlaylists", authToken, async (request, response) => {
  const { playlistsToAdd, playlistsToRemove, mediaId } = request.body;

  return playlistService.addMediaToMultiplePlaylist(
    playlistsToAdd,
    playlistsToRemove,
    mediaId,
    response
  );
});

router.post("/addMedia", authToken, async (request, response) => {
  const { playlistId, mediaId } = request.body;

  return playlistService.addMediaToPlaylist(playlistId, mediaId, response);
});

router.get("/user/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return playlistService.getPlaylistForUser(userName, response);
});

router.get("/:playlist", authToken, async (request, response) => {
  const { playlist } = request.params;

  return playlistService.getAllMediaInPlaylist(playlist, response);
});

router.get("/createPoster", authToken, async () => {
  playlistService.addPostersForPlaylist();
});

router.post(
  "/getPlalistsWithThisMedia",
  authToken,
  async (request, response) => {
    const { mediaId, userName } = request.body;

    return playlistService.getPlalistsWithThisMedia(
      userName,
      mediaId,
      response
    );
  }
);

module.exports = router;
