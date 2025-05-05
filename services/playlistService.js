const PlaylistModel = require("../repository/playlistModel");
const UserModel = require("../repository/userModel");
const { response } = require("express");
const MediaModel = require("../repository/mediaModel");
const PlaylistMediaModel = require("../repository/playlist_mediaModel");
const mongoose = require("mongoose");

const createNewPlaylist = async (playlistName, userName, response) => {
  const existingUser = await UserModel.findOne({ userName: userName });

  if (existingUser == null) {
    return response.status(400).json({
      errors: [
        {
          msg: "That user does not exist",
        },
      ],
    });
  }

  const newPlaylist = await new PlaylistModel({
    name: playlistName,
    addedBy: existingUser,
    isActive: true,
    dateCreated: Date.now(),
    posters: [],
  }).save();

  return response.status(201).json({
    status: "success",
    data: {
      newPlaylist,
    },
  });
};

const addMediaToPlaylist = async (playlist, media, response) => {
  const existingPlaylist = await PlaylistModel.findById(playlist);
  const existingMedia = await MediaModel.findById(media);

  if (existingMedia == null) {
    return response.status(400).json({
      errors: [
        {
          msg: "That media does not exist",
        },
      ],
    });
  }

  if (existingPlaylist == null) {
    return response.status(400).json({
      errors: [
        {
          msg: "That playlist does not exist",
        },
      ],
    });
  }

  const newPoster = existingMedia.picture;

  if (Array.isArray(existingPlaylist.posters)) {
    existingPlaylist.posters.push(newPoster);
  } else {
    existingPlaylist.posters = [newPoster];
  }

  const updatedPlaylist = await existingPlaylist.save();

  const newPlaylist = await new PlaylistMediaModel({
    media: existingMedia,
    playlist: updatedPlaylist,
  }).save();

  return response.status(201).json({
    status: "success",
    data: {
      newPlaylist,
    },
  });
};

const getPlaylistForUser = async (userName, response) => {
  const existingUser = await UserModel.findOne({ userName: userName });

  if (existingUser == null) {
    return response.status(400).json({
      errors: [
        {
          msg: "That user does not exist",
        },
      ],
    });
  }

  const list = await PlaylistModel.find({ addedBy: existingUser });

  if (list === undefined || list.length === 0) {
    return response.status(200).json({
      data: {
        playlistList: [],
      },
    });
  }

  const playlistList = await preparePlaylistList(list);

  return response.status(200).json({
    status: "success",
    data: {
      playlistList,
    },
  });
};

const getAllMediaInPlaylist = async (playlist, response) => {
  const existingPlaylist = await PlaylistModel.findById(playlist);

  if (existingPlaylist == null) {
    return response.status(400).json({
      errors: [
        {
          msg: "That playlist does not exist",
        },
      ],
    });
  }

  const allMediaByPlaylist = await PlaylistMediaModel.find({
    playlist: playlist,
  });

  if (allMediaByPlaylist === null) {
    return response.status(400).json({
      errors: [
        {
          msg: "That playlist does not exist",
        },
      ],
    });
  }

  let mediaByPlaylist = {};
  mediaByPlaylist.playlist = existingPlaylist;
  mediaByPlaylist.mediaList = [];

  for (let mediaList of allMediaByPlaylist) {
    mediaByPlaylist.mediaList.push(mediaList.media);
  }

  mediaByPlaylist = await prepareMediaPlaylistList(mediaByPlaylist);

  return response.status(200).json({
    status: "success",
    data: {
      mediaByPlaylist,
    },
  });
};

const preparePlaylistList = async (playlistList) => {
  let list = [];
  for (let playlist of playlistList) {
    let playlistObject = JSON.parse(JSON.stringify(playlist));
    playlistObject.addedBy = await UserModel.findById(playlist.addedBy);
    list.push(playlistObject);
  }

  list.sort((a, b) => a.dateCreated - b.dateCreated);
  return list;
};

const prepareMediaPlaylistList = async (mediaByPlaylist) => {
  let list = [];
  for (let media of mediaByPlaylist.mediaList) {
    let existingMedia = await MediaModel.findById(media);
    list.push(existingMedia);
  }

  mediaByPlaylist.mediaList = list;

  return mediaByPlaylist;
};

module.exports = {
  createNewPlaylist,
  addMediaToPlaylist,
  getPlaylistForUser,
  getAllMediaInPlaylist,
};
