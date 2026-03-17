const mongoose = require('mongoose');
const WorkLog = require('./src/models/WorkLog');
const Employee = require('./src/models/Employee');
const MONGO_URI = 'mongodb://localhost:27017/manhours';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const start = new Date('2025-01-01');
        const end = new Date('2025-02-01');
        const logs = await WorkLog.find({ date: { $gte: start, $lt: end } }).populate('employee');

        console.log(`--- FOUND ${logs.length} LOGS IN JAN 2025 ---`);
        logs.forEach(log => {
            console.log(`ID: ${log._id}, Date: ${log.date.toISOString().split('T')[0]}, Emp: ${log.employee ? log.employee.name : 'NULL'}`);
        });

        process.exit();
    })
    .catch(err => console.error(err));
