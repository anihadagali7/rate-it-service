const MediaModel = require("../repository/mediaModel");
const WishlistModel = require("../repository/wishlistModel");
const UserModel = require("../repository/userModel");
const {response} = require("express");

const createNewWishlist = async (mediaId, userName, response) => {
  const existingUser = await UserModel.findOne({userName: userName});
  const existingMedia = await MediaModel.findOne({ mediaId: mediaId });

  const newWishlist = await new WishlistModel ({
    media: existingMedia,
    addedBy: existingUser,
    isActive: true,
    dateCreated: Date.now(),
  }).save();

  return response.status(201).json({
    status: "success",
    data: {
      newWishlist,
    },
  });
};

const getWishlistForUser = async (userName, response) => {
  const existingUser = await UserModel.findOne({userName: userName});
  const list = await WishlistModel.find({addedBy: existingUser});

  let wishlistList = await prepareWishlistList(list);

  return response.status(200).json({
    status: "success",
    data: {
      wishlistList,
    },
  });
}

const prepareWishlistList = async (wishlist) => {
  let list = [];
  for(let media of wishlist) {
    let wishlistObject = JSON.parse(JSON.stringify(media));
    wishlistObject.media = await MediaModel.findById(media.media);
    wishlistObject.addedBy = await UserModel.findById(media.addedBy);
    list.push(wishlistObject);
  }

  list.sort((a,b)=>a.dateCreated - b.dateCreated);
  return list;
}

module.exports = { createNewWishlist, getWishlistForUser };
