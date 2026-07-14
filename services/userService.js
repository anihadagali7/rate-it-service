const UserModel = require("../repository/userModel");
const UsersModel = require("../repository/userModel");
const { toPublicUser, toPublicUsers } = require("../utils/userSerializer");
const { sendNotFound, sendError } = require("../utils/httpErrors");

const getAccountDetails = async (userName, response) => {
  const user = await UserModel.findOne({ userName: userName });
  if (!user) {
    return sendNotFound(response, "User not found");
  }

  return response.status(200).json({
    status: "success",
    data: {
      user: toPublicUser(user),
    },
  });
};

const followUser = async (userRequest, userToFollow, response) => {
  const currentUser = await UserModel.findOne({ userName: userRequest });
  if (!currentUser) {
    return sendNotFound(response, "User not found");
  }

  const userToBeFollowed = await UserModel.findOne({ userName: userToFollow });

  if (userRequest === userToFollow) {
    return sendError(response, 400, "You cannot follow yourself");
  } else if (!userToBeFollowed) {
    return sendNotFound(response, "User not found");
  } else if (currentUser.following.includes(userToBeFollowed.userName)) {
    return sendError(response, 400, "You already follow this user");
  } else {
    let currentUserFollowingList = currentUser.following;
    currentUserFollowingList.push(userToBeFollowed.userName);
    currentUser.following = currentUserFollowingList;
    await currentUser.save();

    let userToBeFollowedFollowersList = userToBeFollowed.followers;
    userToBeFollowedFollowersList.push(currentUser.userName);
    userToBeFollowed.followers = userToBeFollowedFollowersList;
    await userToBeFollowed.save();

    return response.status(200).json({
      status: "success",
    });
  }
};

const unFollowUser = async (userRequest, userToFollow, response) => {
  const currentUser = await UserModel.findOne({ userName: userRequest });
  if (!currentUser) {
    return sendNotFound(response, "User not found");
  }

  const userToBeUnfollowed = await UserModel.findOne({
    userName: userToFollow,
  });

  if (userRequest === userToFollow) {
    return sendError(response, 400, "You cannot unfollow yourself");
  } else if (!userToBeUnfollowed) {
    return sendNotFound(response, "User not found");
  } else if (!currentUser.following.includes(userToBeUnfollowed.userName)) {
    return sendError(response, 400, "You do not currently follow this user");
  } else {
    let currentUserFollowingList = currentUser.following;
    const followingIndex = currentUserFollowingList.indexOf(
      userToBeUnfollowed.userName
    );
    currentUserFollowingList.splice(followingIndex, 1);
    await currentUser.save();

    let userToBeUnfollowedFollowersList = userToBeUnfollowed.followers;
    const followersIndex = userToBeUnfollowedFollowersList.indexOf(
      currentUser.userName
    );
    userToBeUnfollowedFollowersList.splice(followersIndex, 1);
    await userToBeUnfollowed.save();

    return response.status(200).json({
      status: "success",
    });
  }
};

const getAllFollowing = async (user, response) => {
  const currentUser = await UserModel.findOne({ userName: user });
  if (!currentUser) {
    return sendNotFound(response, "User not found");
  }

  const followingList = [];
  const currentUserFollowingList = currentUser.following || [];

  for (const following of currentUserFollowingList) {
    const friend = await UserModel.findOne({ userName: following });
    if (friend) {
      followingList.push(friend);
    }
  }

  return response.status(200).json({
    status: "success",
    data: toPublicUsers(followingList),
  });
};

const getAllFollowers = async (user, response) => {
  const currentUser = await UserModel.findOne({ userName: user });
  if (!currentUser) {
    return sendNotFound(response, "User not found");
  }

  const followersList = [];
  const currentUserFollowersList = currentUser.followers || [];

  for (const follower of currentUserFollowersList) {
    const friend = await UserModel.findOne({ userName: follower });
    if (friend) {
      followersList.push(friend);
    }
  }

  return response.status(200).json({
    status: "success",
    data: toPublicUsers(followersList),
  });
};

const getAllFriends = async (user, response) => {
  const currentUser = await UserModel.findOne({ userName: user });
  if (!currentUser) {
    return sendNotFound(response, "User not found");
  }

  const followersList = [];
  const followingList = [];
  const currentUserFollowersList = currentUser.followers || [];
  const currentUserFollowingList = currentUser.following || [];

  for (const follower of currentUserFollowersList) {
    const friend = await UserModel.findOne({ userName: follower });
    if (friend) {
      followersList.push(friend);
    }
  }

  for (const following of currentUserFollowingList) {
    const friend = await UserModel.findOne({ userName: following });
    if (friend) {
      followingList.push(friend);
    }
  }

  return response.status(200).json({
    status: "success",
    data: {
      followersList: toPublicUsers(followersList),
      followingList: toPublicUsers(followingList),
    },
  });
};

const getAllUsers = async (response) => {
  const allUsers = await UserModel.find();

  return response.status(200).json({
    status: "success",
    data: toPublicUsers(allUsers),
  });
};

const updateUser = async (
  firstName,
  lastName,
  phoneNumber,
  authenticatedUserName,
  response
) => {
  const updateExistingUser = await UsersModel.findOneAndUpdate(
    {
      userName: authenticatedUserName,
    },
    {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      dateUpdated: Date.now(),
    },
    {
      new: true,
    }
  );

  if (!updateExistingUser) {
    return sendNotFound(response, "User not found");
  }

  return response.status(200).json({
    status: "success",
    data: {
      user: toPublicUser(updateExistingUser),
    },
  });
};

module.exports = {
  getAccountDetails,
  followUser,
  unFollowUser,
  getAllFollowing,
  getAllFollowers,
  getAllUsers,
  updateUser,
  getAllFriends,
};
