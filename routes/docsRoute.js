const express = require("express");
const swaggerUi = require("swagger-ui-express");
const spec = require("../openapi.json");

// Interactive API docs for local development. app.js only mounts this router
// outside production, so the API surface isn't advertised publicly.
const router = express.Router();

router.get("/openapi.json", (request, response) => {
  response.status(200).json(spec);
});

router.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

module.exports = router;
