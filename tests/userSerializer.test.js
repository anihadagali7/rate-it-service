const { toPublicUser, toPublicUsers } = require("../utils/userSerializer");

describe("userSerializer", () => {
  it("strips password from mongoose-like documents", () => {
    const user = {
      _id: "abc123",
      userName: "ani",
      email: "ani@example.com",
      password: "$2b$10$secret",
      toObject() {
        return {
          _id: this._id,
          userName: this.userName,
          email: this.email,
          password: this.password,
        };
      },
    };

    expect(toPublicUser(user)).toEqual({
      _id: "abc123",
      userName: "ani",
      email: "ani@example.com",
    });
  });

  it("strips password from plain objects", () => {
    expect(
      toPublicUser({
        userName: "ani",
        password: "hash",
        firstName: "Ani",
      })
    ).toEqual({
      userName: "ani",
      firstName: "Ani",
    });
  });

  it("returns null for missing users", () => {
    expect(toPublicUser(null)).toBeNull();
    expect(toPublicUser(undefined)).toBeNull();
  });

  it("maps and filters arrays of users", () => {
    expect(
      toPublicUsers([
        { userName: "a", password: "1" },
        null,
        { userName: "b", password: "2" },
      ])
    ).toEqual([{ userName: "a" }, { userName: "b" }]);
  });
});
