const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  user_name: { type: String, unique: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, unique: true },
  password: { type: String, required: true },
  phone_number: String,
  picture: String,
  followers: [{ type: String }],
  following: [{ type: String }],
  is_admin: Boolean,
  is_active: Boolean,
  date_created: Date,
  date_updated: Date,
});

const users = mongoose.model("user", userSchema);
module.exports = users;
