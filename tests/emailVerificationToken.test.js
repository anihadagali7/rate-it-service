const {
  createVerificationToken,
  hashToken,
} = require("../utils/emailVerificationToken");

describe("emailVerificationToken", () => {
  it("generates a unique raw token whose hash matches hashToken", () => {
    const { rawToken, tokenHash } = createVerificationToken();

    expect(rawToken).toEqual(expect.any(String));
    expect(rawToken.length).toBeGreaterThan(0);
    expect(hashToken(rawToken)).toBe(tokenHash);
  });

  it("never generates the same raw token twice", () => {
    const first = createVerificationToken();
    const second = createVerificationToken();

    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("sets an expiry roughly 24 hours in the future", () => {
    const before = Date.now();
    const { expires } = createVerificationToken();
    const after = Date.now();

    const twentyFourHours = 24 * 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThanOrEqual(
      before + twentyFourHours
    );
    expect(expires.getTime()).toBeLessThanOrEqual(after + twentyFourHours);
  });

  it("hashes deterministically and never returns the raw token", () => {
    const hash1 = hashToken("same-input");
    const hash2 = hashToken("same-input");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe("same-input");
  });
});
