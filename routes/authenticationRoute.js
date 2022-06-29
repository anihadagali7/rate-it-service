const express = require("express");
const router = express.Router();

router.get("/", async (request, response) => {
    console.log('hello')
  response.status(200).json({status:'UP'})
});

module.exports = router;