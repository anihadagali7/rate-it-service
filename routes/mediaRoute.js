const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");
const optionalAuthToken = require("../middleware/optionalAuthenticateToken");
const publicRateLimiter = require("../middleware/publicRateLimiter");

const mediaService = require("../services/mediaService");

/**
 * @openapi
 * /api/media/add:
 *   post:
 *     tags: [Media]
 *     summary: Add a media item
 *     description: >-
 *       Stores the media, or returns the existing item when one with the same
 *       `mediaId` and `mediaType` is already stored.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [media]
 *             properties:
 *               media:
 *                 type: object
 *                 description: Fields of the `Media` schema, without `_id`.
 *                 required: [name]
 *                 properties:
 *                   name:
 *                     type: string
 *                   mediaType:
 *                     type: string
 *                     enum: [MOVIE, BOOK, PODCAST, TV, MUSIC, THEATRE]
 *                   mediaId:
 *                     type: string
 *                   picture:
 *                     type: string
 *                   description:
 *                     type: string
 *     responses:
 *       200:
 *         description: The media was already stored; returns the existing item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       201:
 *         description: Media created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/add", authToken, async (request, response) => {
  const { media } = request.body;

  return mediaService.createNewMedia(media, response);
});

/**
 * @openapi
 * /api/media/movie/info/{tmdbId}:
 *   get:
 *     tags: [Media]
 *     summary: Get movie details
 *     description: >-
 *       Public. Returns the stored movie, or fetches it from TMDB and stores it
 *       on first view.
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: tmdbId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The movie was already stored.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       201:
 *         description: Fetched from TMDB and stored.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: "`\"Media not found\"`: TMDB returned no movie."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         description: >-
 *           `"Unable to fetch media details from TMDB"`. Also returned for ids
 *           TMDB doesn't know, since TMDB answers those with an error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.get(
  "/movie/info/:tmdbId",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { tmdbId } = request.params;

    return mediaService.getMovieTvShowDetails(tmdbId, "movie", response);
  }
);

/**
 * @openapi
 * /api/media/tv/info/{tmdbId}:
 *   get:
 *     tags: [Media]
 *     summary: Get TV show details
 *     description: >-
 *       Public. Returns the stored show, or fetches it from TMDB and stores it
 *       on first view.
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: tmdbId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The show was already stored.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       201:
 *         description: Fetched from TMDB and stored.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: "`\"Media not found\"`: TMDB returned no show."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         description: >-
 *           `"Unable to fetch media details from TMDB"`. Also returned for ids
 *           TMDB doesn't know, since TMDB answers those with an error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.get(
  "/tv/info/:tmdbId",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { tmdbId } = request.params;

    return mediaService.getMovieTvShowDetails(tmdbId, "tv", response);
  }
);

/**
 * @openapi
 * /api/media/music/info/{spotifyId}:
 *   get:
 *     tags: [Media]
 *     summary: Get song details
 *     description: >-
 *       Public. Returns the stored track, or fetches it from Spotify and
 *       stores it on first view.
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: spotifyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The track was already stored.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       201:
 *         description: Fetched from Spotify and stored.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: "`\"Media not found\"`: Spotify returned no track."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         description: >-
 *           `"Unable to fetch media details from Spotify"`. Also returned for
 *           ids Spotify doesn't know, since Spotify answers those with an
 *           error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.get(
  "/music/info/:spotifyId",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { spotifyId } = request.params;

    return mediaService.getMusicDetails(spotifyId, response);
  }
);

/**
 * @openapi
 * /api/media/book/info/{googleBookId}:
 *   get:
 *     tags: [Media]
 *     summary: Get book details
 *     description: >-
 *       Public. Returns the stored book, or fetches it from Google Books and
 *       stores it on first view.
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     parameters:
 *       - in: path
 *         name: googleBookId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The book was already stored.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       201:
 *         description: Fetched from Google Books and stored.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MediaResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       404:
 *         description: "`\"Media not found\"`: Google Books returned no volume."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         description: >-
 *           `"Unable to fetch media details from Google Books"`. Also returned
 *           for ids Google Books doesn't know, since it answers those with an
 *           error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.get(
  "/book/info/:googleBookId",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { googleBookId } = request.params;

    return mediaService.getBookDetails(googleBookId, response);
  }
);

module.exports = router;
