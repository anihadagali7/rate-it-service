// One-time migration: mark pre-existing accounts as email-verified so this
// feature doesn't retroactively lock people out of rating/commenting/etc.
// New signups always get isEmailVerified explicitly set (true or false) at
// creation, so this only ever matches accounts that existed before the
// email-verification feature shipped. Safe to run more than once.
//
// Usage: node scripts/backfillEmailVerified.js

require("dotenv").config();
const mongoose = require("mongoose");
const UsersModel = require("../repository/userModel");

const run = async () => {
  await mongoose.connect(process.env.MONGO_DB_HOST);

  const result = await UsersModel.updateMany(
    { isEmailVerified: { $exists: false } },
    { $set: { isEmailVerified: true } }
  );

  console.log(
    `Backfilled isEmailVerified=true for ${result.modifiedCount} pre-existing account(s).`
  );

  await mongoose.connection.close();
};

run().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
