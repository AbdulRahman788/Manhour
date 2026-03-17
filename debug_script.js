const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';
let token = '';

async function runDebug() {
    try {
        console.log('1. Logging in...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'adminpass' }) // Using default admin creds
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        token = loginData.token;
        console.log('Login successful. Token acquired.');

        console.log('\n2. Testing "Add Employee"...');
        const empRes = await fetch(`${BASE_URL}/employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: "Debug User " + Date.now(),
                company: "Debug Corp",
                role: "Tester",
                trade: "Debugging"
            })
        });

        if (empRes.ok) {
            console.log('Add Employee passed:', await empRes.json());
        } else {
            console.error('Add Employee failed:', await empRes.text());
        }

        console.log('\n3. Testing "Get Work Logs" (checking for dates)...');
        // Check current month
        const today = new Date();
        const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        console.log(`Fetching logs for ${month}...`);

        const logsRes = await fetch(`${BASE_URL}/worklogs?month=${month}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (logsRes.ok) {
            const logs = await logsRes.json();
            if (logs.length > 0) {
                console.log('First log entry date field:', logs[0].date);
                console.log('Full first entry:', JSON.stringify(logs[0], null, 2));
            } else {
                console.log('No logs found for this month.');
            }
        } else {
            console.error('Fetch logs failed:', await logsRes.text());
        }

    } catch (e) {
        console.error('Debug script error:', e);
    }
}

runDebug();
