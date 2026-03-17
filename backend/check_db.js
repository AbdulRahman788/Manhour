const mongoose = require('mongoose');
const WorkLog = require('./src/models/WorkLog');
const Employee = require('./src/models/Employee');

const MONGO_URI = 'mongodb://localhost:27017/manhours';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("Connected to DB");
        const logs = await WorkLog.find().sort({ date: -1 }).limit(10).populate('employee');
        console.log("--- LATEST 10 WORKLOGS ---");
        logs.forEach(log => {
            console.log(`Date: ${log.date.toISOString().split('T')[0]}, Hours: ${log.hours}, Emp: ${log.employee ? log.employee.name : 'Unknown'}`);
        });
        process.exit();
    })
    .catch(err => console.error(err));
