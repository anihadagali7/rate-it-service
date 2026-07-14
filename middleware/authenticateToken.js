const jwt = require("jsonwebtoken");
const UsersModel = require("../repository/userModel");
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

module.exports = authToken;
