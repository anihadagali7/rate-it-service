const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  userName: { type: String, unique: true, sparse: true },
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  email: { type: String, unique: true },
  password: {
    type: String,
    select: false,
    required: function () {
      return !this.googleId && !this.facebookId && !this.appleId;
    },
  },
  googleId: { type: String, unique: true, sparse: true },
  facebookId: { type: String, unique: true, sparse: true },
  appleId: { type: String, unique: true, sparse: true },
  phoneNumber: String,
  picture: String,
  followers: [{ type: String }],
  following: [{ type: String }],
  isAdmin: Boolean,
  isActive: Boolean,
  dateCreated: Date,
  dateUpdated: Date,
});

const stripPassword = (_doc, ret) => {
  delete ret.password;
  return ret;
};

userSchema.set("toJSON", { transform: stripPassword });
userSchema.set("toObject", { transform: stripPassword });

const users = mongoose.model("user", userSchema);
module.exports = users;
