const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    trade: { type: String, required: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
