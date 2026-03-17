const mongoose = require('mongoose');

const WorkLogSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0, max: 24 }
}, { timestamps: true });

module.exports = mongoose.model('WorkLog', WorkLogSchema);
