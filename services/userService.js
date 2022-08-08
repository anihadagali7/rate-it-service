const UserModel = require("../repository/userModel");
const {response} = require("express");

const getAccountDetails = async (userName, response) => {
  const user = await UserModel.findOne({ user_name: userName });

  return response.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
};

const followUser = async (userRequest, userToFollow, response) => {
  const currentUser = await UserModel.findOne({user_name: userRequest});
  const userToBeFollowed = await UserModel.findOne({user_name: userToFollow});

  if(currentUser.following.includes(userToBeFollowed.user_name)){
      return response.status(400).json({
          errors: [
              {
                  msg: "You already follow this user",
              },
          ],
      });
  }
  else {
      let currentUserFollowingList = currentUser.following;
      currentUserFollowingList.push(userToBeFollowed.user_name);
      currentUser.following = currentUserFollowingList;
      await currentUser.save();

      let userToBeFollowedFollowersList = userToBeFollowed.followers;
      userToBeFollowedFollowersList.push(currentUser.user_name);
      userToBeFollowed.followers = userToBeFollowedFollowersList;
      await userToBeFollowed.save();

      return response.status(200).json({
          status: "success",
      });
  }
};

const unFollowUser = async (userRequest, userToFollow, response) => {
    const currentUser = await UserModel.findOne({user_name: userRequest});
    const userToBeUnfollowed = await UserModel.findOne({user_name: userToFollow});

    if(!currentUser.following.includes(userToBeUnfollowed.user_name)){
        return response.status(400).json({
            errors: [
                {
                    msg: "You do not currently follow this user",
                },
            ],
        });
    }
    else {
        let currentUserFollowingList = currentUser.following;
        const followingIndex = currentUserFollowingList.indexOf(userToBeUnfollowed.user_name);
        currentUserFollowingList.splice(followingIndex, 1);
        await currentUser.save();

        let userToBeUnfollowedFollowersList = userToBeUnfollowed.followers;
        const followersIndex = userToBeUnfollowedFollowersList.indexOf(currentUser.user_name);
        userToBeUnfollowedFollowersList.splice(followersIndex, 1);
        await userToBeUnfollowed.save();

        return response.status(200).json({
            status: "success",
        });
    }
};

const getAllFollowing = async (user, response) => {
    let followingList = [];
    const currentUser = await UserModel.findOne({user_name: user});
    let currentUserFollowingList = currentUser.following;

    for (const following of currentUserFollowingList) {
        const friend = await UserModel.findOne({user_name: following});
        followingList.push(friend);
    }

    return response.status(200).json({
        status: "success",
        data: followingList
    });
};

const getAllFollowers = async (user, response) => {
    let followersList = [];
    const currentUser = await UserModel.findOne({user_name: user});
    let currentUserFollowersList = currentUser.followers;

    for (const follower of currentUserFollowersList) {
        const friend = await UserModel.findOne({user_name: follower});
        followersList.push(friend);
    }

    return response.status(200).json({
        status: "success",
        data: followersList
    });
};

module.exports = { getAccountDetails, followUser, unFollowUser, getAllFollowing, getAllFollowers };
