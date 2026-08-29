jest.mock("axios");

const axios = require("axios");
const facebookAuthClient = require("../client/facebookAuthClient");

describe("facebookAuthClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDebugToken = (overrides = {}) => {
    axios.get.mockImplementationOnce((url) => {
      expect(url).toBe("https://graph.facebook.com/debug_token");
      return Promise.resolve({
        data: {
          data: {
            is_valid: true,
            app_id: "test-app-id",
            ...overrides,
          },
        },
      });
    });
  };

  const mockProfile = () => {
    axios.get.mockImplementationOnce((url) => {
      expect(url).toBe("https://graph.facebook.com/me");
      return Promise.resolve({
        data: {
          id: "fb-123",
          first_name: "Fiona",
          last_name: "Book",
          email: "fiona@example.com",
          picture: { data: { url: "https://example.com/fiona.jpg" } },
        },
      });
    });
  };

  it("validates the token against the app before trusting the profile", async () => {
    mockDebugToken();
    mockProfile();

    const profile = await facebookAuthClient.getFacebookProfile("a-token");

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      "https://graph.facebook.com/debug_token",
      {
        params: {
          input_token: "a-token",
          access_token: "test-app-id|test-app-secret",
        },
      }
    );
    expect(profile).toEqual({
      providerId: "fb-123",
      email: "fiona@example.com",
      emailVerified: true,
      firstName: "Fiona",
      lastName: "Book",
      picture: "https://example.com/fiona.jpg",
    });
  });

  it("rejects and never calls /me when the token is invalid", async () => {
    mockDebugToken({ is_valid: false });

    await expect(
      facebookAuthClient.getFacebookProfile("a-token")
    ).rejects.toThrow();

    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("rejects and never calls /me when the token belongs to a different app", async () => {
    mockDebugToken({ app_id: "someone-elses-app" });

    await expect(
      facebookAuthClient.getFacebookProfile("a-token")
    ).rejects.toThrow();

    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
