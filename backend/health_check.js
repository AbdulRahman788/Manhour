const http = require('http');
const mongoose = require('mongoose');
const WorkLog = require('./src/models/WorkLog');
const Employee = require('./src/models/Employee');

const MONGO_URI = 'mongodb://localhost:27017/manhours';

// CHECK 1: Server Status (HTTP Request)
const checkServer = () => {
    return new Promise((resolve) => {
        http.get('http://localhost:5000', (res) => {
            console.log(`[PASS] Server is running (Status: ${res.statusCode})`);
            resolve(true);
        }).on('error', (e) => {
            console.error(`[FAIL] Server unreachable: ${e.message}`);
            resolve(false);
        });
    });
};

// CHECK 2: Database Data (Jan 2026)
const checkDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`[PASS] Connected to Database`);

        const start = new Date('2026-01-01');
        const end = new Date('2026-02-01');

        const logs = await WorkLog.find({ date: { $gte: start, $lt: end } });
        const employees = await Employee.countDocuments();

        console.log(`[INFO] Total Employees: ${employees}`);
        console.log(`[INFO] Logs for Jan 2026: ${logs.length}`);

        if (logs.length > 0) {
            console.log(`[PASS] Data exists for Jan 2026!`);
        } else {
            console.warn(`[WARN] No data found for Jan 2026. Did migration work?`);
        }

    } catch (e) {
        console.error(`[FAIL] DB Error: ${e.message}`);
    } finally {
        // mongoose.connection.close(); // Keep open for consistent script exit if needed, or close
        process.exit();
    }
};

// Run Checks
(async () => {
    console.log("--- SYSTEM HEALTH CHECK ---");
    await checkServer();
    await checkDB();
})();
