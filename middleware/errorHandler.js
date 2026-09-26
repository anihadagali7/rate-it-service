const { sendError } = require("../utils/httpErrors");

/**
 * Last-resort error handler, registered after every route in app.js.
 *
 * Express 5 forwards errors thrown (or promises rejected) by route handlers
 * here, so an unexpected failure becomes a JSON response instead of a hung
 * request or a crashed process. Services should still return expected errors
 * (400/404/409/502) themselves; this only catches what they don't.
 */
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature.
const errorHandler = (error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  // Thrown by express.json() / express.urlencoded() before any route runs.
  if (error.type === "entity.parse.failed") {
    return sendError(response, 400, "Request body must be valid JSON");
  }
  if (error.type === "entity.too.large") {
    return sendError(response, 413, "Request body is too large");
  }

  // Method and path only: never log bodies or headers (passwords, tokens).
  console.error(
    `Unhandled error on ${request.method} ${request.originalUrl.split("?")[0]}:`,
    error
  );
  return sendError(response, 500, "Something went wrong. Please try again.");
};

module.exports = errorHandler;
