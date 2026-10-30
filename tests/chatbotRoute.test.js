const request = require("supertest");
const app = require("../app");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createAccessToken } = require("./helpers/auth");
const { createTestUser } = require("./helpers/seed");

describe("chatbotRoute", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/chatbot", () => {
    it("returns hi to a logged out user", async () => {
      const response = await request(app)
        .post("/api/chatbot")
        .send({ messages: [{ role: "user", content: "hi" }] });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.reply).toBe("hi");
    });

    it("returns hi to a logged in user", async () => {
      const user = await createTestUser();
      const accessToken = createAccessToken({
        email: user.email,
        userName: user.userName,
        id: user._id.toString(),
      });

      const response = await request(app)
        .post("/api/chatbot")
        .set("Authorization", accessToken)
        .send({ messages: [{ role: "user", content: "hi" }] });

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(200);
      expect(response.body.data.reply).toBe("hi");
    });
  });
});
