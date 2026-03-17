const mongoose = require('mongoose');
const WorkLog = require('./src/models/WorkLog');
const MONGO_URI = 'mongodb://localhost:27017/manhours';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const start = new Date('2025-01-01');
        const end = new Date('2025-02-01');
        const logs = await WorkLog.find({ date: { $gte: start, $lt: end } });

        console.log(`Found ${logs.length} logs to migrate...`);
        let updatedCount = 0;

        for (const log of logs) {
            const originalDate = new Date(log.date);
            const newDate = new Date(originalDate);
            newDate.setFullYear(2026);

            // Validate: Check if duplicate exists for new date?
            // For now, let's just update. If duplicate exists, it might error if unique index exists (but we don't have one enforced by schema unique constraint yet, just application logic).

            log.date = newDate;
            await log.save();
            updatedCount++;
            process.stdout.write('.');
        }

        console.log(`\nSuccessfully migrated ${updatedCount} logs to Jan 2026.`);
        process.exit();
    })
    .catch(err => console.error(err));
