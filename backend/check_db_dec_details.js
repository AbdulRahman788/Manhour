const mongoose = require('mongoose');
const WorkLog = require('./src/models/WorkLog');
const Employee = require('./src/models/Employee');
const MONGO_URI = 'mongodb://localhost:27017/manhours';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const start = new Date('2025-12-01');
        const end = new Date('2026-01-01');
        const logs = await WorkLog.find({ date: { $gte: start, $lt: end } }).populate('employee');

        console.log(`--- DEC 2025 LOGS (${logs.length}) ---`);
        logs.forEach(log => {
            console.log(`Date: ${log.date.toISOString()}, Emp: ${log.employee ? log.employee.name : 'NULL EMPLOYEE'}, Hours: ${log.hours}`);
        });

        process.exit();
    })
    .catch(err => console.error(err));
