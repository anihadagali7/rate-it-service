const UserModel = require("../repository/userModel");

const getAccountDetails = async (userName, response) => {
  const user = await UserModel.findOne({ user_name: userName });

  return response.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
};

module.exports = { getAccountDetails };
