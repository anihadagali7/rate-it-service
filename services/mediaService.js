const MediaModel = require("../repository/mediaModel");
const slackClient = require("../client/slackClient");
const tmdbClient = require("../client/tmdbClient");

const createNewMedia = async (media, response) => {
  let mediaToBeSaved = {};
  if (media.mediaType === "MOVIE" || media.mediaType === "TV SHOW") {
    mediaToBeSaved = newMovieOrTvShow(media);
  }

  const newMedia = await new MediaModel(mediaToBeSaved).save();

  slackClient.postMessage(
    `${newMedia.name} - ${newMedia.media_type} has just been added!`,
    process.env.SLACK_DEV_MEDIA_URL
  );

  return response.status(201).json({
    status: "success",
    data: {
      media: dbMovieTvShowToUIMapper(newMedia),
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
    tmdb_id: media.tmdbId,
    cast: media.cast,
    director: media.director,
    producer: media.producer,
    tag_line: media.tagLine,
  };
};

// media is coming from DB -> send to UI
const dbMovieTvShowToUIMapper = (media) => {
  const clone = JSON.parse(JSON.stringify(media));
  clone["mediaId"] = media.tmdb_id;
  delete clone.tmdb_id;

  return clone;
};

const getMovieTvShowDetails = async (tmdbId, mediaType, response) => {
  const existingMedia = await MediaModel.findOne({ tmdb_id: tmdbId });

  if (existingMedia) {
    console.log("existing");
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
    movieToBeAdded["tmdbId"] = mediaDetails.id;
    movieToBeAdded["mediaType"] =
      mediaType === "tv" ? "TV SHOW" : mediaType.toUpperCase();

    if (mediaDetails.poster_path) {
      let posterUrl = `https://image.tmdb.org/t/p/w500${mediaDetails.poster_path}`;
      movieToBeAdded["picture"] = posterUrl;
      console.log("movie saving ", movieToBeAdded);
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

module.exports = { createNewMedia, getMovieTvShowDetails };
