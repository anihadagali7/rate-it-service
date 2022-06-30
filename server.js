/* Imports */
const express = require("express");
require('dotenv').config()
// const mongoose = require('mongoose');

/* Routes */
const authenticationRoute = require("./routes/authenticationRoute")

require("./repository/connection")

const app = express();
const PORT = 3000;

app.use("/api", authenticationRoute);

app.listen(PORT, () => {
    console.log(`Application Started on PORT ${PORT}`);
});
