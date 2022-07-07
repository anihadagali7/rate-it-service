const jwt = require("jsonwebtoken");
require("dotenv").config();

const authToken = async (request, response, next) => {
  const token = request.headers.authorization;

  if (!token) {
    response.status(401).json({
      errors: [
        {
          msg: "Token not found",
        },
      ],
    });
  }

  const newToken = token.split(" ")[1];

  try {
    const user = await jwt.verify(newToken, process.env.ACCESS_TOKEN_SECRET);
    request.user = user.email;
    next();
  } catch (error) {
    response.status(403).json({
      errors: [
        {
          msg: "Invalid token",
        },
      ],
    });
  }
};

module.exports = authToken;
