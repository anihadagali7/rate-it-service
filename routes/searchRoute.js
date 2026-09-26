const express = require("express");
const router = express.Router();
const authToken = require("../middleware/authenticateToken");
const optionalAuthToken = require("../middleware/optionalAuthenticateToken");
const publicRateLimiter = require("../middleware/publicRateLimiter");

const searchService = require("../services/searchService");

/**
 * @openapi
 * /api/search/movie:
 *   post:
 *     tags: [Search]
 *     summary: Search movies on TMDB
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SearchRequest"
 *     responses:
 *       200:
 *         description: One page of results.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MovieTvSearchResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         description: "`\"Unable to search movies\"`."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.post(
  "/movie",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord, page } = request.body;

    return searchService.searchMovies(keyWord, page, response);
  }
);

/**
 * @openapi
 * /api/search/tv:
 *   post:
 *     tags: [Search]
 *     summary: Search TV shows on TMDB
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SearchRequest"
 *     responses:
 *       200:
 *         description: One page of results.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MovieTvSearchResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         description: "`\"Unable to search TV shows\"`."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.post(
  "/tv",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord, page } = request.body;

    return searchService.searchTvShows(keyWord, page, response);
  }
);

/**
 * @openapi
 * /api/search/music:
 *   post:
 *     tags: [Search]
 *     summary: Search songs on Spotify
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SearchRequest"
 *     responses:
 *       200:
 *         description: One page of results (20 per page).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MusicSearchResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         description: "`\"Unable to search music\"`."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.post(
  "/music",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord, page } = request.body;

    return searchService.searchMusic(keyWord, page, response);
  }
);

// Kept behind required auth, unlike the media search routes above — profile
// pages (/profile/:userName) still require login to view, so surfacing user
// search results to anonymous visitors would just lead to a login-wall on
// click.
/**
 * @openapi
 * /api/search/user:
 *   post:
 *     tags: [Search]
 *     summary: Search users by userName or first name
 *     description: >-
 *       Case-insensitive. Returns every match with no paging; `page` is
 *       ignored. Results come back under `mediaList`, like the media searches.
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [keyWord]
 *             properties:
 *               keyWord:
 *                 type: string
 *     responses:
 *       200:
 *         description: Matching users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, data, mediaType]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 data:
 *                   type: object
 *                   required: [mediaList]
 *                   properties:
 *                     mediaList:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/PublicUser"
 *                 mediaType:
 *                   type: string
 *                   enum: [user]
 *       401:
 *         $ref: "#/components/responses/TokenNotFound"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/user", authToken, async (request, response) => {
  const { keyWord } = request.body;

  return searchService.searchUsers(keyWord, response);
});

/**
 * @openapi
 * /api/search/book:
 *   post:
 *     tags: [Search]
 *     summary: Search books on Google Books
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SearchRequest"
 *     responses:
 *       200:
 *         description: One page of results (20 per page).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BookSearchResponse"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 *       502:
 *         description: "`\"Unable to search books\"`."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.post(
  "/book",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord, page } = request.body;

    return searchService.searchBooks(keyWord, page, response);
  }
);

/**
 * @openapi
 * /api/search/all:
 *   post:
 *     tags: [Search]
 *     summary: Search movies, TV, music, and books at once
 *     description: >-
 *       First page of each catalog. A catalog that fails comes back as an
 *       empty list instead of failing the whole request.
 *     security:
 *       - {}
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [keyWord]
 *             properties:
 *               keyWord:
 *                 type: string
 *     responses:
 *       200:
 *         description: Results grouped by catalog.
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
 *                   required: [fullSearchList]
 *                   properties:
 *                     fullSearchList:
 *                       type: object
 *                       required: [movie, tv, music, book]
 *                       properties:
 *                         movie:
 *                           type: array
 *                           items:
 *                             $ref: "#/components/schemas/MovieTvSearchResult"
 *                         tv:
 *                           type: array
 *                           items:
 *                             $ref: "#/components/schemas/MovieTvSearchResult"
 *                         music:
 *                           type: array
 *                           items:
 *                             $ref: "#/components/schemas/MusicSearchResult"
 *                         book:
 *                           type: array
 *                           items:
 *                             $ref: "#/components/schemas/BookSearchResult"
 *       403:
 *         $ref: "#/components/responses/InvalidToken"
 *       429:
 *         $ref: "#/components/responses/RateLimited"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post(
  "/all",
  publicRateLimiter,
  optionalAuthToken,
  async (request, response) => {
    const { keyWord } = request.body;

    return searchService.searchAllMedia(keyWord, response);
  }
);

module.exports = router;
