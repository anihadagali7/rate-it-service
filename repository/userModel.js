const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: { type: String, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true },
  password: { type: String, required: true },
  phoneNumber: String,
  picture: { type: String, required: true },
  followers: [{ type: String }],
  following: [{ type: String }],
  isAdmin: Boolean,
  isActive: Boolean,
  dateCreated: Date,
  dateUpdated: Date,
});

const users = mongoose.model("user", userSchema);
module.exports = users;
