/* Imports */
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

/* Routes */
const authenticationRoute = require("./routes/authenticationRoute");
const ratingRoute = require("./routes/ratingRoute");
const mediaRoute = require("./routes/mediaRoute");
const searchRoute = require("./routes/searchRoute");
const userRoute = require("./routes/userRoute");

require("./configuration/mongoDbConnection");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api", authenticationRoute)
app.use("/api", ratingRoute);
app.use("/api/media", mediaRoute);
app.use("/api", searchRoute);
app.use("/api", userRoute);
app.use((req, res, next) => {
  const allowedOrigins = [
    process.env.REACT_UI_BASE_LOCAL_URL,
    process.env.REACT_UI_BASE_URL
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", true);
  return next();
});

app.listen(PORT, () => {
  console.log(`Application Started on PORT ${PORT}`);
});
