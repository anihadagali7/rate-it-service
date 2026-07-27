const jwt = require("jsonwebtoken");
const UsersModel = require("../repository/userModel");
require("dotenv").config();

/**
 * Attaches request.user when a valid token is present.
 * Leaves the request unauthenticated (and continues) when no token is sent.
 * Invalid tokens still return 403 so clients get a clear auth error.
 */
const optionalAuthToken = async (request, response, next) => {
  const token = request.headers.authorization;

  if (!token) {
    return next();
  }

  try {
    const decoded = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await UsersModel.findById(decoded.id);

    if (!user || user.isActive !== true) {
      return response.status(403).json({
        errors: {
          msg: "Invalid token",
        },
      });
    }

    request.user = {
      email: user.email,
      userName: user.userName,
      id: user._id.toString(),
      isAdmin: user.isAdmin,
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

module.exports = optionalAuthToken;
