const mongoose = require('../db');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    // unique: true 表示唯一
    password: { type: String, required: true },
    realname: { type: String, required: true },
    avatarPath: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

