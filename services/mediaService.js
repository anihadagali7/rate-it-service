const MediaModel = require("../repository/mediaModel");
const slackClient = require("../client/slackClient");
const tmdbClient = require("../client/tmdbClient");
const spotifyClient = require("../client/spotifyClient");

const createNewMedia = async (media, response) => {
  let mediaToBeSaved = {};
  if (media.mediaType === "MOVIE" || media.mediaType === "TV SHOW") {
    mediaToBeSaved = newMovieOrTvShow(media);
  } else if (media.mediaType === "MUSIC") {
    mediaToBeSaved = newMusic(media);
  }

  const newMedia = await new MediaModel(mediaToBeSaved).save();

  slackClient.postMessage(
    `${newMedia.name} - ${newMedia.media_type} has just been added!`,
    process.env.SLACK_DEV_MEDIA_URL
  );

  let mediaMapper = {};

  if (media.mediaType === "MOVIE" || media.mediaType === "TV SHOW") {
    mediaMapper = dbMovieTvShowToUIMapper(newMedia);
  } else if (media.mediaType === "MUSIC") {
    mediaMapper = dbMusicToUIMapper(newMedia);
  }

  return response.status(201).json({
    status: "success",
    data: {
      media: mediaMapper,
    },
  });
};

// media is coming from UI -> send to DB
const newMovieOrTvShow = (media) => {
  return {
    name: media.name,
    description: media.description,
    date_released: media.dateReleased,
    picture: media.picture,
    media_type: media.mediaType,
    media_id: media.mediaId,
    cast: media.cast,
    director: media.director,
    producer: media.producer,
    tag_line: media.tagLine,
  };
};

// media is coming from UI -> send to DB
const newMusic = (media) => {
  return {
    name: media.name,
    date_released: media.dateReleased,
    picture: media.picture,
    media_type: media.mediaType,
    media_id: media.mediaId,
    artist: media.artist,
    album: media.album,
  };
};

// media is coming from DB -> send to UI
const dbMovieTvShowToUIMapper = (media) => {
  const clone = JSON.parse(JSON.stringify(media));
  clone["mediaId"] = media.media_id;
  clone["mediaType"] = media.media_type;
  clone["dateReleased"] = media.date_released;
  delete clone.media_id;
  delete clone.media_type;
  delete clone.date_released;
  delete clone.artist;
  delete clone.author;
  delete clone.host;

  return clone;
};

const getMovieTvShowDetails = async (tmdbId, mediaType, response) => {
  const existingMedia = await MediaModel.findOne({ media_id: tmdbId });

  if (existingMedia) {
    return response.status(200).json({
      status: "success",
      data: {
        media: dbMovieTvShowToUIMapper(existingMedia),
      },
    });
  } else {
    const mediaDetails = await tmdbClient.getDetailsById(tmdbId, mediaType);
    const mediaCast = await tmdbClient.getCreditsById(tmdbId, mediaType);

    let movieToBeAdded = {};

    if (mediaType == "movie") {
      movieToBeAdded["name"] = mediaDetails.original_title;
      movieToBeAdded["dateReleased"] = mediaDetails.release_date;
    } else {
      movieToBeAdded["name"] = mediaDetails.original_name;
      movieToBeAdded["dateReleased"] = mediaDetails.first_air_date;
    }

    movieToBeAdded["description"] = mediaDetails.overview;
    movieToBeAdded["tagLine"] = mediaDetails.tagLine;
    movieToBeAdded["mediaId"] = mediaDetails.id;
    movieToBeAdded["mediaType"] =
      mediaType === "tv" ? "TV SHOW" : mediaType.toUpperCase();

    if (mediaDetails.poster_path) {
      let posterUrl = `https://image.tmdb.org/t/p/w500${mediaDetails.poster_path}`;
      movieToBeAdded["picture"] = posterUrl;
    }

    let castList = [];
    let directorList = [];
    let producerList = [];

    mediaCast.cast.forEach((cast) => {
      if (cast.known_for_department === "Acting") {
        castList.push(cast.name);
      }
      if (cast.known_for_department === "Directing") {
        directorList.push(cast.name);
      }
      if (cast.known_for_department === "Production") {
        producerList.push(cast.name);
      }
    });

    mediaCast.crew.forEach((cast) => {
      if (cast.job === "Executive Producer") {
        producerList.push(cast.name);
      }
      if (cast.known_for_department === "Directing") {
        directorList.push(cast.name);
      }
      if (cast.known_for_department === "Production") {
        producerList.push(cast.name);
      }
    });

    castList = castList.slice(0, 4);
    producerList = producerList.slice(0, 4);
    directorList = directorList.slice(0, 4);

    movieToBeAdded["cast"] = [...new Set(castList)];
    movieToBeAdded["director"] = [...new Set(directorList)];
    movieToBeAdded["producer"] = [...new Set(producerList)];

    const newMedia = createNewMedia(movieToBeAdded, response);

    return newMedia;
  }
};

// media is coming from DB -> send to UI
const dbMusicToUIMapper = (media) => {
  const clone = JSON.parse(JSON.stringify(media));
  clone["mediaId"] = media.media_id;
  clone["mediaType"] = media.media_type;
  clone["dateReleased"] = media.date_released;
  delete clone.media_id;
  delete clone.media_type;
  delete clone.author;
  delete clone.producer;
  delete clone.director;
  delete clone.host;
  delete clone.cast;

  return clone;
};

const getMusicDetails = async (spotifyId, response) => {
  const existingMedia = await MediaModel.findOne({ media_id: spotifyId });
  if (existingMedia) {
    return response.status(200).json({
      status: "success",
      data: {
        media: dbMusicToUIMapper(existingMedia),
      },
    });
  } else {
    const mediaDetails = await spotifyClient.searchTrackBySpotifyId(spotifyId);

    let musicToBeAdded = {};

    musicToBeAdded["name"] = mediaDetails.name;
    musicToBeAdded["dateReleased"] = mediaDetails.first_air_date;
    musicToBeAdded["album"] = mediaDetails.album.name;

    let artists = [];
    let imageUrl;

    let imageList = mediaDetails.album.images;
    let artistsList = mediaDetails.artists;

    artistsList.forEach((artist) => {
      artists.push(artist.name);
    });

    imageList.forEach((image) => {
      if (image.height == 640) {
        imageUrl = image.url;
      }
    });

    musicToBeAdded["mediaId"] = mediaDetails.id;
    musicToBeAdded["mediaType"] = "MUSIC";
    musicToBeAdded["picture"] = imageUrl;
    musicToBeAdded["artist"] = artists;

    const newMedia = createNewMedia(musicToBeAdded, response);

    return newMedia;
  }
};

module.exports = { createNewMedia, getMovieTvShowDetails, getMusicDetails };
