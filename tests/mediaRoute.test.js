jest.mock("../client/slackClient", () => ({
  postMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../client/tmdbClient", () => ({
  getDetailsById: jest.fn(),
  getCreditsById: jest.fn(),
}));

jest.mock("../client/spotifyClient", () => ({
  searchTrackBySpotifyId: jest.fn(),
}));

jest.mock("../client/googleClient", () => ({
  searchForBooksById: jest.fn(),
}));

const request = require("supertest");
const app = require("../app");
const tmdbClient = require("../client/tmdbClient");
const spotifyClient = require("../client/spotifyClient");
const googleClient = require("../client/googleClient");
const MediaModel = require("../repository/mediaModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser } = require("./helpers/seed");

const movieDetails = {
  original_title: "Route Movie",
  release_date: "2022-02-02",
  overview: "Route movie overview",
  tagLine: "Route tagline",
  id: "route-movie-1",
  poster_path: "/route-poster.jpg",
};

const tvDetails = {
  original_name: "Route Show",
  first_air_date: "2023-03-03",
  overview: "Route show overview",
  tagLine: "Route show tagline",
  id: "route-tv-1",
  poster_path: "/route-tv.jpg",
};

const movieCredits = {
  cast: [{ name: "Route Actor", known_for_department: "Acting" }],
  crew: [],
};

const spotifyTrack = {
  id: "route-track-1",
  name: "Route Track",
  album: {
    name: "Route Album",
    images: [{ height: 640, url: "https://example.com/route-track.jpg" }],
  },
  artists: [{ name: "Route Artist" }],
};

const googleBook = {
  id: "route-book-1",
  volumeInfo: {
    title: "Route Book",
    publishedDate: "2024",
    description: "Route book description",
    categories: ["Sci-Fi"],
    imageLinks: { thumbnail: "https://example.com/route-book.jpg" },
    authors: ["Route Author"],
  },
};

describe("mediaRoute", () => {
  let accessToken;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    const user = await createTestUser({
      email: "media@example.com",
      userName: "mediauser",
    });
    accessToken = createAccessToken({
      email: user.email,
      userName: user.userName,
      id: user._id.toString(),
    });
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/media/add", () => {
    const mediaPayload = {
      name: "Added Via Route",
      mediaType: "MOVIE",
      mediaId: "route-add-1",
      picture: "https://example.com/added.jpg",
    };

    it("returns 401 when no token is provided", async () => {
      const response = await request(app)
        .post("/api/media/add")
        .send({ media: mediaPayload });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("returns 403 when the token is invalid", async () => {
      const response = await request(app)
        .post("/api/media/add")
        .set("Authorization", "invalid.token.value")
        .send({ media: mediaPayload });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(403);
      expect(response.body.errors.msg).toBe("Invalid token");
    });

    it("creates media when authenticated", async () => {
      const response = await request(app)
        .post("/api/media/add")
        .set("Authorization", accessToken)
        .send({ media: mediaPayload });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.data.media).toMatchObject(mediaPayload);

      const storedMedia = await MediaModel.findOne({ mediaId: "route-add-1" });
      expect(storedMedia).toBeTruthy();
    });

    it("returns 200 with the stored media when it already exists", async () => {
      await MediaModel.create(mediaPayload);

      const response = await request(app)
        .post("/api/media/add")
        .set("Authorization", accessToken)
        .send({ media: mediaPayload });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.media.mediaId).toBe("route-add-1");
      expect(await MediaModel.countDocuments()).toBe(1);
    });
  });

  describe("GET /api/media/movie/info/:tmdbId", () => {
    it("works for anonymous visitors with no token", async () => {
      await MediaModel.create({
        name: "Cached Route Movie",
        mediaType: "MOVIE",
        mediaId: "route-movie-1",
      });

      const response = await request(app).get(
        "/api/media/movie/info/route-movie-1"
      );

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.media.name).toBe("Cached Route Movie");
    });

    it("returns 403 for a request with an invalid token", async () => {
      const response = await request(app)
        .get("/api/media/movie/info/route-movie-1")
        .set("Authorization", "invalid.token.value");

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(403);
      expect(response.body.errors.msg).toBe("Invalid token");
    });

    it("returns cached movie media", async () => {
      await MediaModel.create({
        name: "Cached Route Movie",
        mediaType: "MOVIE",
        mediaId: "route-movie-1",
      });

      const response = await request(app)
        .get("/api/media/movie/info/route-movie-1")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.media.name).toBe("Cached Route Movie");
      expect(tmdbClient.getDetailsById).not.toHaveBeenCalled();
    });

    it("creates movie media from TMDB when not cached", async () => {
      tmdbClient.getDetailsById.mockResolvedValue(movieDetails);
      tmdbClient.getCreditsById.mockResolvedValue(movieCredits);

      const response = await request(app)
        .get("/api/media/movie/info/route-movie-1")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.data.media).toMatchObject({
        name: "Route Movie",
        mediaType: "MOVIE",
        mediaId: "route-movie-1",
      });
    });
  });

  describe("GET /api/media/tv/info/:tmdbId", () => {
    it("creates TV media from TMDB when not cached", async () => {
      tmdbClient.getDetailsById.mockResolvedValue(tvDetails);
      tmdbClient.getCreditsById.mockResolvedValue(movieCredits);

      const response = await request(app)
        .get("/api/media/tv/info/route-tv-1")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.data.media).toMatchObject({
        name: "Route Show",
        mediaType: "TV",
        mediaId: "route-tv-1",
      });
    });
  });

  describe("GET /api/media/music/info/:spotifyId", () => {
    it("works for anonymous visitors with no token", async () => {
      spotifyClient.searchTrackBySpotifyId.mockResolvedValue(spotifyTrack);

      const response = await request(app).get(
        "/api/media/music/info/route-track-1"
      );

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.data.media.name).toBe("Route Track");
    });

    it("creates music media from Spotify when not cached", async () => {
      spotifyClient.searchTrackBySpotifyId.mockResolvedValue(spotifyTrack);

      const response = await request(app)
        .get("/api/media/music/info/route-track-1")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.data.media).toMatchObject({
        name: "Route Track",
        mediaType: "MUSIC",
        mediaId: "route-track-1",
        album: "Route Album",
      });
    });
  });

  describe("GET /api/media/book/info/:googleBookId", () => {
    it("works for anonymous visitors with no token", async () => {
      googleClient.searchForBooksById.mockResolvedValue(googleBook);

      const response = await request(app).get(
        "/api/media/book/info/route-book-1"
      );

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.data.media.name).toBe("Route Book");
    });

    it("creates book media from Google Books when not cached", async () => {
      googleClient.searchForBooksById.mockResolvedValue(googleBook);

      const response = await request(app)
        .get("/api/media/book/info/route-book-1")
        .set("Authorization", accessToken);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(201);
      expect(response.body.data.media).toMatchObject({
        name: "Route Book",
        mediaType: "BOOK",
        mediaId: "route-book-1",
        genre: "Sci-Fi",
      });
    });
  });

  describe("catalog failures", () => {
    const cases = [
      {
        name: "movie",
        path: "/api/media/movie/info/missing-id",
        mockEmpty: () => {
          tmdbClient.getDetailsById.mockResolvedValue({});
          tmdbClient.getCreditsById.mockResolvedValue(movieCredits);
        },
        mockFailure: () =>
          tmdbClient.getDetailsById.mockRejectedValue(new Error("TMDB down")),
        badGatewayMsg: "Unable to fetch media details from TMDB",
      },
      {
        name: "tv",
        path: "/api/media/tv/info/missing-id",
        mockEmpty: () => {
          tmdbClient.getDetailsById.mockResolvedValue({});
          tmdbClient.getCreditsById.mockResolvedValue(movieCredits);
        },
        mockFailure: () =>
          tmdbClient.getDetailsById.mockRejectedValue(new Error("TMDB down")),
        badGatewayMsg: "Unable to fetch media details from TMDB",
      },
      {
        name: "music",
        path: "/api/media/music/info/missing-id",
        mockEmpty: () =>
          spotifyClient.searchTrackBySpotifyId.mockResolvedValue({}),
        mockFailure: () =>
          spotifyClient.searchTrackBySpotifyId.mockRejectedValue(
            new Error("Spotify down")
          ),
        badGatewayMsg: "Unable to fetch media details from Spotify",
      },
      {
        name: "book",
        path: "/api/media/book/info/missing-id",
        mockEmpty: () => googleClient.searchForBooksById.mockResolvedValue({}),
        mockFailure: () =>
          googleClient.searchForBooksById.mockRejectedValue(
            new Error("Google Books down")
          ),
        badGatewayMsg: "Unable to fetch media details from Google Books",
      },
    ];

    it.each(cases)(
      "returns 404 when the $name catalog has no item",
      async ({ path, mockEmpty }) => {
        mockEmpty();

        const response = await request(app).get(path);

        expect(response).toSatisfyApiSpec();
        expect(response.status).toBe(404);
        expect(response.body.errors.msg).toBe("Media not found");
      }
    );

    it.each(cases)(
      "returns 502 when the $name catalog request fails",
      async ({ path, mockFailure, badGatewayMsg }) => {
        mockFailure();

        const response = await request(app).get(path);

        expect(response).toSatisfyApiSpec();
        expect(response.status).toBe(502);
        expect(response.body.errors.msg).toBe(badGatewayMsg);
      }
    );
  });
});
