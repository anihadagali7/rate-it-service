/* Imports */
const express = require("express");
require("dotenv").config();

/* Routes */
const authenticationRoute = require("./routes/authenticationRoute");

require("./configuration/mongoDbConnection");

const app = express();
const PORT = 3000;

app.use(express.json());
// app.use("/auth", authenticationRoute);
app.use("/api", authenticationRoute)

app.listen(PORT, () => {
  console.log(`Application Started on PORT ${PORT}`);
});
