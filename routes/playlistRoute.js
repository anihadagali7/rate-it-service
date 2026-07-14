const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const playlistService = require("../services/playlistService");

router.post("/create", authToken, async (request, response) => {
  const { playlistName } = request.body;

  return playlistService.createNewPlaylist(
    playlistName,
    request.user.userName,
    response
  );
});

router.post("/addMediaToMultiplePlaylists", authToken, async (request, response) => {
  const { playlistsToAdd, playlistsToRemove, mediaId } = request.body;

  return playlistService.addMediaToMultiplePlaylist(
    playlistsToAdd,
    playlistsToRemove,
    mediaId,
    request.user.id,
    response
  );
});

router.post("/addMedia", authToken, async (request, response) => {
  const { playlistId, mediaId } = request.body;

  return playlistService.addMediaToPlaylist(
    playlistId,
    mediaId,
    request.user.id,
    response
  );
});

router.get("/user/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return playlistService.getPlaylistForUser(userName, response);
});

router.get("/createPoster", authToken, async () => {
  playlistService.addPostersForPlaylist();
});

router.get(
  "/getPlaylistsWithThisMedia",
  authToken,
  async (request, response) => {
    const { mediaId } = request.query;

    return playlistService.getPlaylistsWithThisMedia(
      request.user.userName,
      mediaId,
      response
    );
  }
);

router.get("/:playlist", authToken, async (request, response) => {
  const { playlist } = request.params;

  return playlistService.getAllMediaInPlaylist(playlist, response);
});

module.exports = router;
