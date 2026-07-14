const jwt = require("jsonwebtoken");
const authToken = require("../middleware/authenticateToken");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { createTestUser } = require("./helpers/seed");

const createMockResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

describe("authenticateToken middleware", () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  let user;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    user = await createTestUser();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const request = { headers: {} };
    const response = createMockResponse();
    const next = jest.fn();

    await authToken(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      errors: { msg: "Token not found" },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when token is invalid", async () => {
    const request = { headers: { authorization: "not-a-valid-token" } };
    const response = createMockResponse();
    const next = jest.fn();

    await authToken(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      errors: { msg: "Invalid token" },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when token was signed with a different secret", async () => {
    const token = jwt.sign(
      {
        email: user.email,
        userName: user.userName,
        isAdmin: false,
        id: user._id.toString(),
      },
      "wrong-secret",
      { expiresIn: "1h" }
    );
    const request = { headers: { authorization: token } };
    const response = createMockResponse();
    const next = jest.fn();

    await authToken(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the user is inactive", async () => {
    user.isActive = false;
    await user.save();

    const token = jwt.sign(
      {
        email: user.email,
        userName: user.userName,
        isAdmin: false,
        id: user._id.toString(),
      },
      secret,
      { expiresIn: "1h" }
    );
    const request = { headers: { authorization: token } };
    const response = createMockResponse();
    const next = jest.fn();

    await authToken(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      errors: { msg: "Invalid token" },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the user no longer exists", async () => {
    const token = jwt.sign(
      {
        email: user.email,
        userName: user.userName,
        isAdmin: false,
        id: user._id.toString(),
      },
      secret,
      { expiresIn: "1h" }
    );
    await user.deleteOne();

    const request = { headers: { authorization: token } };
    const response = createMockResponse();
    const next = jest.fn();

    await authToken(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches JWT claims to request.user and calls next for a valid token", async () => {
    const token = jwt.sign(
      {
        email: user.email,
        userName: user.userName,
        isAdmin: false,
        id: user._id.toString(),
      },
      secret,
      { expiresIn: "1h" }
    );
    const request = { headers: { authorization: token } };
    const response = createMockResponse();
    const next = jest.fn();

    await authToken(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(request.user).toEqual({
      email: user.email,
      userName: user.userName,
      id: user._id.toString(),
      isAdmin: false,
    });
    expect(response.status).not.toHaveBeenCalled();
  });
});
