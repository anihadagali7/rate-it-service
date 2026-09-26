jest.mock("../client/tmdbClient", () => ({
  searchMovie: jest.fn(),
  searchTvShow: jest.fn(),
}));

jest.mock("../client/spotifyClient", () => ({
  searchByTrackArtist: jest.fn(),
}));

jest.mock("../client/googleClient", () => ({
  searchForBooks: jest.fn(),
}));

const request = require("supertest");
const app = require("../app");
const tmdbClient = require("../client/tmdbClient");
const spotifyClient = require("../client/spotifyClient");
const googleClient = require("../client/googleClient");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser } = require("./helpers/seed");

const movieSearchResult = {
  data: [
    {
      id: 101,
      original_title: "Route Movie",
      overview: "Route movie overview",
      poster_path: "/route-movie.jpg",
    },
  ],
  totalPages: 1,
};

const tvSearchResult = {
  data: [
    {
      id: 202,
      name: "Route Show",
      overview: "Route show overview",
      poster_path: "/route-tv.jpg",
    },
  ],
  totalPages: 1,
};

const musicSearchResult = {
  items: [
    {
      id: "route-track",
      name: "Route Track",
      album: {
        albumType: "album",
        name: "Route Album",
        images: [{ height: 640, url: "https://example.com/route-track.jpg" }],
      },
      artists: [{ name: "Route Artist" }],
    },
  ],
  total: 20,
};

const bookSearchResult = {
  items: [
    {
      id: "route-book",
      volumeInfo: {
        title: "Route Book",
        authors: ["Route Author"],
        description: "Route book description",
        imageLinks: { thumbnail: "https://example.com/route-book.jpg" },
      },
    },
  ],
  totalItems: 20,
};

