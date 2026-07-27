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

const app = express();

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
app.use("/api", authenticationRoute);
app.use("/api/ratings", ratingRoute);
app.use("/api/media", mediaRoute);
app.use("/api/search", searchRoute);
app.use("/api", userRoute);
app.use("/api/wishlist", wishlistRoute);
app.use("/api/playlist", playlistRoute);
app.use("/api/likes", likeRoute);

module.exports = app;
