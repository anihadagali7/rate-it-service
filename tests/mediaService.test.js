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

const slackClient = require("../client/slackClient");
const tmdbClient = require("../client/tmdbClient");
const spotifyClient = require("../client/spotifyClient");
const googleClient = require("../client/googleClient");
const MediaModel = require("../repository/mediaModel");
const mediaService = require("../services/mediaService");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

const createMockResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

const movieDetails = {
  original_title: "Test Movie",
  release_date: "2020-01-01",
  overview: "A test movie overview",
  tagLine: "Test tagline",
  id: "movie-123",
  poster_path: "/poster.jpg",
};

const tvDetails = {
  original_name: "Test Show",
  first_air_date: "2019-05-10",
  overview: "A test show overview",
  tagLine: "Show tagline",
  id: "tv-456",
  poster_path: "/tv-poster.jpg",
};

const movieCredits = {
  cast: [
    { name: "Actor One", known_for_department: "Acting" },
    { name: "Actor Two", known_for_department: "Acting" },
    { name: "Director One", known_for_department: "Directing" },
  ],
  crew: [
    {
      name: "Producer One",
      job: "Executive Producer",
      known_for_department: "Production",
    },
  ],
};

const spotifyTrack = {
  id: "track-789",
  name: "Test Track",
  album: {
    name: "Test Album",
    images: [{ height: 640, url: "https://example.com/track.jpg" }],
  },
  artists: [{ name: "Artist One" }, { name: "Artist Two" }],
};

const googleBook = {
  id: "book-321",
  volumeInfo: {
    title: "Test Book",
    publishedDate: "2021-03-15",
    description: "A test book description",
    categories: ["Fiction", "Drama"],
    imageLinks: { thumbnail: "https://example.com/book.jpg" },
    authors: ["Author One", "Author Two"],
  },
};

