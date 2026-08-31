const {
  toPublicUser,
  toAccountUser,
  toPublicUsers,
} = require("../utils/userSerializer");

describe("userSerializer", () => {
  const fullUser = {
    _id: "abc123",
    userName: "ani",
    firstName: "Ani",
    lastName: "Hadagali",
    email: "ani@example.com",
    phoneNumber: "3135551212",
    picture: "https://example.com/avatar.jpg",
    followers: ["friend1"],
    following: ["friend2"],
    isActive: true,
    isAdmin: false,
    password: "$2b$10$secret",
    dateCreated: Date.now(),
    dateUpdated: Date.now(),
  };

  it("returns only public fields from mongoose-like documents", () => {
    const user = {
      ...fullUser,
      toObject() {
        return { ...fullUser };
      },
    };

    expect(toPublicUser(user)).toEqual({
      _id: "abc123",
      userName: "ani",
      firstName: "Ani",
      lastName: "Hadagali",
      picture: "https://example.com/avatar.jpg",
      followers: ["friend1"],
      following: ["friend2"],
    });
  });

  it("returns account fields for the authenticated user", () => {
    expect(toAccountUser(fullUser)).toEqual({
      _id: "abc123",
      userName: "ani",
      firstName: "Ani",
      lastName: "Hadagali",
      picture: "https://example.com/avatar.jpg",
      followers: ["friend1"],
      following: ["friend2"],
      email: "ani@example.com",
      phoneNumber: "3135551212",
      isActive: true,
      isAdmin: false,
      isProfileComplete: true,
    });
  });

  it("marks the profile incomplete when there is no userName yet", () => {
    const { userName, ...userWithoutUserName } = fullUser;

    expect(toAccountUser(userWithoutUserName).isProfileComplete).toBe(false);
  });

  it("includes isEmailVerified for the account owner when present", () => {
    expect(
      toAccountUser({ ...fullUser, isEmailVerified: true }).isEmailVerified
    ).toBe(true);
    expect(
      toAccountUser({ ...fullUser, isEmailVerified: false }).isEmailVerified
    ).toBe(false);
  });

  it("never exposes the verification token hash or expiry", () => {
    const withToken = {
      ...fullUser,
      isEmailVerified: false,
      emailVerificationTokenHash: "secret-hash",
      emailVerificationExpires: new Date(),
    };

    expect(toAccountUser(withToken).emailVerificationTokenHash).toBeUndefined();
    expect(toAccountUser(withToken).emailVerificationExpires).toBeUndefined();
  });

  it("never exposes password from plain objects", () => {
    expect(toPublicUser(fullUser).password).toBeUndefined();
    expect(toAccountUser(fullUser).password).toBeUndefined();
  });

  it("returns null for missing users", () => {
    expect(toPublicUser(null)).toBeNull();
    expect(toPublicUser(undefined)).toBeNull();
    expect(toAccountUser(null)).toBeNull();
  });

  it("maps and filters arrays of users", () => {
    expect(
      toPublicUsers([
        fullUser,
        null,
        { userName: "b", firstName: "Bee", password: "2" },
      ])
    ).toEqual([
      {
        _id: "abc123",
        userName: "ani",
        firstName: "Ani",
        lastName: "Hadagali",
        picture: "https://example.com/avatar.jpg",
        followers: ["friend1"],
        following: ["friend2"],
      },
      {
        userName: "b",
        firstName: "Bee",
      },
    ]);
  });
});
