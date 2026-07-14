const jwt = require("jsonwebtoken");

const createAccessToken = (overrides = {}) => {
  return jwt.sign(
    {
      email: "ani@example.com",
      userName: "anihadagali7",
      isAdmin: false,
      id: "63019b905ccf53564ffb0c84",
      ...overrides,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );
};

module.exports = { createAccessToken };
