const RatingModel = require("../repository/ratingModel");
const WishlistModel = require("../repository/wishlistModel");
const PlaylistMediaModel = require("../repository/playlist_mediaModel");
const MediaModel = require("../repository/mediaModel");
const PlaylistModel = require("../repository/playlistModel");

const getIndexNames = (model) =>
  model.schema.indexes().map((index) => index[0]);

describe("model indexes", () => {
  it("defines rating indexes for uniqueness and lookups", () => {
    expect(getIndexNames(RatingModel)).toEqual(
      expect.arrayContaining([
        { ratedBy: 1, media: 1 },
        { ratedBy: 1 },
        { media: 1 },
        { dateCreated: -1 },
      ])
    );
  });

  it("defines wishlist indexes for uniqueness and lookups", () => {
    expect(getIndexNames(WishlistModel)).toEqual(
      expect.arrayContaining([{ addedBy: 1, media: 1 }, { addedBy: 1 }])
    );
  });

  it("defines playlist media indexes for uniqueness and lookups", () => {
    expect(getIndexNames(PlaylistMediaModel)).toEqual(
      expect.arrayContaining([
        { playlist: 1, media: 1 },
        { playlist: 1 },
        { media: 1 },
      ])
    );
  });

  it("defines media indexes for external id lookups", () => {
    expect(getIndexNames(MediaModel)).toEqual(
      expect.arrayContaining([{ mediaId: 1, mediaType: 1 }, { mediaType: 1 }])
    );
  });

  it("defines playlist indexes for user lookups", () => {
    expect(getIndexNames(PlaylistModel)).toEqual(
      expect.arrayContaining([{ addedBy: 1 }, { addedBy: 1, dateCreated: -1 }])
    );
  });
});
