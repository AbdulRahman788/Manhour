const express = require('express');
const router = express.Router();
const WorkLog = require('../models/WorkLog');
const Employee = require('../models/Employee');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const mongoose = require('mongoose');

function parseMonthRange(month) {
    if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) return null;

    const [year, monthStr] = month.split('-').map(Number);
    if (!year || !monthStr || monthStr < 1 || monthStr > 12) return null;

    return {
        start: new Date(Date.UTC(year, monthStr - 1, 1)),
        end: new Date(Date.UTC(year, monthStr, 1)),
        year,
        month: monthStr
    };
}

function parseWorkDate(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return null;

    const [year, month, day] = date.split('-').map(Number);
    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() + 1 !== month ||
        parsed.getUTCDate() !== day
    ) {
        return null;
    }

    return parsed;
}

function normalizeHours(hours) {
    const value = Number(hours);
    if (!Number.isFinite(value) || value < 0 || value > 24) return null;
    return Number(value.toFixed(2));
}

function normalizeEmployeeName(name) {
    return typeof name === 'string' ? name.trim() : '';
}

function normalizeEmployeeNameKey(name) {
    return normalizeEmployeeName(name).toLowerCase();
}

// Helper to check duplicate entry for same employee and date
async function isDuplicate(employeeId, date) {
    const start = new Date(date);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const existing = await WorkLog.findOne({ employee: employeeId, date: { $gte: start, $lt: end } });
    return !!existing;
}

