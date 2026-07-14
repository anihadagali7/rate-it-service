const MediaModel = require("../repository/mediaModel");
const WishlistModel = require("../repository/wishlistModel");
const UserModel = require("../repository/userModel");
const { toPublicUser } = require("../utils/userSerializer");
const { sendNotFound, sendConflict } = require("../utils/httpErrors");
const { isDuplicateKeyError } = require("../utils/mongoErrors");

const createNewWishlist = async (mediaId, userName, response) => {
  const existingUser = await UserModel.findOne({ userName: userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const existingMedia = await MediaModel.findOne({ mediaId: mediaId });
  if (!existingMedia) {
    return sendNotFound(response, "Media not found");
  }

  const existingWishlist = await WishlistModel.findOne({
    addedBy: existingUser._id,
    media: existingMedia._id,
  });

  if (existingWishlist) {
    return sendConflict(response, "This media is already in your wishlist");
  }

  try {
    const newWishlist = await new WishlistModel({
      media: existingMedia._id,
      addedBy: existingUser._id,
      isActive: true,
      dateCreated: Date.now(),
    }).save();

    return response.status(201).json({
      status: "success",
      data: {
        newWishlist,
      },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return sendConflict(response, "This media is already in your wishlist");
    }

    throw error;
  }
};

const getWishlistForUser = async (userName, response) => {
  const existingUser = await UserModel.findOne({ userName: userName });
  if (!existingUser) {
    return sendNotFound(response, "User not found");
  }

  const list = await WishlistModel.find({ addedBy: existingUser });
  const wishlistList = await prepareWishlistList(list);

  return response.status(200).json({
    status: "success",
    data: {
      wishlistList,
    },
  });
};

const prepareWishlistList = async (wishlist) => {
  const list = [];
  for (const media of wishlist) {
    const wishlistObject = JSON.parse(JSON.stringify(media));
    wishlistObject.media = await MediaModel.findById(media.media);
    wishlistObject.addedBy = toPublicUser(
      await UserModel.findById(media.addedBy)
    );
    list.push(wishlistObject);
  }

  list.sort((a, b) => a.dateCreated - b.dateCreated);
  return list;
};

module.exports = { createNewWishlist, getWishlistForUser };