describe("mediaService", () => {
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

  describe("createNewMedia", () => {
    it("persists media, notifies Slack, and returns 201", async () => {
      const response = createMockResponse();
      const mediaPayload = {
        name: "Manual Media",
        mediaType: "MOVIE",
        mediaId: "manual-1",
        picture: "https://example.com/manual.jpg",
      };

      await mediaService.createNewMedia(mediaPayload, response);

      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          media: expect.objectContaining({
            name: "Manual Media",
            mediaType: "MOVIE",
            mediaId: "manual-1",
          }),
        },
      });
      expect(slackClient.postMessage).toHaveBeenCalledWith(
        "Manual Media - MOVIE has just been added!",
        process.env.SLACK_MEDIA_URL
      );

      const storedMedia = await MediaModel.findOne({ mediaId: "manual-1" });
      expect(storedMedia).toBeTruthy();
      expect(storedMedia.name).toBe("Manual Media");
    });

    it("returns the existing media when the same mediaId and mediaType already exist", async () => {
      const existing = await MediaModel.create({
        name: "Existing Media",
        mediaType: "MOVIE",
        mediaId: "manual-1",
      });
      const response = createMockResponse();

      await mediaService.createNewMedia(
        {
          name: "Duplicate Media",
          mediaType: "MOVIE",
          mediaId: "manual-1",
        },
        response
      );

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          media: expect.objectContaining({ _id: existing._id, name: "Existing Media" }),
        },
      });
      expect(slackClient.postMessage).not.toHaveBeenCalled();
      expect(await MediaModel.countDocuments({ mediaId: "manual-1" })).toBe(1);
    });
  });

  describe("getMovieTvShowDetails", () => {
    it("returns an existing movie without calling TMDB", async () => {
      const existing = await MediaModel.create({
        name: "Cached Movie",
        mediaType: "MOVIE",
        mediaId: "movie-123",
      });
      const response = createMockResponse();

      await mediaService.getMovieTvShowDetails("movie-123", "movie", response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: { media: expect.objectContaining({ _id: existing._id }) },
      });
      expect(tmdbClient.getDetailsById).not.toHaveBeenCalled();
      expect(tmdbClient.getCreditsById).not.toHaveBeenCalled();
    });

    it("fetches movie details from TMDB and creates media when not cached", async () => {
      tmdbClient.getDetailsById.mockResolvedValue(movieDetails);
      tmdbClient.getCreditsById.mockResolvedValue(movieCredits);
      const response = createMockResponse();

      await mediaService.getMovieTvShowDetails("movie-123", "movie", response);

      expect(tmdbClient.getDetailsById).toHaveBeenCalledWith(
        "movie-123",
        "movie"
      );
      expect(tmdbClient.getCreditsById).toHaveBeenCalledWith(
        "movie-123",
        "movie"
      );
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          media: expect.objectContaining({
            name: "Test Movie",
            mediaType: "MOVIE",
            mediaId: "movie-123",
            description: "A test movie overview",
            picture: "https://image.tmdb.org/t/p/w500/poster.jpg",
            cast: ["Actor One", "Actor Two"],
            director: ["Director One"],
            producer: ["Producer One"],
          }),
        },
      });
      expect(slackClient.postMessage).toHaveBeenCalled();
    });

    it("fetches TV details from TMDB and stores media as TV", async () => {
      tmdbClient.getDetailsById.mockResolvedValue(tvDetails);
      tmdbClient.getCreditsById.mockResolvedValue(movieCredits);
      const response = createMockResponse();

      await mediaService.getMovieTvShowDetails("tv-456", "tv", response);

      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          media: expect.objectContaining({
            name: "Test Show",
            mediaType: "TV",
            mediaId: "tv-456",
          }),
        },
      });
    });

    it("returns 502 when TMDB request fails", async () => {
      tmdbClient.getDetailsById.mockRejectedValue(new Error("TMDB down"));
      const response = createMockResponse();

      await mediaService.getMovieTvShowDetails("movie-123", "movie", response);

      expect(response.status).toHaveBeenCalledWith(502);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Unable to fetch media details from TMDB" },
      });
    });
  });

  describe("getMusicDetails", () => {
    it("returns existing music without calling Spotify", async () => {
      const existing = await MediaModel.create({
        name: "Cached Track",
        mediaType: "MUSIC",
        mediaId: "track-789",
      });
      const response = createMockResponse();

      await mediaService.getMusicDetails("track-789", response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: { media: expect.objectContaining({ _id: existing._id }) },
      });
      expect(spotifyClient.searchTrackBySpotifyId).not.toHaveBeenCalled();
    });

    it("fetches track details from Spotify and creates music media", async () => {
      spotifyClient.searchTrackBySpotifyId.mockResolvedValue(spotifyTrack);
      const response = createMockResponse();

      await mediaService.getMusicDetails("track-789", response);

      expect(spotifyClient.searchTrackBySpotifyId).toHaveBeenCalledWith(
        "track-789"
      );
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          media: expect.objectContaining({
            name: "Test Track",
            mediaType: "MUSIC",
            mediaId: "track-789",
            album: "Test Album",
            picture: "https://example.com/track.jpg",
            artist: ["Artist One", "Artist Two"],
          }),
        },
      });
      expect(slackClient.postMessage).toHaveBeenCalled();
    });

    it("returns 502 when Spotify request fails", async () => {
      spotifyClient.searchTrackBySpotifyId.mockRejectedValue(
        new Error("Spotify down")
      );
      const response = createMockResponse();

      await mediaService.getMusicDetails("track-789", response);

      expect(response.status).toHaveBeenCalledWith(502);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Unable to fetch media details from Spotify" },
      });
    });
  });

  describe("getBookDetails", () => {
    it("returns existing book without calling Google Books", async () => {
      const existing = await MediaModel.create({
        name: "Cached Book",
        mediaType: "BOOK",
        mediaId: "book-321",
      });
      const response = createMockResponse();

      await mediaService.getBookDetails("book-321", response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: { media: expect.objectContaining({ _id: existing._id }) },
      });
      expect(googleClient.searchForBooksById).not.toHaveBeenCalled();
    });

    it("fetches book details from Google Books and creates book media", async () => {
      googleClient.searchForBooksById.mockResolvedValue(googleBook);
      const response = createMockResponse();

      await mediaService.getBookDetails("book-321", response);

      expect(googleClient.searchForBooksById).toHaveBeenCalledWith("book-321");
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          media: expect.objectContaining({
            name: "Test Book",
            mediaType: "BOOK",
            mediaId: "book-321",
            description: "A test book description",
            genre: "Fiction,Drama",
            picture: "https://example.com/book.jpg",
            author: ["Author One", "Author Two"],
          }),
        },
      });
      expect(slackClient.postMessage).toHaveBeenCalled();
    });

    it("returns 502 when Google Books request fails", async () => {
      googleClient.searchForBooksById.mockRejectedValue(
        new Error("Google Books down")
      );
      const response = createMockResponse();

      await mediaService.getBookDetails("book-321", response);

      expect(response.status).toHaveBeenCalledWith(502);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "Unable to fetch media details from Google Books" },
      });
    });
  });
});
