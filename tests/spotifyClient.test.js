jest.mock("axios");

const axios = require("axios");
const spotifyClient = require("../client/spotifyClient");

describe("spotifyClient token cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spotifyClient.clearTokenCache();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
    spotifyClient.clearTokenCache();
  });

  const mockTokenResponse = (token = "spotify-token", expiresIn = 3600) => {
    axios.post.mockResolvedValue({
      data: {
        access_token: token,
        expires_in: expiresIn,
      },
    });
  };

  const mockTrackSearchResponse = () => {
    axios.get.mockResolvedValue({
      data: {
        tracks: {
          items: [{ id: "track-1", name: "Cached Track" }],
        },
      },
    });
  };

  it("fetches a token once and reuses it for subsequent requests", async () => {
    mockTokenResponse();
    mockTrackSearchResponse();

    await spotifyClient.searchByTrackArtist("beatles");
    await spotifyClient.searchByTrackArtist("queen");

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer spotify-token"
    );
    expect(axios.get.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer spotify-token"
    );
  });

  it("refreshes the token after it expires", async () => {
    mockTokenResponse("first-token", 3600);
    mockTrackSearchResponse();

    await spotifyClient.searchByTrackArtist("beatles");

    jest.setSystemTime(new Date("2026-01-01T01:01:00.000Z"));
    mockTokenResponse("second-token", 3600);

    await spotifyClient.searchByTrackArtist("queen");

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.get.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer second-token"
    );
  });

  it("deduplicates concurrent token requests", async () => {
    let resolveTokenRequest;
    axios.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTokenRequest = () =>
            resolve({
              data: {
                access_token: "shared-token",
                expires_in: 3600,
              },
            });
        })
    );
    mockTrackSearchResponse();

    const firstSearch = spotifyClient.searchByTrackArtist("beatles");
    const secondSearch = spotifyClient.searchByTrackArtist("queen");

    resolveTokenRequest();
    await Promise.all([firstSearch, secondSearch]);

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledTimes(2);
  });
});
