jest.mock("../client/cloudinaryClient");

const request = require("supertest");
const app = require("../app");
const UsersModel = require("../repository/userModel");
const cloudinaryClient = require("../client/cloudinaryClient");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser } = require("./helpers/seed");

// A minimal but valid 1x1 PNG, so real image-processing libraries (if ever
// added) would still accept it as a genuine image.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

describe("PUT /api/account/picture", () => {
  let user;
  let accessToken;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
    accessToken = createAccessToken({
      email: user.email,
      userName: user.userName,
      id: user._id.toString(),
    });
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("returns 401 when no token is provided", async () => {
    const response = await request(app)
      .put("/api/account/picture")
      .attach("picture", TINY_PNG, {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(401);
  });

  it("rejects a request with no file attached", async () => {
    const response = await request(app)
      .put("/api/account/picture")
      .set("Authorization", accessToken);

    expect(response.status).toBe(400);
    expect(response.body.errors.msg).toBe("No image file was provided");
    expect(cloudinaryClient.uploadProfilePicture).not.toHaveBeenCalled();
  });

  it("rejects a disallowed file type", async () => {
    const response = await request(app)
      .put("/api/account/picture")
      .set("Authorization", accessToken)
      .attach("picture", Buffer.from("not an image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(cloudinaryClient.uploadProfilePicture).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024, 1);

    const response = await request(app)
      .put("/api/account/picture")
      .set("Authorization", accessToken)
      .attach("picture", oversized, {
        filename: "huge.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(cloudinaryClient.uploadProfilePicture).not.toHaveBeenCalled();
  });

  it("uploads the picture and stores the returned secure_url on the user", async () => {
    cloudinaryClient.uploadProfilePicture.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/rateit/image/upload/v1/avatar.png",
    });

    const response = await request(app)
      .put("/api/account/picture")
      .set("Authorization", accessToken)
      .attach("picture", TINY_PNG, {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.user.picture).toBe(
      "https://res.cloudinary.com/rateit/image/upload/v1/avatar.png"
    );
    expect(cloudinaryClient.uploadProfilePicture).toHaveBeenCalledWith(
      user._id.toString(),
      expect.any(Buffer)
    );

    const stored = await UsersModel.findById(user._id);
    expect(stored.picture).toBe(
      "https://res.cloudinary.com/rateit/image/upload/v1/avatar.png"
    );
  });

  it("returns a clean 502 instead of crashing when Cloudinary fails", async () => {
    cloudinaryClient.uploadProfilePicture.mockRejectedValue(
      new Error("Cloudinary upload failed: network error")
    );

    const response = await request(app)
      .put("/api/account/picture")
      .set("Authorization", accessToken)
      .attach("picture", TINY_PNG, {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(502);
    expect(response.body.errors.msg).toEqual(expect.any(String));

    const stored = await UsersModel.findById(user._id);
    expect(stored.picture).toBeUndefined();
  });

  it("re-uploading overwrites the previous picture rather than accumulating", async () => {
    cloudinaryClient.uploadProfilePicture
      .mockResolvedValueOnce({ secure_url: "https://example.com/first.png" })
      .mockResolvedValueOnce({ secure_url: "https://example.com/second.png" });

    await request(app)
      .put("/api/account/picture")
      .set("Authorization", accessToken)
      .attach("picture", TINY_PNG, {
        filename: "first.png",
        contentType: "image/png",
      });

    const second = await request(app)
      .put("/api/account/picture")
      .set("Authorization", accessToken)
      .attach("picture", TINY_PNG, {
        filename: "second.png",
        contentType: "image/png",
      });

    expect(second.status).toBe(200);
    expect(second.body.data.user.picture).toBe("https://example.com/second.png");
    expect(cloudinaryClient.uploadProfilePicture).toHaveBeenCalledTimes(2);
    expect(cloudinaryClient.uploadProfilePicture.mock.calls[0][0]).toBe(
      cloudinaryClient.uploadProfilePicture.mock.calls[1][0]
    );
  });
});
