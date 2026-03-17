const mongoose = require('mongoose');
const WorkLog = require('./src/models/WorkLog');
const Employee = require('./src/models/Employee'); // Ensure Employee model is registered
const MONGO_URI = 'mongodb://localhost:27017/manhours';

mongoose.connect(MONGO_URI)
    .then(async () => {
        // Check Jan 2026
        const start26 = new Date('2026-01-01');
        const end26 = new Date('2026-02-01');
        const logs26 = await WorkLog.find({ date: { $gte: start26, $lt: end26 } }).populate('employee');
        console.log(`--- JAN 2026 LOGS (${logs26.length}) ---`);
        logs26.slice(0, 5).forEach(log => {
            console.log(`Date: ${log.date.toISOString().split('T')[0]}, Emp: ${log.employee ? log.employee.name : 'NULL'}`);
        });

        // Check Jan 2025
        const start25 = new Date('2025-01-01');
        const end25 = new Date('2025-02-01');
        const logs25 = await WorkLog.find({ date: { $gte: start25, $lt: end25 } }).populate('employee');
        console.log(`--- JAN 2025 LOGS (${logs25.length}) ---`);
        logs25.slice(0, 5).forEach(log => {
            console.log(`Date: ${log.date.toISOString().split('T')[0]}, Emp: ${log.employee ? log.employee.name : 'NULL'}`);
        });

        process.exit();
    })
    .catch(err => console.error(err));
