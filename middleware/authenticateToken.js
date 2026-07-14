const jwt = require("jsonwebtoken");
require("dotenv").config();

const authToken = async (request, response, next) => {
  const token = request.headers.authorization;

  if (!token) {
    return response.status(401).json({
      errors: {
        msg: "Token not found",
      },
    });
  }

  try {
    const decoded = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    request.user = {
      email: decoded.email,
      userName: decoded.userName,
      id: decoded.id,
      isAdmin: decoded.isAdmin,
    };
    next();
  } catch (error) {
    return response.status(403).json({
      errors: {
        msg: "Invalid token",
      },
    });
  }
};

module.exports = authToken;
