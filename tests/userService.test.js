const UserModel = require("../repository/userModel");
const userService = require("../services/userService");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createTestUser } = require("./helpers/seed");

const createMockResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

describe("userService", () => {
  let user;
  let targetUser;

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
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("getAccountDetails", () => {
    it("returns account details for a user", async () => {
      const response = createMockResponse();

      await userService.getAccountDetails(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          user: expect.objectContaining({
            userName: user.userName,
            firstName: "Test",
            email: "test@example.com",
          }),
        },
      });
    });
  });

  describe("followUser", () => {
    it("follows another user and updates both profiles", async () => {
      const response = createMockResponse();

      await userService.followUser(user.userName, targetUser.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({ status: "success" });

      const updatedUser = await UserModel.findOne({ userName: user.userName });
      const updatedTarget = await UserModel.findOne({
        userName: targetUser.userName,
      });
      expect(updatedUser.following).toContain(targetUser.userName);
      expect(updatedTarget.followers).toContain(user.userName);
    });

    it("rejects following yourself", async () => {
      const response = createMockResponse();

      await userService.followUser(user.userName, user.userName, response);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        errors: [{ msg: "You cannot follow yourself" }],
      });
    });

    it("rejects following a user that does not exist", async () => {
      const response = createMockResponse();

      await userService.followUser(user.userName, "ghostuser", response);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        errors: [{ msg: "User not found." }],
      });
    });

    it("rejects following a user you already follow", async () => {
      user.following = [targetUser.userName];
      await user.save();
      const response = createMockResponse();

      await userService.followUser(user.userName, targetUser.userName, response);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        errors: [{ msg: "You already follow this user" }],
      });
    });
  });

  describe("unFollowUser", () => {
    beforeEach(async () => {
      user.following = [targetUser.userName];
      targetUser.followers = [user.userName];
      await user.save();
      await targetUser.save();
    });

    it("unfollows a user and updates both profiles", async () => {
      const response = createMockResponse();

      await userService.unFollowUser(
        user.userName,
        targetUser.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({ status: "success" });

      const updatedUser = await UserModel.findOne({ userName: user.userName });
      const updatedTarget = await UserModel.findOne({
        userName: targetUser.userName,
      });
      expect(updatedUser.following).not.toContain(targetUser.userName);
      expect(updatedTarget.followers).not.toContain(user.userName);
    });

    it("rejects unfollowing yourself", async () => {
      const response = createMockResponse();

      await userService.unFollowUser(user.userName, user.userName, response);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        errors: [{ msg: "You cannot unfollow yourself" }],
      });
    });

    it("rejects unfollowing a user you do not follow", async () => {
      user.following = [];
      await user.save();
      const response = createMockResponse();

      await userService.unFollowUser(
        user.userName,
        targetUser.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        errors: [{ msg: "You do not currently follow this user" }],
      });
    });
  });

  describe("getAllFollowing", () => {
    it("returns the list of users being followed", async () => {
      user.following = [targetUser.userName];
      await user.save();
      const response = createMockResponse();

      await userService.getAllFollowing(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: [
          expect.objectContaining({
            userName: targetUser.userName,
          }),
        ],
      });
    });
  });

  describe("getAllFollowers", () => {
    it("returns the list of followers", async () => {
      targetUser.followers = [user.userName];
      await targetUser.save();
      const response = createMockResponse();

      await userService.getAllFollowers(targetUser.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: [
          expect.objectContaining({
            userName: user.userName,
          }),
        ],
      });
    });
  });

  describe("getAllFriends", () => {
    it("returns followers and following lists", async () => {
      const follower = await createTestUser({
        email: "follower@example.com",
        userName: "followeruser",
      });
      user.following = [targetUser.userName];
      user.followers = [follower.userName];
      await user.save();
      const response = createMockResponse();

      await userService.getAllFriends(user.userName, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          followersList: [
            expect.objectContaining({ userName: follower.userName }),
          ],
          followingList: [
            expect.objectContaining({ userName: targetUser.userName }),
          ],
        },
      });
    });
  });

  describe("getAllUsers", () => {
    it("returns all users in the database", async () => {
      const response = createMockResponse();

      await userService.getAllUsers(response);

      expect(response.status).toHaveBeenCalledWith(200);
      const users = response.json.mock.calls[0][0].data;
      expect(users).toHaveLength(2);
      expect(users).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userName: user.userName }),
          expect.objectContaining({ userName: targetUser.userName }),
        ])
      );
    });
  });

  describe("updateUser", () => {
    it("updates the authenticated user's profile", async () => {
      const response = createMockResponse();

      await userService.updateUser(
        "Updated",
        "Name",
        "9999999999",
        user.userName,
        response
      );

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          user: expect.objectContaining({
            userName: user.userName,
            firstName: "Updated",
            lastName: "Name",
            phoneNumber: "9999999999",
          }),
        },
      });

      const updatedUser = await UserModel.findOne({ userName: user.userName });
      expect(updatedUser.firstName).toBe("Updated");
      expect(updatedUser.lastName).toBe("Name");
      expect(updatedUser.phoneNumber).toBe("9999999999");
    });

    it("returns 400 when the user does not exist", async () => {
      const response = createMockResponse();

      await userService.updateUser(
        "Updated",
        "Name",
        "9999999999",
        "ghostuser",
        response
      );

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        errors: { msg: "This user does not exist" },
      });
    });
  });
});
