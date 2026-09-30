const fs = require("fs");
const path = require("path");
const request = require("supertest");
const SwaggerParser = require("@apidevtools/swagger-parser");
const app = require("../app");
const spec = require("../openapi.json");
const { buildSpec } = require("../scripts/generate-openapi");
const {
  loadApp,
  listRoutes,
  listSpecRoutes,
} = require("./helpers/listRoutes");

// Dev tooling, not part of the API.
const DEV_ONLY = ["GET /api/openapi.json"];

describe("OpenAPI spec", () => {
  it("is a valid OpenAPI 3.0 document", async () => {
    // validate() mutates its input, so give it a copy.
    await expect(
      SwaggerParser.validate(JSON.parse(JSON.stringify(spec)))
    ).resolves.toBeDefined();
    expect(spec.openapi).toBe("3.0.3");
  });

  it("is up to date with the route annotations", () => {
    const committed = fs.readFileSync(
      path.join(__dirname, "../openapi.json"),
      "utf8"
    );
    // On failure: run `npm run openapi` and commit openapi.json.
    expect(committed).toBe(buildSpec());
  });

  describe("route coverage", () => {
    const appRoutes = listRoutes(loadApp()).filter(
      (route) => !DEV_ONLY.includes(route)
    );
    const specRoutes = listSpecRoutes(spec);

    it("documents every route", () => {
      const missing = appRoutes.filter((route) => !specRoutes.includes(route));
      // Add an @openapi block above each of these routes.
      expect(missing).toEqual([]);
    });

    it("only documents routes that exist", () => {
      const extra = specRoutes.filter((route) => !appRoutes.includes(route));
      expect(extra).toEqual([]);
    });
  });

  describe("toSatisfyApiSpec matcher", () => {
    const fakeResponse = (status, body) => ({
      req: { method: "GET", path: "/api" },
      status,
      body,
    });

    it("passes a documented response", () => {
      expect(fakeResponse(200, { status: "UP" })).toSatisfyApiSpec();
    });

    it("fails a body that doesn't match the schema", () => {
      expect(fakeResponse(200, { status: "DOWN" })).not.toSatisfyApiSpec();
    });

    it("fails an undocumented status code", () => {
      expect(fakeResponse(500, {})).not.toSatisfyApiSpec();
    });
  });
});

describe("API docs routes", () => {
  it("serves the spec at /api/openapi.json outside production", async () => {
    const response = await request(app).get("/api/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(spec);
  });

  it("serves Swagger UI at /api/docs outside production", async () => {
    const response = await request(app).get("/api/docs/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/html/);
    expect(response.text).toContain("swagger-ui");
  });

  describe("in production", () => {
    let prodApp;
    const originalNodeEnv = process.env.NODE_ENV;

    beforeAll(() => {
      process.env.NODE_ENV = "production";
      jest.isolateModules(() => {
        prodApp = require("../app");
      });
    });

    afterAll(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("still serves the API", async () => {
      const response = await request(prodApp).get("/api");

      expect(response.status).toBe(200);
    });

    it.each(["/api/openapi.json", "/api/docs/"])("returns 404 for %s", async (url) => {
      const response = await request(prodApp).get(url);

      expect(response.status).toBe(404);
    });
  });
});
