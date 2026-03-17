const mongoose = require('mongoose');
const WorkLog = require('./src/models/WorkLog');
const MONGO_URI = 'mongodb://localhost:27017/manhours';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const start = new Date('2025-12-01');
        const end = new Date('2026-01-01');
        const logs = await WorkLog.find({ date: { $gte: start, $lt: end } });
        console.log(`Logs found for Dec 2025: ${logs.length}`);

        const startJan = new Date('2026-01-01');
        const endJan = new Date('2026-02-01');
        const logsJan = await WorkLog.find({ date: { $gte: startJan, $lt: endJan } });
        console.log(`Logs found for Jan 2026: ${logsJan.length}`);

        process.exit();
    })
    .catch(err => console.error(err));