describe("searchRoute", () => {
  let user;
  let accessToken;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser({
      userName: "searchuser",
      firstName: "Search",
      email: "search@example.com",
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

  describe("POST /api/search/movie", () => {
    it("returns movie search results for anonymous visitors with no token", async () => {
      tmdbClient.searchMovie.mockResolvedValue(movieSearchResult);

      const response = await request(app)
        .post("/api/search/movie")
        .send({ keyWord: "matrix", page: 1 });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.mediaList).toEqual([
        expect.objectContaining({
          name: "Route Movie",
          mediaType: "movie",
        }),
      ]);
    });

    it("returns 403 for a request with an invalid token", async () => {
      const response = await request(app)
        .post("/api/search/movie")
        .set("Authorization", "invalid.token.value")
        .send({ keyWord: "matrix", page: 1 });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(403);
      expect(response.body.errors.msg).toBe("Invalid token");
    });

    it("returns movie search results when authenticated", async () => {
      tmdbClient.searchMovie.mockResolvedValue(movieSearchResult);

      const response = await request(app)
        .post("/api/search/movie")
        .set("Authorization", accessToken)
        .send({ keyWord: "matrix", page: 1 });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.mediaType).toBe("movie");
      expect(response.body.data.mediaList).toEqual([
        expect.objectContaining({
          name: "Route Movie",
          mediaType: "movie",
        }),
      ]);
      expect(response.body.data.totalPages).toBe(1);
    });
  });

  describe("POST /api/search/tv", () => {
    it("returns TV search results when authenticated", async () => {
      tmdbClient.searchTvShow.mockResolvedValue(tvSearchResult);

      const response = await request(app)
        .post("/api/search/tv")
        .set("Authorization", accessToken)
        .send({ keyWord: "office", page: 1 });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.mediaType).toBe("tv");
      expect(response.body.data.mediaList[0]).toMatchObject({
        name: "Route Show",
        mediaType: "tv",
      });
    });
  });

  describe("POST /api/search/music", () => {
    it("returns music search results when authenticated", async () => {
      spotifyClient.searchByTrackArtist.mockResolvedValue(musicSearchResult);

      const response = await request(app)
        .post("/api/search/music")
        .set("Authorization", accessToken)
        .send({ keyWord: "beatles", page: 1 });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.mediaType).toBe("music");
      expect(response.body.data.mediaList[0]).toMatchObject({
        name: "Route Track",
        mediaType: "music",
        albumName: "Route Album",
      });
    });
  });

  describe("POST /api/search/user", () => {
    it("returns 401 when no token is provided", async () => {
      const response = await request(app)
        .post("/api/search/user")
        .send({ keyWord: "matched" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("returns matching users from the database", async () => {
      await createTestUser({
        userName: "matcheduser",
        firstName: "Matched",
        email: "matched@example.com",
      });

      const response = await request(app)
        .post("/api/search/user")
        .set("Authorization", accessToken)
        .send({ keyWord: "matched" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.mediaType).toBe("user");
      expect(response.body.data.mediaList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userName: "matcheduser",
            firstName: "Matched",
          }),
        ])
      );
      expect(
        response.body.data.mediaList.every((result) => !result.password)
      ).toBe(true);
    });
  });

  describe("POST /api/search/book", () => {
    it("returns book search results when authenticated", async () => {
      googleClient.searchForBooks.mockResolvedValue(bookSearchResult);

      const response = await request(app)
        .post("/api/search/book")
        .set("Authorization", accessToken)
        .send({ keyWord: "dune", page: 1 });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.mediaType).toBe("book");
      expect(response.body.data.mediaList[0]).toMatchObject({
        name: "Route Book",
        mediaType: "book",
      });
    });
  });

  describe("POST /api/search/all", () => {
    it("returns aggregated search results when authenticated", async () => {
      tmdbClient.searchMovie.mockResolvedValue(movieSearchResult);
      tmdbClient.searchTvShow.mockResolvedValue(tvSearchResult);
      spotifyClient.searchByTrackArtist.mockResolvedValue(musicSearchResult);
      googleClient.searchForBooks.mockResolvedValue(bookSearchResult);

      const response = await request(app)
        .post("/api/search/all")
        .set("Authorization", accessToken)
        .send({ keyWord: "route" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.fullSearchList.movie[0]).toMatchObject({
        name: "Route Movie",
      });
      expect(response.body.data.fullSearchList.tv[0]).toMatchObject({
        name: "Route Show",
      });
      expect(response.body.data.fullSearchList.music[0]).toMatchObject({
        name: "Route Track",
      });
      expect(response.body.data.fullSearchList.book[0]).toMatchObject({
        name: "Route Book",
      });
    });

    it("returns an empty list for a catalog that fails", async () => {
      tmdbClient.searchMovie.mockRejectedValue(new Error("TMDB down"));
      tmdbClient.searchTvShow.mockResolvedValue(tvSearchResult);
      spotifyClient.searchByTrackArtist.mockResolvedValue(musicSearchResult);
      googleClient.searchForBooks.mockResolvedValue(bookSearchResult);

      const response = await request(app)
        .post("/api/search/all")
        .send({ keyWord: "route" });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.fullSearchList.movie).toEqual([]);
      expect(response.body.data.fullSearchList.tv).toHaveLength(1);
    });
  });

  describe("catalog failures", () => {
    it.each([
      {
        path: "/api/search/movie",
        mockFailure: () =>
          tmdbClient.searchMovie.mockRejectedValue(new Error("TMDB down")),
        msg: "Unable to search movies",
      },
      {
        path: "/api/search/tv",
        mockFailure: () =>
          tmdbClient.searchTvShow.mockRejectedValue(new Error("TMDB down")),
        msg: "Unable to search TV shows",
      },
      {
        path: "/api/search/music",
        mockFailure: () =>
          spotifyClient.searchByTrackArtist.mockRejectedValue(
            new Error("Spotify down")
          ),
        msg: "Unable to search music",
      },
      {
        path: "/api/search/book",
        mockFailure: () =>
          googleClient.searchForBooks.mockRejectedValue(
            new Error("Google Books down")
          ),
        msg: "Unable to search books",
      },
    ])("returns 502 from $path when the catalog fails", async (testCase) => {
      testCase.mockFailure();

      const response = await request(app)
        .post(testCase.path)
        .send({ keyWord: "route", page: 1 });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(502);
      expect(response.body.errors.msg).toBe(testCase.msg);
    });
  });
});
