/*
 * Builds the OpenAPI spec from the `@openapi` JSDoc blocks in routes/*.js and
 * the shared components in openapi/components.yaml.
 *
 *   npm run openapi         write openapi.json
 *   npm run openapi:check   fail if openapi.json is out of date (used in CI)
 */
const fs = require("fs");
const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "openapi.json");

const definition = {
  openapi: "3.0.3",
  info: {
    title: "Rate It API",
    version: "1.0.0",
    description:
      "API for Rate It, a social app for rating movies, TV, music, and books. " +
      "Success responses are `{ status: \"success\", data: { ... } }`; errors are " +
      "`{ errors: { msg } }`.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Health" },
    { name: "Auth", description: "Signup, login, social sign-in, email verification, password" },
    { name: "Ratings" },
    { name: "Users", description: "Accounts, profiles, and following" },
    { name: "Media", description: "Movie, TV, music, and book details" },
    { name: "Search" },
  ],
};

// Sort object keys (not array items) so the output doesn't depend on the order
// files or annotations are read in, and regenerating never produces a noisy diff.
const sortKeys = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = sortKeys(value[key]);
        return sorted;
      }, {});
  }
  return value;
};

const buildSpec = () => {
  const spec = swaggerJsdoc({
    definition,
    apis: [
      path.join(ROOT, "routes/*.js"),
      path.join(ROOT, "openapi/components.yaml"),
    ],
    failOnErrors: true,
  });

  return `${JSON.stringify(sortKeys(spec), null, 2)}\n`;
};

const main = () => {
  const spec = buildSpec();

  if (process.argv.includes("--check")) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, "utf8") : "";
    if (current !== spec) {
      console.error(
        "openapi.json is out of date. Run `npm run openapi` and commit the result."
      );
      process.exit(1);
    }
    console.log("openapi.json is up to date.");
    return;
  }

  fs.writeFileSync(OUTPUT, spec);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)}`);
};

if (require.main === module) {
  main();
}

module.exports = { buildSpec };
