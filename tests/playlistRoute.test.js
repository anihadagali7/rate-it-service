const request = require("supertest");
const app = require("../app");
const PlaylistModel = require("../repository/playlistModel");
const PlaylistMediaModel = require("../repository/playlist_mediaModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const {
  createTestUser,
  createTestMedia,
  createTestPlaylist,
} = require("./helpers/seed");

describe("playlistRoute", () => {
  let user;
  let otherUser;
  let accessToken;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
    otherUser = await createTestUser({
      email: "other@example.com",
      userName: "otheruser",
    });
    accessToken = createAccessToken({
      email: user.email,
      userName: user.userName,
      id: user._id.toString(),
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/playlist/create", () => {
    it("returns 401 when no token is provided", async () => {
      const response = await request(app)
        .post("/api/playlist/create")
        .send({ playlistName: "Route Playlist" });

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("creates a playlist for the authenticated user", async () => {
      const response = await request(app)
        .post("/api/playlist/create")
        .set("Authorization", accessToken)
        .send({ playlistName: "Route Playlist" });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.data.newPlaylist.name).toBe("Route Playlist");

      const storedPlaylist = await PlaylistModel.findOne({
        name: "Route Playlist",
      });
      expect(storedPlaylist.addedBy.toString()).toBe(user._id.toString());
    });

    it("uses JWT identity and ignores userName in the request body", async () => {
      const response = await request(app)
        .post("/api/playlist/create")
        .set("Authorization", accessToken)
        .send({
          playlistName: "Spoofed Owner Playlist",
          userName: otherUser.userName,
        });

      expect(response.status).toBe(201);

      const storedPlaylist = await PlaylistModel.findOne({
        name: "Spoofed Owner Playlist",
      });
      expect(storedPlaylist.addedBy.toString()).toBe(user._id.toString());
      expect(storedPlaylist.addedBy.toString()).not.toBe(
        otherUser._id.toString()
      );
    });
  });

  describe("POST /api/playlist/addMedia", () => {
    it("returns 403 when adding media to another user's playlist", async () => {
      const media = await createTestMedia();
      const otherPlaylist = await createTestPlaylist(otherUser);

      const response = await request(app)
        .post("/api/playlist/addMedia")
        .set("Authorization", accessToken)
        .send({
          playlistId: otherPlaylist._id,
          mediaId: media._id,
        });

      expect(response.status).toBe(403);
      expect(response.body.errors[0].msg).toBe("You do not own this playlist");
    });

    it("adds media to the authenticated user's playlist", async () => {
      const media = await createTestMedia();
      const playlist = await createTestPlaylist(user);

      const response = await request(app)
        .post("/api/playlist/addMedia")
        .set("Authorization", accessToken)
        .send({
          playlistId: playlist._id,
          mediaId: media._id,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");

      const playlistMedia = await PlaylistMediaModel.findOne({
        playlist: playlist._id,
        media: media._id,
      });
      expect(playlistMedia).toBeTruthy();
    });
  });

  describe("POST /api/playlist/addMediaToMultiplePlaylists", () => {
    it("adds media to multiple playlists owned by the authenticated user", async () => {
      const media = await createTestMedia();
      const playlistOne = await createTestPlaylist(user, { name: "One" });
      const playlistTwo = await createTestPlaylist(user, { name: "Two" });

      const response = await request(app)
        .post("/api/playlist/addMediaToMultiplePlaylists")
        .set("Authorization", accessToken)
        .send({
          playlistsToAdd: [playlistOne._id, playlistTwo._id],
          playlistsToRemove: [],
          mediaId: media._id,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");

      const links = await PlaylistMediaModel.find({ media: media._id });
      expect(links).toHaveLength(2);
    });
  });

  describe("GET /api/playlist/user/:userName", () => {
    it("requires authentication", async () => {
      const response = await request(app).get(
        `/api/playlist/user/${user.userName}`
      );

      expect(response.status).toBe(401);
    });

    it("returns playlists for the requested user", async () => {
      await createTestPlaylist(user, { name: "User Playlist" });

      const response = await request(app)
        .get(`/api/playlist/user/${user.userName}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data.playlistList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "User Playlist" }),
        ])
      );
    });
  });

  describe("GET /api/playlist/getPlaylistsWithThisMedia", () => {
    it("returns playlists for the authenticated user containing the media", async () => {
      const media = await createTestMedia();
      const playlist = await createTestPlaylist(user, { name: "Has Media" });
      await PlaylistMediaModel.create({
        playlist: playlist._id,
        media: media._id,
      });

      const response = await request(app)
        .get("/api/playlist/getPlaylistsWithThisMedia")
        .query({ mediaId: media._id.toString() })
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data.selectedPlaylists).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Has Media" }),
        ])
      );
    });
  });

  describe("GET /api/playlist/:playlist", () => {
    it("returns media in the playlist", async () => {
      const media = await createTestMedia();
      const playlist = await createTestPlaylist(user);
      await PlaylistMediaModel.create({
        playlist: playlist._id,
        media: media._id,
      });

      const response = await request(app)
        .get(`/api/playlist/${playlist._id}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data.mediaByPlaylist.mediaList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: media._id.toString(),
            name: "Test Media",
          }),
        ])
      );
    });
  });
});
