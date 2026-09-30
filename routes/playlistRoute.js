const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");

const playlistService = require("../services/playlistService");

/**
 * @openapi
 * /api/playlist/create:
 *   post:
 *     tags: [Playlists]
 *     summary: Create a playlist
 *     description: >-
 *       The owner always comes from the token. A missing `playlistName` fails model
 *       validation and returns 500.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playlistName]
 *             properties:
 *               playlistName:
 *                 type: string
 *     responses:
 *       201:
 *         description: The new, empty playlist.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [newPlaylist]
 *                   properties:
 *                     newPlaylist:
 *                       $ref: "#/components/schemas/CreatedPlaylist"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: >-
 *           No user matches the caller's userName (`"User not found"`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/create", authToken, async (request, response) => {
  const { playlistName } = request.body;

  return playlistService.createNewPlaylist(
    playlistName,
    request.user.userName,
    response
  );
});

/**
 * @openapi
 * /api/playlist/addMediaToMultiplePlaylists:
 *   post:
 *     tags: [Playlists]
 *     summary: Add a media item to some playlists and remove it from others
 *     description: >-
 *       Playlists are processed in order (adds first, then removes) and each change
 *       is saved as it goes, so an error part-way leaves the earlier playlists
 *       changed. Removing media that isn't in a playlist succeeds. A malformed id
 *       returns 500.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaId]
 *             properties:
 *               mediaId:
 *                 $ref: "#/components/schemas/ObjectId"
 *               playlistsToAdd:
 *                 type: array
 *                 description: Ids of the caller's playlists to add the media to.
 *                 items:
 *                   $ref: "#/components/schemas/ObjectId"
 *               playlistsToRemove:
 *                 type: array
 *                 description: Ids of the caller's playlists to remove the media from.
 *                 items:
 *                   $ref: "#/components/schemas/ObjectId"
 *     responses:
 *       200:
 *         description: All changes applied.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StatusResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         description: >-
 *           The token is invalid (`"Invalid token"`), or a playlist belongs to
 *           someone else (`"You do not own this playlist"`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       404:
 *         description: '`"Media not found"` or `"Playlist not found"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: >-
 *           The media is already in one of the playlists to add to
 *           (`"This media is already in the playlist"`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
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

/**
 * @openapi
 * /api/playlist/addMedia:
 *   post:
 *     tags: [Playlists]
 *     summary: Add a media item to one of the caller's playlists
 *     description: A malformed id returns 500.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playlistId, mediaId]
 *             properties:
 *               playlistId:
 *                 $ref: "#/components/schemas/ObjectId"
 *               mediaId:
 *                 $ref: "#/components/schemas/ObjectId"
 *     responses:
 *       201:
 *         description: >-
 *           The new playlist-media link. The payload is named `newPlaylist`, but
 *           it's the link, not a playlist.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [newPlaylist]
 *                   properties:
 *                     newPlaylist:
 *                       $ref: "#/components/schemas/PlaylistMedia"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         description: >-
 *           The token is invalid (`"Invalid token"`), or the playlist belongs to
 *           someone else (`"You do not own this playlist"`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       404:
 *         description: '`"Media not found"` or `"Playlist not found"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: '`"This media is already in the playlist"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/addMedia", authToken, async (request, response) => {
  const { playlistId, mediaId } = request.body;

  return playlistService.addMediaToPlaylist(
    playlistId,
    mediaId,
    request.user.id,
    response
  );
});

/**
 * @openapi
 * /api/playlist/user/{userName}:
 *   get:
 *     tags: [Playlists]
 *     summary: List a user's playlists
 *     description: Any logged-in user can list anyone's playlists.
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: userName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The user's playlists (an empty list if they have none).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [playlistList]
 *                   properties:
 *                     playlistList:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/PlaylistListItem"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: No user has that userName (`"User not found"`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/user/:userName", authToken, async (request, response) => {
  const { userName } = request.params;

  return playlistService.getPlaylistForUser(userName, response);
});

/**
 * @openapi
 * /api/playlist/createPoster:
 *   get:
 *     tags: [Playlists]
 *     summary: Recompute every playlist's posters (leftover backfill)
 *     description: >-
 *       Starts a backfill that rewrites `posters` on every playlist, for any
 *       logged-in user. It never sends a response, so after authentication the
 *       request hangs until the client gives up. Not used by the UI; being removed
 *       in #62.
 *     security:
 *       - tokenAuth: []
 *     responses:
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/createPoster", authToken, async () => {
  playlistService.addPostersForPlaylist();
});

/**
 * @openapi
 * /api/playlist/getPlaylistsWithThisMedia:
 *   get:
 *     tags: [Playlists]
 *     summary: List the caller's playlists that contain a media item
 *     description: A malformed `mediaId` returns 500.
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: query
 *         name: mediaId
 *         required: true
 *         schema:
 *           $ref: "#/components/schemas/ObjectId"
 *     responses:
 *       200:
 *         description: >-
 *           The caller's playlists containing the media. When the media isn't in
 *           anyone's playlist, `status` is a message and `data` is an empty array
 *           instead.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required: [status, data]
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [success]
 *                     data:
 *                       type: object
 *                       required: [selectedPlaylists]
 *                       properties:
 *                         selectedPlaylists:
 *                           type: array
 *                           items:
 *                             $ref: "#/components/schemas/Playlist"
 *                 - type: object
 *                   required: [status, data]
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [That media has not been added to any playlists]
 *                     data:
 *                       type: array
 *                       maxItems: 0
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: >-
 *           `"User not found"`, or `"Media not found"` (also returned when
 *           `mediaId` is missing).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
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

/**
 * @openapi
 * /api/playlist/{playlist}:
 *   get:
 *     tags: [Playlists]
 *     summary: Get a playlist and its media
 *     description: >-
 *       Any logged-in user can view any playlist. A malformed id returns 500.
 *     security:
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: playlist
 *         required: true
 *         description: The playlist's id.
 *         schema:
 *           $ref: "#/components/schemas/ObjectId"
 *     responses:
 *       200:
 *         description: The playlist and its media.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [mediaByPlaylist]
 *                   properties:
 *                     mediaByPlaylist:
 *                       type: object
 *                       required: [playlist, mediaList]
 *                       properties:
 *                         playlist:
 *                           $ref: "#/components/schemas/Playlist"
 *                         mediaList:
 *                           type: array
 *                           items:
 *                             nullable: true
 *                             description: Null if the media no longer exists.
 *                             allOf:
 *                               - $ref: "#/components/schemas/Media"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: '`"Playlist not found"`.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/:playlist", authToken, async (request, response) => {
  const { playlist } = request.params;

  return playlistService.getAllMediaInPlaylist(playlist, response);
});

module.exports = router;
