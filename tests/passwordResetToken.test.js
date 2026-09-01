const {
  createPasswordResetToken,
  hashToken,
} = require("../utils/passwordResetToken");

describe("passwordResetToken", () => {
  it("generates a unique raw token whose hash matches hashToken", () => {
    const { rawToken, tokenHash } = createPasswordResetToken();

    expect(rawToken).toEqual(expect.any(String));
    expect(rawToken.length).toBeGreaterThan(0);
    expect(hashToken(rawToken)).toBe(tokenHash);
  });

  it("never generates the same raw token twice", () => {
    const first = createPasswordResetToken();
    const second = createPasswordResetToken();

    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("sets an expiry roughly 1 hour in the future", () => {
    const before = Date.now();
    const { expires } = createPasswordResetToken();
    const after = Date.now();

    const oneHour = 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThanOrEqual(before + oneHour);
    expect(expires.getTime()).toBeLessThanOrEqual(after + oneHour);
  });

  it("hashes deterministically and never returns the raw token", () => {
    const hash1 = hashToken("same-input");
    const hash2 = hashToken("same-input");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe("same-input");
  });
});
