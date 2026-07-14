const request = require("supertest");
const app = require("../app");
const UserModel = require("../repository/userModel");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser } = require("./helpers/seed");

describe("userRoute", () => {
  let user;
  let targetUser;
  let accessToken;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
    targetUser = await createTestUser({
      email: "target@example.com",
      userName: "targetuser",
      firstName: "Target",
    });
    accessToken = createAccessToken({
      email: user.email,
      userName: user.userName,
      id: user._id.toString(),
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("GET /api/account/:userName", () => {
    it("returns 401 when no token is provided", async () => {
      const response = await request(app).get(
        `/api/account/${user.userName}`
      );

      expect(response.status).toBe(401);
      expect(response.body.errors.msg).toBe("Token not found");
    });

    it("returns account details without a password hash", async () => {
      const response = await request(app)
        .get(`/api/account/${user.userName}`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data.user).toMatchObject({
        userName: user.userName,
        firstName: "Test",
        email: "test@example.com",
      });
      expect(response.body.data.user.password).toBeUndefined();
    });
  });

  describe("GET /api/allUsers", () => {
    it("returns all users when authenticated", async () => {
      const response = await request(app)
        .get("/api/allUsers")
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((result) => !result.password)).toBe(true);
    });
  });

  describe("POST /api/friends/follow", () => {
    it("follows a user as the authenticated user", async () => {
      const response = await request(app)
        .post("/api/friends/follow")
        .set("Authorization", accessToken)
        .send({ userToFollow: targetUser.userName });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");

      const updatedUser = await UserModel.findOne({ userName: user.userName });
      const updatedTarget = await UserModel.findOne({
        userName: targetUser.userName,
      });
      expect(updatedUser.following).toContain(targetUser.userName);
      expect(updatedTarget.followers).toContain(user.userName);
    });

    it("uses JWT identity and ignores currentUser in the request body", async () => {
      const spoofedUser = await createTestUser({
        email: "spoofed@example.com",
        userName: "spoofeduser",
      });

      const response = await request(app)
        .post("/api/friends/follow")
        .set("Authorization", accessToken)
        .send({
          currentUser: spoofedUser.userName,
          userToFollow: targetUser.userName,
        });

      expect(response.status).toBe(200);

      const updatedUser = await UserModel.findOne({ userName: user.userName });
      const updatedSpoofed = await UserModel.findOne({
        userName: spoofedUser.userName,
      });
      expect(updatedUser.following).toContain(targetUser.userName);
      expect(updatedSpoofed.following).not.toContain(targetUser.userName);
    });
  });

  describe("POST /api/friends/unfollow", () => {
    beforeEach(async () => {
      user.following = [targetUser.userName];
      targetUser.followers = [user.userName];
      await user.save();
      await targetUser.save();
    });

    it("unfollows a user as the authenticated user", async () => {
      const response = await request(app)
        .post("/api/friends/unfollow")
        .set("Authorization", accessToken)
        .send({ userToUnfollow: targetUser.userName });

      expect(response.status).toBe(200);

      const updatedUser = await UserModel.findOne({ userName: user.userName });
      const updatedTarget = await UserModel.findOne({
        userName: targetUser.userName,
      });
      expect(updatedUser.following).not.toContain(targetUser.userName);
      expect(updatedTarget.followers).not.toContain(user.userName);
    });
  });

  describe("GET /api/:userName/following", () => {
    it("returns the following list for a user", async () => {
      user.following = [targetUser.userName];
      await user.save();

      const response = await request(app)
        .get(`/api/${user.userName}/following`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userName: targetUser.userName }),
        ])
      );
    });
  });

  describe("GET /api/:userName/followers", () => {
    it("returns the followers list for a user", async () => {
      targetUser.followers = [user.userName];
      await targetUser.save();

      const response = await request(app)
        .get(`/api/${targetUser.userName}/followers`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userName: user.userName }),
        ])
      );
    });
  });

  describe("GET /api/:userName/friendsList", () => {
    it("returns followers and following lists for a user", async () => {
      const follower = await createTestUser({
        email: "follower@example.com",
        userName: "followeruser",
      });
      user.following = [targetUser.userName];
      user.followers = [follower.userName];
      await user.save();

      const response = await request(app)
        .get(`/api/${user.userName}/friendsList`)
        .set("Authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.data.followingList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userName: targetUser.userName }),
        ])
      );
      expect(response.body.data.followersList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userName: follower.userName }),
        ])
      );
    });
  });

  describe("PUT /api/account/update", () => {
    it("updates the authenticated user's profile", async () => {
      const response = await request(app)
        .put("/api/account/update")
        .set("Authorization", accessToken)
        .send({
          firstName: "Updated",
          lastName: "Profile",
          phoneNumber: "8888888888",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user).toMatchObject({
        userName: user.userName,
        firstName: "Updated",
        lastName: "Profile",
        phoneNumber: "8888888888",
      });
      expect(response.body.data.user.password).toBeUndefined();
    });

    it("uses JWT identity and ignores userName in the request body", async () => {
      const response = await request(app)
        .put("/api/account/update")
        .set("Authorization", accessToken)
        .send({
          firstName: "Hacked",
          lastName: "Victim",
          phoneNumber: "1111111111",
          userName: targetUser.userName,
          email: targetUser.email,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.userName).toBe(user.userName);

      const victim = await UserModel.findOne({ userName: targetUser.userName });
      expect(victim.firstName).toBe("Target");
    });
  });
});
