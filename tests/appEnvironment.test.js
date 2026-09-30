const { getAppEnvironment } = require("../utils/appEnvironment");

describe("getAppEnvironment", () => {
  it.each(["dev", "prod", "test"])("reports %s as is", (value) => {
    expect(getAppEnvironment(value)).toBe(value);
  });

  it.each(["", "production", "DEV", " dev", "mongodb://host/db"])(
    "reports unknown for %p",
    (value) => {
      expect(getAppEnvironment(value)).toBe("unknown");
    }
  );

  describe("reading APP_ENV", () => {
    const original = process.env.APP_ENV;

    afterEach(() => {
      if (original === undefined) {
        delete process.env.APP_ENV;
      } else {
        process.env.APP_ENV = original;
      }
    });

    it("reads APP_ENV by default", () => {
      process.env.APP_ENV = "prod";

      expect(getAppEnvironment()).toBe("prod");
    });

    it("reports unknown when APP_ENV is unset", () => {
      delete process.env.APP_ENV;

      expect(getAppEnvironment()).toBe("unknown");
    });
  });
});
