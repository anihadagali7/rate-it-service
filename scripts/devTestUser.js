// Creates (or refreshes) the dev test user `agent-test-user` and prints
// `{ "userName": "...", "accessToken": "..." }` to stdout, so an agent can log
// in to the UI by setting localStorage `accessToken` and `userName`. Refuses to
// run unless APP_ENV is "dev". Safe to run more than once; re-run it when the
// token expires (JWT_EXPIRES_IN).
//
// Usage: node scripts/devTestUser.js

require("dotenv").config();
const mongoose = require("mongoose");
const {
  assertDevEnvironment,
  ensureDevTestUser,
} = require("../utils/devTestUser");

const run = async () => {
  assertDevEnvironment();

  await mongoose.connect(process.env.MONGO_DB_HOST);
  try {
    const result = await ensureDevTestUser();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await mongoose.connection.close();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
