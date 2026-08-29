const UsersModel = require("../repository/userModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

describe("userModel", () => {
  beforeAll(async () => {
    await connect();
    // Force index build to complete before any test relies on unique-index
    // enforcement, since Mongoose builds indexes asynchronously by default.
    await UsersModel.init();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("requires a password when no social provider id is set", async () => {
    const user = new UsersModel({
      email: "no-password@example.com",
      isActive: true,
      isAdmin: false,
    });

    await expect(user.validate()).rejects.toThrow();
  });

  it("does not require a password when a social provider id is set", async () => {
    const user = new UsersModel({
      email: "social@example.com",
      googleId: "google-sub-123",
      isActive: true,
      isAdmin: false,
    });

    await expect(user.validate()).resolves.toBeUndefined();
  });

  it("allows multiple users with no userName yet (sparse unique index)", async () => {
    await new UsersModel({
      email: "first@example.com",
      googleId: "google-sub-1",
      isActive: true,
      isAdmin: false,
    }).save();

    await expect(
      new UsersModel({
        email: "second@example.com",
        googleId: "google-sub-2",
        isActive: true,
        isAdmin: false,
      }).save()
    ).resolves.toBeDefined();
  });

  it("still enforces uniqueness once a userName is set", async () => {
    await new UsersModel({
      email: "first@example.com",
      userName: "takenname",
      googleId: "google-sub-1",
      isActive: true,
      isAdmin: false,
    }).save();

    await expect(
      new UsersModel({
        email: "second@example.com",
        userName: "takenname",
        googleId: "google-sub-2",
        isActive: true,
        isAdmin: false,
      }).save()
    ).rejects.toThrow();
  });
});
