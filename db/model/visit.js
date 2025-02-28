const mongoose = require('../db');

const VisitSchema = new mongoose.Schema({
    ip: String,
    url: String,
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Visit', VisitSchema); 