// Manager logs hours (manager role)
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    const { employeeId, date, hours } = req.body;
    const normalizedDate = parseWorkDate(date);
    const normalizedHours = normalizeHours(hours);

    if (!employeeId || !normalizedDate || normalizedHours === null) {
        return res.status(400).json({ message: 'employeeId, date and hours are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: 'Invalid employeeId' });
    }
    try {
        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        if (await isDuplicate(employeeId, normalizedDate)) {
            return res.status(409).json({ message: 'Work log for this employee on this date already exists' });
        }
        const workLog = new WorkLog({ employee: employeeId, date: normalizedDate, hours: normalizedHours });
        await workLog.save();
        res.status(201).json(workLog);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get work logs for a month (admin or manager)
router.get('/', authenticateToken, async (req, res) => {
    const { month } = req.query; // format YYYY-MM
    const range = parseMonthRange(month);
    if (!range) return res.status(400).json({ message: 'Month query parameter must use YYYY-MM' });

    try {
        const logs = await WorkLog.find({ date: { $gte: range.start, $lt: range.end } })
            .populate('employee', 'name company role trade');
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Export work logs as CSV for a given month (Matrix Format)
router.get('/export', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    const { month } = req.query; // format YYYY-MM
    const range = parseMonthRange(month);
    if (!range) return res.status(400).json({ message: 'Month query parameter must use YYYY-MM' });

    try {
        const logs = await WorkLog.find({ date: { $gte: range.start, $lt: range.end } })
            .populate('employee', 'name company role trade');

        // 1. Generate all dates for the month
        const daysInMonth = new Date(Date.UTC(range.year, range.month, 0)).getUTCDate();
        const dateHeaders = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = monthNames[range.month - 1];

        for (let d = 1; d <= daysInMonth; d++) {
            dateHeaders.push(`${d}-${monthName}`);
        }

        // 2. Group logs by Employee
        const empMap = new Map();
        logs.forEach(log => {
            const empId = log.employee._id.toString();
            if (!empMap.has(empId)) {
                empMap.set(empId, {
                    info: log.employee,
                    hours: {} // Map date number (1-31) to hours
                });
            }
            const day = new Date(log.date).getUTCDate();
            empMap.get(empId).hours[day] = log.hours;
        });

        // 3. Build CSV
        // Header
        let csv = `S.No.,Name,Trade,Company,${dateHeaders.join(',')},Total\n`;

        // Rows
        let sNo = 1;
        for (const [empId, data] of empMap.entries()) {
            const e = data.info;
            let row = `${sNo++},"${e.name || ''}","${e.trade || ''}","${e.company || ''}"`;

            let totalHours = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const h = data.hours[d] || 0;
                row += `,${h}`;
                totalHours += h;
            }
            row += `,${totalHours}`; // Add total at end
            csv += `${row}\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="worklogs_matrix_${month}.csv"`);
        res.send(csv);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get all work logs (admin only)
router.get('/all', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const logs = await WorkLog.find().populate('employee', 'name company role trade');
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Export all work logs as CSV (admin & manager)
router.get('/export/all', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const logs = await WorkLog.find().populate('employee', 'name company role trade');
        // Build CSV
        let csv = 'Employee Name,Company,Role,Trade,Date,Hours\n';
        logs.forEach(entry => {
            const e = entry.employee;
            const dateStr = entry.date.toISOString().split('T')[0];
            csv += `${e.name},${e.company},${e.role},${e.trade},${dateStr},${entry.hours}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="worklogs_all.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Bulk Import WorkLogs (admin & manager)
router.post('/bulk', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    const logs = req.body; // Expects [{ name: 'John', date: '2023-01-01', hours: 8 }, ...]
    if (!Array.isArray(logs) || logs.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array' });
    }

    try {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        const allEmployees = await Employee.find({}, 'name');
        const empMap = new Map();
        const ambiguousNames = new Set();

        allEmployees.forEach(employee => {
            const key = normalizeEmployeeNameKey(employee.name);
            if (!key) return;

            if (empMap.has(key)) {
                ambiguousNames.add(key);
                return;
            }

            empMap.set(key, employee._id);
        });

        if (ambiguousNames.size > 0) {
            return res.status(409).json({
                message: 'Bulk import is blocked because multiple employees share the same name. Resolve duplicate employee names first.'
            });
        }

        // Cache employees to minimize DB lookups
        const uniqueNames = [...new Set(logs.map(l => normalizeEmployeeName(l.name)).filter(Boolean))];

        // Identify missing employees and create them
        const missingNames = uniqueNames.filter(name => !empMap.has(normalizeEmployeeNameKey(name)));
        if (missingNames.length > 0) {
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    message: 'Managers cannot create missing employees through bulk import',
                    missingEmployees: missingNames
                });
            }

            const newEmployees = [];

            // We need to find the details for each missing name from the logs
            missingNames.forEach(name => {
                // Find first log entry for this person to get their details
                const logEntry = logs.find(l => normalizeEmployeeName(l.name) === name);
                if (logEntry) {
                    newEmployees.push({
                        name: name,
                        company: typeof logEntry.company === 'string' && logEntry.company.trim() ? logEntry.company.trim() : 'Unknown',
                        role: typeof logEntry.role === 'string' && logEntry.role.trim() ? logEntry.role.trim() : 'Employee',
                        trade: typeof logEntry.trade === 'string' && logEntry.trade.trim() ? logEntry.trade.trim() : 'General'
                    });
                }
            });

            if (newEmployees.length > 0) {
                const createdDocs = await Employee.insertMany(newEmployees);
                createdDocs.forEach(doc => empMap.set(normalizeEmployeeNameKey(doc.name), doc._id));
            }
        }

        const bulkOps = [];
        const seenInPayload = new Set();

        for (const log of logs) {
            const employeeName = normalizeEmployeeName(log.name);
            const empId = empMap.get(normalizeEmployeeNameKey(employeeName));
            if (!empId) {
                // Should not happen if creation worked, but safety check
                results.failed++;
                results.errors.push(`Employee creation failed for: ${employeeName || 'Unknown employee'}`);
                continue;
            }

            const date = parseWorkDate(log.date);
            if (!date) {
                results.failed++;
                results.errors.push(`Invalid date for ${employeeName}: ${log.date}`);
                continue;
            }
            const hours = normalizeHours(log.hours);
            if (hours === null) {
                results.failed++;
                results.errors.push(`Invalid hours for ${employeeName}: ${log.hours}`);
                continue;
            }

            const dedupeKey = `${empId.toString()}|${date.toISOString()}`;
            if (seenInPayload.has(dedupeKey)) {
                results.failed++;
                results.errors.push(`Duplicate payload entry for ${employeeName} on ${log.date}`);
                continue;
            }
            seenInPayload.add(dedupeKey);

            // Using upsert to overwrite existing logs for that day
            const start = new Date(date);
            const end = new Date(start);
            end.setUTCDate(end.getUTCDate() + 1);

            bulkOps.push({
                updateOne: {
                    filter: { employee: empId, date: { $gte: start, $lt: end } },
                    update: { $set: { employee: empId, date: start, hours } },
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            const bulkRes = await WorkLog.bulkWrite(bulkOps);
            results.success = bulkRes.upsertedCount + bulkRes.modifiedCount + bulkRes.matchedCount; // matchedCount includes successful updates/no-ops
        }

        res.json(results);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
