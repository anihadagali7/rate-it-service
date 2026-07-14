const jwt = require("jsonwebtoken");
const authToken = require("../middleware/authenticateToken");

const createMockResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

describe("authenticateToken middleware", () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;

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
        email: "user@example.com",
        userName: "user1",
        isAdmin: false,
        id: "abc123",
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

  it("attaches JWT claims to request.user and calls next for a valid token", async () => {
    const token = jwt.sign(
      {
        email: "ani@example.com",
        userName: "anihadagali7",
        isAdmin: false,
        id: "63019b905ccf53564ffb0c84",
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
      email: "ani@example.com",
      userName: "anihadagali7",
      id: "63019b905ccf53564ffb0c84",
      isAdmin: false,
    });
    expect(response.status).not.toHaveBeenCalled();
  });
});
