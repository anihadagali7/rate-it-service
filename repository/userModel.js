const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const User = new Schema({
    id: Number,
    user_id: String,
    first_name: String,
    last_name: String,
    email: String,
    password: String,
    password_hash: String,
    phone_number: Number,
    is_admin: Boolean,
    active: Boolean,
    date_created: Date,
    date_updated: Date
  });