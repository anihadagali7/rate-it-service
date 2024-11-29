const UserModel = require("../repository/userModel");
const UsersModel = require("../repository/userModel");

const getAccountDetails = async (userName, response) => {
  const user = await UserModel.findOne({ userName: userName });

  return response.status(200).json({
    status: "success",
    data: {
      user: user,
    },
  });
};

const followUser = async (userRequest, userToFollow, response) => {
  const currentUser = await UserModel.findOne({ userName: userRequest });
  const userToBeFollowed = await UserModel.findOne({ userName: userToFollow });

  if (userRequest === userToFollow) {
    return response.status(400).json({
      errors: [
        {
          msg: "You cannot follow yourself",
        },
      ],
    });
  } else if (!userToBeFollowed) {
    return response.status(400).json({
      errors: [
        {
          msg: "User not found.",
        },
      ],
    });
  } else if (currentUser.following.includes(userToBeFollowed.userName)) {
    return response.status(400).json({
      errors: [
        {
          msg: "You already follow this user",
        },
      ],
    });
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
  const userToBeUnfollowed = await UserModel.findOne({
    userName: userToFollow,
  });

  if (userRequest === userToFollow) {
    return response.status(400).json({
      errors: [
        {
          msg: "You cannot unfollow yourself",
        },
      ],
    });
  } else if (!userToBeUnfollowed) {
    return response.status(400).json({
      errors: [
        {
          msg: "User not found.",
        },
      ],
    });
  } else if (
    userToBeUnfollowed &&
    !currentUser.following.includes(userToBeUnfollowed.userName)
  ) {
    return response.status(400).json({
      errors: [
        {
          msg: "You do not currently follow this user",
        },
      ],
    });
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
  let followingList = [];
  const currentUser = await UserModel.findOne({ userName: user });
  let currentUserFollowingList = currentUser.following;

  for (const following of currentUserFollowingList) {
    const friend = await UserModel.findOne({ userName: following });
    followingList.push(friend);
  }

  return response.status(200).json({
    status: "success",
    data: followingList,
  });
};

const getAllFollowers = async (user, response) => {
  let followersList = [];
  const currentUser = await UserModel.findOne({ userName: user });
  let currentUserFollowersList = currentUser.followers;

  for (const follower of currentUserFollowersList) {
    const friend = await UserModel.findOne({ userName: follower });
    followersList.push(friend);
  }

  return response.status(200).json({
    status: "success",
    data: followersList,
  });
};

const getAllFriends = async (user, response) => {
  let followersList = [];
  let followingList = [];
  const currentUser = await UserModel.findOne({ userName: user });
  let currentUserFollowersList = currentUser.followers;
  let currentUserFollowingList = currentUser.following;

  for (const follower of currentUserFollowersList) {
    const friend = await UserModel.findOne({ userName: follower });
    followersList.push(friend);
  }

  for (const following of currentUserFollowingList) {
    const friend = await UserModel.findOne({ userName: following });
    followingList.push(friend);
  }

  return response.status(200).json({
    status: "success",
    data: { followersList: followersList, followingList: followingList },
  });
};

const getAllUsers = async (response) => {
  let allUsers = await UserModel.find();

  return response.status(200).json({
    status: "success",
    data: allUsers,
  });
};

const updateUser = async (
  firstName,
  lastName,
  email,
  phoneNumber,
  userName,
  response
) => {
  let existingUser = await UsersModel.exists({
    email: email,
    userName: userName,
  });

  if (existingUser) {
    const updateExistingUser = await UsersModel.findOneAndUpdate(
      {
        email: email,
        userName: userName,
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

    return response.status(200).json({
      status: "success",
      data: {
        user: updateExistingUser,
      },
    });
  } else {
    return response.status(400).json({
      errors: {
        msg: "This user does not exist",
      },
    });
  }
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
