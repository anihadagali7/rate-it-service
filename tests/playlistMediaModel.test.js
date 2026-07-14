const PlaylistMediaModel = require("../repository/playlist_mediaModel");

describe("playlist_mediaModel", () => {
  it("references playlist and media collections correctly", () => {
    const paths = PlaylistMediaModel.schema.paths;

    expect(paths.playlist.options.ref).toBe("playlist");
    expect(paths.media.options.ref).toBe("media");
  });
});
