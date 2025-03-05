const mongoose = require('../db');

const CommentSchema = new mongoose.Schema({
    userId: String,
    realname: String,
    content: String,
    createdAt: { type: Date, default: Date.now },
    replies: [
        {
            userId: String,
            realname: String,
            content: String,
            createdAt: { type: Date, default: Date.now },
            replyTo: String
        }
    ]
});

const BlogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    likes: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likedUsers: { type: [String], default: [] },
    starUsers: { type: [String], default: [] },
    comments: {
        type: [CommentSchema],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('Blog', BlogSchema);
