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

require("./configuration/mongoDbConnection");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api", authenticationRoute);
app.use("/api", ratingRoute);
app.use("/api/media", mediaRoute);
app.use("/api", searchRoute);
app.use("/api", userRoute);
app.use("/api", wishlistRoute);
app.use("/api", playlistRoute);

app.listen(PORT, () => {
  console.log(`Application Started on PORT ${PORT}`);
});
