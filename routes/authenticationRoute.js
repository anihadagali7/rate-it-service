const express = require("express");
const router = express.Router();

router.get("/", async (request, response) => {
  response.status(200).json({status:'UP'})
});

router.post('/create-user', async (request, response) => {
  response.status(201).json({status:'INSERTED'})
});

module.exports = router;
