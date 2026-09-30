const path = require("path");
const { spawnSync } = require("child_process");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../app");
const UserModel = require("../repository/userModel");
const { toAccountUser } = require("../utils/userSerializer");
const {
  DEV_TEST_USER,
  DEV_ONLY_MESSAGE,
  ensureDevTestUser,
} = require("../utils/devTestUser");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");

describe("ensureDevTestUser", () => {
  const originalAppEnv = process.env.APP_ENV;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(() => {
    process.env.APP_ENV = "dev";
  });

  afterEach(async () => {
    if (originalAppEnv === undefined) {
      delete process.env.APP_ENV;
    } else {
      process.env.APP_ENV = originalAppEnv;
    }
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("creates a verified, profile-complete user with an unusable password", async () => {
    const result = await ensureDevTestUser();

    expect(Object.keys(result).sort()).toEqual(["accessToken", "userName"]);
    expect(result.userName).toBe("agent-test-user");

    const user = await UserModel.findOne({ email: DEV_TEST_USER.email }).select(
      "+password"
    );
    expect(user).toMatchObject({
      userName: "agent-test-user",
      email: "agent-test-user@example.com",
      isActive: true,
      isAdmin: false,
      isEmailVerified: true,
    });
    expect(user.password).toMatch(/^\$2[aby]\$/);
    expect(toAccountUser(user).isProfileComplete).toBe(true);
  });

  it("doesn't duplicate the user when run again, and refreshes its flags", async () => {
    const first = await ensureDevTestUser();
    await UserModel.updateOne(
      { email: DEV_TEST_USER.email },
      { isEmailVerified: false, isActive: false }
    );

    const second = await ensureDevTestUser();

    expect(await UserModel.countDocuments({})).toBe(1);
    expect(second.userName).toBe(first.userName);
    const user = await UserModel.findOne({ email: DEV_TEST_USER.email });
    expect(user.isEmailVerified).toBe(true);
    expect(user.isActive).toBe(true);
  });

  it("returns a token signed like a normal login", async () => {
    const { accessToken } = await ensureDevTestUser();
    const user = await UserModel.findOne({ email: DEV_TEST_USER.email });

    const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    expect(payload).toMatchObject({
      email: DEV_TEST_USER.email,
      userName: "agent-test-user",
      isAdmin: false,
      id: user._id.toString(),
    });
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it("returns a token the API accepts", async () => {
    const { accessToken } = await ensureDevTestUser();

    const response = await request(app)
      .get("/api/account/me")
      .set("Authorization", accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      userName: "agent-test-user",
      isEmailVerified: true,
      isProfileComplete: true,
    });
  });

  it.each(["test", "prod", "unknown", undefined])(
    "refuses to write anything when APP_ENV is %p",
    async (appEnv) => {
      if (appEnv === undefined) {
        delete process.env.APP_ENV;
      } else {
        process.env.APP_ENV = appEnv;
      }

      await expect(ensureDevTestUser()).rejects.toThrow(DEV_ONLY_MESSAGE);
      expect(await UserModel.countDocuments({})).toBe(0);
    }
  );
});

describe("scripts/devTestUser.js", () => {
  it("exits non-zero with a clear message, before connecting, when APP_ENV isn't dev", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, "../scripts/devTestUser.js")],
      {
        env: {
          ...process.env,
          APP_ENV: "prod",
          // Nothing listens here, so a connection attempt would fail loudly
          // instead of reaching a real database.
          MONGO_DB_HOST: "mongodb://127.0.0.1:9/never-used",
        },
        encoding: "utf8",
        timeout: 15000,
      }
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(DEV_ONLY_MESSAGE);
  });
});
