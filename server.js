const express = require("express");

/**Routes */
const authenticationRoute = require("./routes/authenticationRoute")

const app = express();
const PORT = 3000;

app.use("/api", authenticationRoute);

app.listen(PORT, () => {
    console.log(`Application Started on PORT ${PORT}`);
});