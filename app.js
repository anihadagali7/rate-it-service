/* Imports */
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");

/* Routes */
const authenticationRoute = require("./routes/authenticationRoute");
const ratingRoute = require("./routes/ratingRoute");
const mediaRoute = require("./routes/mediaRoute");
const searchRoute = require("./routes/searchRoute");
const userRoute = require("./routes/userRoute");
const wishlistRoute = require("./routes/wishlistRoute");
const playlistRoute = require("./routes/playlistRoute");
const likeRoute = require("./routes/likeRoute");
const commentRoute = require("./routes/commentRoute");

const app = express();

// The app runs behind a single platform proxy/router (see Procfile), which
// sets X-Forwarded-For. Trust exactly that one hop so req.ip resolves to the
// real client IP for rate limiting, rather than every request appearing to
// come from the proxy.
app.set("trust proxy", 1);

const getAllowedOrigins = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV === "production") {
    return [];
  }

  return ["http://localhost:3000", "http://127.0.0.1:3000"];
};

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();

      // Non-browser clients (curl, Postman, server-to-server) send no Origin.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
  })
);
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger UI at /api/docs and the raw spec at /api/openapi.json — dev only.
if (process.env.NODE_ENV !== "production") {
  app.use("/api", require("./routes/docsRoute"));
}

app.use("/api", authenticationRoute);
app.use("/api/ratings", ratingRoute);
app.use("/api/media", mediaRoute);
app.use("/api/search", searchRoute);
app.use("/api", userRoute);
app.use("/api/wishlist", wishlistRoute);
app.use("/api/playlist", playlistRoute);
app.use("/api/likes", likeRoute);
app.use("/api/comments", commentRoute);

module.exports = app;
