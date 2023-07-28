const PlaylistModel = require("../repository/playlistModel");
const UserModel = require("../repository/userModel");
const {response} = require("express");
const MediaModel = require("../repository/mediaModel");
const PlaylistMediaModel = require("../repository/playlist_mediaModel");
const mongoose = require("mongoose");

const createNewPlaylist = async (playlistName, userName, response) => {
    const existingUser = await UserModel.findOne({userName: userName});

    if (existingUser == null) {
        return response.status(400).json({
            errors: [
                {
                    msg: "That user does not exist"
                }
            ]
        });
    }

    const newPlaylist = await new PlaylistModel({
        name: playlistName,
        addedBy: existingUser,
        isActive: true,
        dateCreated: Date.now()
    }).save();

    return response.status(201).json({
        status: "success",
        data: {
            newPlaylist
        }
    });
};

const addMediaToPlaylist = async (playlist, media, response) => {
  const existingPlaylist = await PlaylistModel.findById(playlist);
  const existingMedia = await MediaModel.findById(media);

    if (existingMedia == null) {
        return response.status(400).json({
            errors: [
                {
                    msg: "That media does not exist"
                }
            ]
        });
    }

    if (existingPlaylist == null) {
        return response.status(400).json({
            errors: [
                {
                    msg: "That playlist does not exist"
                }
            ]
        });
    }

    const newPlaylist = await new PlaylistMediaModel({
        media: existingMedia,
        playlist: existingPlaylist
    }).save();

    return response.status(201).json({
        status: "success",
        data: {
            newPlaylist
        }
    });
}

const getPlaylistForUser = async (userName, response) => {
    const existingUser = await UserModel.findOne({userName: userName});

    if (existingUser == null) {
        return response.status(400).json({
            errors: [
                {
                    msg: "That user does not exist"
                }
            ]
        });
    }

    const list = await PlaylistModel.find({addedBy: existingUser});

    return response.status(200).json({
        status: "success",
        data: {
            list
        }
    });
}

const getAllMediaInPlaylist = async (playlist, response) => {
    const allMediaByPlaylist = await PlaylistMediaModel.find({playlist: playlist});

    return response.status(200).json({
        status: "success",
        data: {
            allMediaByPlaylist
        }
    });
}

// const preparePlaylistList = async (playlist) => {
//   let list = [];
//   for(let media of playlist) {
//     let playlistObject = JSON.parse(JSON.stringify(media));
//     playlistObject.media = await MediaModel.findById(media.media);
//     playlistObject.addedBy = await UserModel.findById(media.addedBy);
//     list.push(playlistObject);
//   }
//
//   list.sort((a,b)=>a.dateCreated - b.dateCreated);
//   return list;
// }

module.exports = {createNewPlaylist, addMediaToPlaylist, getPlaylistForUser, getAllMediaInPlaylist};
