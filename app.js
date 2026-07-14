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

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api", authenticationRoute);
app.use("/api/ratings", ratingRoute);
app.use("/api/media", mediaRoute);
app.use("/api/search", searchRoute);
app.use("/api", userRoute);
app.use("/api/wishlist", wishlistRoute);
app.use("/api/playlist", playlistRoute);

module.exports = app;
