const PlaylistModel = require("../repository/playlistModel");
const PlaylistMediaModel = require("../repository/playlist_mediaModel");
const playlistService = require("../services/playlistService");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const {
  createTestUser,
  createTestMedia,
  createTestPlaylist,
} = require("./helpers/seed");

const createMockResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

describe("playlistService", () => {
  let user;
  let otherUser;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
    otherUser = await createTestUser({
      email: "other@example.com",
      userName: "otheruser",
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("createNewPlaylist", () => {
    it("creates a playlist for an existing user", async () => {
      const response = createMockResponse();

      await playlistService.createNewPlaylist(
        "My Playlist",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          newPlaylist: expect.objectContaining({
            name: "My Playlist",
          }),
        },
      });

      const storedPlaylist = await PlaylistModel.findOne({ name: "My Playlist" });
      expect(storedPlaylist).toBeTruthy();
      expect(storedPlaylist.addedBy.toString()).toBe(user._id.toString());
    });

    it("returns 404 when the user does not exist", async () => {
      const response = createMockResponse();

      await playlistService.createNewPlaylist(
        "Missing User Playlist",
        "ghostuser",
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "User not found" },
      });
    });
  });

  describe("addMediaToPlaylist", () => {
    it("adds media to a playlist owned by the authenticated user", async () => {
      const media = await createTestMedia();
      const playlist = await createTestPlaylist(user);
      const response = createMockResponse();

      await playlistService.addMediaToPlaylist(
        playlist._id,
        media._id,
        user._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          newPlaylist: expect.objectContaining({
            media: expect.objectContaining({ _id: media._id }),
            playlist: expect.objectContaining({ _id: playlist._id }),
          }),
        },
      });

      const updatedPlaylist = await PlaylistModel.findById(playlist._id);
      expect(updatedPlaylist.posters).toContain(media.picture);

      const playlistMedia = await PlaylistMediaModel.findOne({
        playlist: playlist._id,
        media: media._id,
      });
      expect(playlistMedia).toBeTruthy();
    });

    it("returns 404 when media does not exist", async () => {
      const playlist = await createTestPlaylist(user);
      const response = createMockResponse();

      await playlistService.addMediaToPlaylist(
        playlist._id,
        "000000000000000000000000",
        user._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Media not found" },
      });
    });

    it("returns 404 when playlist does not exist", async () => {
      const media = await createTestMedia();
      const response = createMockResponse();

      await playlistService.addMediaToPlaylist(
        "000000000000000000000000",
        media._id,
        user._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Playlist not found" },
      });
    });

    it("returns 403 when the authenticated user does not own the playlist", async () => {
      const media = await createTestMedia();
      const playlist = await createTestPlaylist(otherUser);
      const response = createMockResponse();

      await playlistService.addMediaToPlaylist(
        playlist._id,
        media._id,
        user._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "You do not own this playlist" },
      });
    });

    it("returns 409 when the media is already in the playlist", async () => {
      const media = await createTestMedia();
      const playlist = await createTestPlaylist(user);
      const response = createMockResponse();

      await playlistService.addMediaToPlaylist(
        playlist._id,
        media._id,
        user._id,
        response
      );

      await playlistService.addMediaToPlaylist(
        playlist._id,
        media._id,
        user._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(409);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "This media is already in the playlist" },
      });

      const playlistMediaLinks = await PlaylistMediaModel.find({
        playlist: playlist._id,
        media: media._id,
      });
      expect(playlistMediaLinks).toHaveLength(1);
    });
  });

  describe("addMediaToMultiplePlaylist", () => {
    it("adds media to multiple owned playlists", async () => {
      const media = await createTestMedia();
      const playlistOne = await createTestPlaylist(user, { name: "Playlist One" });
      const playlistTwo = await createTestPlaylist(user, { name: "Playlist Two" });
      const response = createMockResponse();

      await playlistService.addMediaToMultiplePlaylist(
        [playlistOne._id, playlistTwo._id],
        [],
        media._id,
        user._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({ status: "success" });

      const links = await PlaylistMediaModel.find({ media: media._id });
      expect(links).toHaveLength(2);
    });

    it("removes media from owned playlists", async () => {
      const media = await createTestMedia({
        picture: "https://example.com/remove-me.jpg",
      });
      const playlist = await createTestPlaylist(user, {
        name: "Removable",
        posters: ["https://example.com/remove-me.jpg"],
      });
      await PlaylistMediaModel.create({
        playlist: playlist._id,
        media: media._id,
      });
      const response = createMockResponse();

      await playlistService.addMediaToMultiplePlaylist(
        [],
        [playlist._id],
        media._id,
        user._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(200);

      const remainingLinks = await PlaylistMediaModel.find({
        playlist: playlist._id,
        media: media._id,
      });
      expect(remainingLinks).toHaveLength(0);

      const updatedPlaylist = await PlaylistModel.findById(playlist._id);
      expect(updatedPlaylist.posters).not.toContain(
        "https://example.com/remove-me.jpg"
      );
    });

    it("returns 403 when adding media to a playlist owned by another user", async () => {
      const media = await createTestMedia();
      const ownedPlaylist = await createTestPlaylist(user, { name: "Owned" });
      const otherPlaylist = await createTestPlaylist(otherUser, {
        name: "Other Playlist",
      });
      const response = createMockResponse();

      await playlistService.addMediaToMultiplePlaylist(
        [ownedPlaylist._id, otherPlaylist._id],
        [],
        media._id,
        user._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "You do not own this playlist" },
      });
    });
  });

  describe("getPlaylistForUser", () => {
    it("returns playlists for a user", async () => {
      await createTestPlaylist(user, { name: "First Playlist" });
      await createTestPlaylist(user, { name: "Second Playlist" });
      const response = createMockResponse();

      await playlistService.getPlaylistForUser(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          playlistList: expect.arrayContaining([
            expect.objectContaining({ name: "First Playlist" }),
            expect.objectContaining({ name: "Second Playlist" }),
          ]),
        },
      });
    });

    it("returns an empty list when the user has no playlists", async () => {
      const response = createMockResponse();

      await playlistService.getPlaylistForUser(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: { playlistList: [] },
      });
    });

    it("returns 404 when the user does not exist", async () => {
      const response = createMockResponse();

      await playlistService.getPlaylistForUser("ghostuser", response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "User not found" },
      });
    });
  });

  describe("getAllMediaInPlaylist", () => {
    it("returns playlist details with media items", async () => {
      const media = await createTestMedia();
      const playlist = await createTestPlaylist(user);
      await PlaylistMediaModel.create({
        playlist: playlist._id,
        media: media._id,
      });
      const response = createMockResponse();

      await playlistService.getAllMediaInPlaylist(playlist._id, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          mediaByPlaylist: expect.objectContaining({
            playlist: expect.objectContaining({ _id: playlist._id }),
            mediaList: [
              expect.objectContaining({
                _id: media._id,
                name: "Test Media",
              }),
            ],
          }),
        },
      });
    });

    it("returns 404 when playlist does not exist", async () => {
      const response = createMockResponse();

      await playlistService.getAllMediaInPlaylist(
        "000000000000000000000000",
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Playlist not found" },
      });
    });
  });

  describe("getPlaylistsWithThisMedia", () => {
    it("returns playlists owned by the user that contain the media", async () => {
      const media = await createTestMedia();
      const playlist = await createTestPlaylist(user, { name: "With Media" });
      const otherPlaylist = await createTestPlaylist(otherUser, {
        name: "Other User Playlist",
      });
      await PlaylistMediaModel.create({
        playlist: playlist._id,
        media: media._id,
      });
      await PlaylistMediaModel.create({
        playlist: otherPlaylist._id,
        media: media._id,
      });
      const response = createMockResponse();

      await playlistService.getPlaylistsWithThisMedia(
        user.userName,
        media._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          selectedPlaylists: [
            expect.objectContaining({
              name: "With Media",
            }),
          ],
        },
      });
      expect(
        response.json.mock.calls[0][0].data.selectedPlaylists
      ).toHaveLength(1);
    });

    it("returns an empty list when media is not in any playlists", async () => {
      const media = await createTestMedia();
      const response = createMockResponse();

      await playlistService.getPlaylistsWithThisMedia(
        user.userName,
        media._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "That media has not been added to any playlists",
        data: [],
      });
    });

    it("returns 404 when the user does not exist", async () => {
      const media = await createTestMedia();
      const response = createMockResponse();

      await playlistService.getPlaylistsWithThisMedia(
        "ghostuser",
        media._id,
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "User not found" },
      });
    });

    it("returns 404 when media does not exist", async () => {
      const response = createMockResponse();

      await playlistService.getPlaylistsWithThisMedia(
        user.userName,
        "000000000000000000000000",
        response
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Media not found" },
      });
    });
  });
});
