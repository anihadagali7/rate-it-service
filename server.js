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

require("./configuration/mongoDbConnection");

const app = express();
const PORT = process.env.PORT || 3000;

/* Allowed domains */
const domainsFromEnv = process.env.CORS_DOMAINS;
const whitelist = domainsFromEnv.split(",").map((item) => item.trim());

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api", authenticationRoute)
app.use("/api", ratingRoute);
app.use("/api/media", mediaRoute);
app.use("/api", searchRoute);
app.use("/api", userRoute);

/* CORS configuration */
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

app.listen(PORT, () => {
  console.log(`Application Started on PORT ${PORT}`);
});
