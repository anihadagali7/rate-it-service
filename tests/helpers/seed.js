const bcrypt = require("bcrypt");
const UserModel = require("../../repository/userModel");
const MediaModel = require("../../repository/mediaModel");
const PlaylistModel = require("../../repository/playlistModel");
const RatingModel = require("../../repository/ratingModel");

const createTestUser = async (overrides = {}) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("Password1!", salt);

  return UserModel.create({
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    userName: "testuser",
    password: hashedPassword,
    phoneNumber: "3135551212",
    isActive: true,
    isAdmin: false,
    followers: [],
    following: [],
    dateCreated: Date.now(),
    dateUpdated: Date.now(),
    ...overrides,
  });
};

const createTestMedia = async (overrides = {}) => {
  return MediaModel.create({
    name: "Test Media",
    mediaType: "MOVIE",
    mediaId: "media-1",
    picture: "https://example.com/poster.jpg",
    ...overrides,
  });
};

const createTestPlaylist = async (user, overrides = {}) => {
  return PlaylistModel.create({
    name: "Test Playlist",
    addedBy: user._id,
    isActive: true,
    dateCreated: Date.now(),
    posters: [],
    ...overrides,
  });
};

const createTestRating = async (user, media, overrides = {}) => {
  return RatingModel.create({
    media: media._id,
    ratedBy: user._id,
    rating: "5",
    comments: "Great movie!",
    isActive: true,
    dateCreated: Date.now(),
    dateUpdated: Date.now(),
    ...overrides,
  });
};

module.exports = {
  createTestUser,
  createTestMedia,
  createTestPlaylist,
  createTestRating,
};
