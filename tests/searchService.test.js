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

const tmdbClient = require("../client/tmdbClient");
const spotifyClient = require("../client/spotifyClient");
const googleClient = require("../client/googleClient");
const searchService = require("../services/searchService");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createTestUser } = require("./helpers/seed");

const createMockResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

const movieSearchResult = {
  data: [
    {
      id: 101,
      original_title: "Search Movie",
      overview: "Movie overview",
      poster_path: "/movie.jpg",
    },
  ],
  totalPages: 3,
};

const tvSearchResult = {
  data: [
    {
      id: 202,
      name: "Search Show",
      overview: "Show overview",
      poster_path: "/tv.jpg",
    },
  ],
  totalPages: 2,
};

const musicSearchResult = {
  items: [
    {
      id: "track-1",
      name: "Search Track",
      album: {
        albumType: "album",
        name: "Search Album",
        images: [{ height: 640, url: "https://example.com/track.jpg" }],
      },
      artists: [{ name: "Search Artist" }],
    },
  ],
  total: 40,
};

const bookSearchResult = {
  items: [
    {
      id: "book-1",
      volumeInfo: {
        title: "Search Book",
        authors: ["Book Author"],
        description: "Book description",
        imageLinks: { thumbnail: "https://example.com/book.jpg" },
      },
    },
  ],
  totalItems: 25,
};

describe("searchService", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("searchMovies", () => {
    it("returns formatted movie search results", async () => {
      tmdbClient.searchMovie.mockResolvedValue(movieSearchResult);
      const response = createMockResponse();

      await searchService.searchMovies("matrix", 1, response);

      expect(tmdbClient.searchMovie).toHaveBeenCalledWith("matrix", 1);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          mediaList: [
            {
              mediaId: 101,
              name: "Search Movie",
              description: "Movie overview",
              poster: "https://image.tmdb.org/t/p/w500/movie.jpg",
              mediaType: "movie",
            },
          ],
          totalPages: 3,
        },
        mediaType: "movie",
      });
    });

    it("returns 502 when TMDB search fails", async () => {
      tmdbClient.searchMovie.mockRejectedValue(new Error("TMDB down"));
      const response = createMockResponse();

      await searchService.searchMovies("matrix", 1, response);

      expect(response.status).toHaveBeenCalledWith(502);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Unable to search movies" },
      });
    });
  });

  describe("searchTvShows", () => {
    it("returns formatted TV search results", async () => {
      tmdbClient.searchTvShow.mockResolvedValue(tvSearchResult);
      const response = createMockResponse();

      await searchService.searchTvShows("office", 2, response);

      expect(tmdbClient.searchTvShow).toHaveBeenCalledWith("office", 2);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          mediaList: [
            {
              mediaId: 202,
              name: "Search Show",
              description: "Show overview",
              poster: "https://image.tmdb.org/t/p/w500/tv.jpg",
              mediaType: "tv",
            },
          ],
          totalPages: 2,
        },
        mediaType: "tv",
      });
    });
  });

  describe("searchMusic", () => {
    it("returns formatted music search results with total pages", async () => {
      spotifyClient.searchByTrackArtist.mockResolvedValue(musicSearchResult);
      const response = createMockResponse();

      await searchService.searchMusic("beatles", 1, response);

      expect(spotifyClient.searchByTrackArtist).toHaveBeenCalledWith(
        "beatles",
        1
      );
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          mediaList: [
            {
              albumType: "album",
              albumName: "Search Album",
              name: "Search Track",
              mediaId: "track-1",
              poster: "https://example.com/track.jpg",
              artists: "Search Artist",
              mediaType: "music",
            },
          ],
          totalPages: 2,
        },
        mediaType: "music",
      });
    });
  });

  describe("searchUsers", () => {
    it("filters users by username or first name", async () => {
      await createTestUser({
        userName: "anihadagali7",
        firstName: "Ani",
        email: "ani@example.com",
      });
      await createTestUser({
        userName: "otheruser",
        firstName: "Other",
        email: "other@example.com",
      });
      const response = createMockResponse();

      await searchService.searchUsers("ani", response);

      expect(response.status).toHaveBeenCalledWith(200);
      const mediaList = response.json.mock.calls[0][0].data.mediaList;
      expect(mediaList).toHaveLength(1);
      expect(mediaList[0]).toEqual(
        expect.objectContaining({
          userName: "anihadagali7",
          firstName: "Ani",
        })
      );
      expect(mediaList[0].email).toBeUndefined();
      expect(mediaList[0].phoneNumber).toBeUndefined();
    });

    it("returns an empty list when no users match", async () => {
      await createTestUser();
      const response = createMockResponse();

      await searchService.searchUsers("nomatch", response);

      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: { mediaList: [] },
        mediaType: "user",
      });
    });
  });

  describe("searchBooks", () => {
    it("returns formatted book search results", async () => {
      googleClient.searchForBooks.mockResolvedValue(bookSearchResult);
      const response = createMockResponse();

      await searchService.searchBooks("dune", 1, response);

      expect(googleClient.searchForBooks).toHaveBeenCalledWith("dune", 1);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          mediaList: [
            {
              mediaId: "book-1",
              name: "Search Book",
              author: "Book Author",
              description: "Book description",
              poster: "https://example.com/book.jpg",
              mediaType: "book",
            },
          ],
          totalPages: 2,
        },
        mediaType: "book",
      });
    });
  });

  describe("searchAllMedia", () => {
    it("aggregates results from all providers", async () => {
      tmdbClient.searchMovie.mockResolvedValue(movieSearchResult);
      tmdbClient.searchTvShow.mockResolvedValue(tvSearchResult);
      spotifyClient.searchByTrackArtist.mockResolvedValue(musicSearchResult);
      googleClient.searchForBooks.mockResolvedValue(bookSearchResult);
      const response = createMockResponse();

      await searchService.searchAllMedia("search", response);

      expect(tmdbClient.searchMovie).toHaveBeenCalledWith("search");
      expect(tmdbClient.searchTvShow).toHaveBeenCalledWith("search");
      expect(spotifyClient.searchByTrackArtist).toHaveBeenCalledWith("search");
      expect(googleClient.searchForBooks).toHaveBeenCalledWith("search");
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          fullSearchList: {
            movie: [
              expect.objectContaining({
                name: "Search Movie",
                mediaType: "movie",
              }),
            ],
            tv: [
              expect.objectContaining({
                name: "Search Show",
                mediaType: "tv",
              }),
            ],
            music: [
              expect.objectContaining({
                name: "Search Track",
                mediaType: "music",
              }),
            ],
            book: [
              expect.objectContaining({
                name: "Search Book",
                mediaType: "book",
              }),
            ],
          },
        },
      });
    });

    it("returns empty arrays for providers that fail", async () => {
      tmdbClient.searchMovie.mockResolvedValue(movieSearchResult);
      tmdbClient.searchTvShow.mockRejectedValue(new Error("TV down"));
      spotifyClient.searchByTrackArtist.mockRejectedValue(
        new Error("Spotify down")
      );
      googleClient.searchForBooks.mockResolvedValue(bookSearchResult);
      const response = createMockResponse();

      await searchService.searchAllMedia("search", response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          fullSearchList: {
            movie: [
              expect.objectContaining({ name: "Search Movie" }),
            ],
            tv: [],
            music: [],
            book: [
              expect.objectContaining({ name: "Search Book" }),
            ],
          },
        },
      });
    });
  });
});
