const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeNameKey(value) {
    return normalizeText(value).toLowerCase();
}

function buildEmployeePayload(payload = {}) {
    return {
        name: normalizeText(payload.name),
        company: normalizeText(payload.company),
        role: normalizeText(payload.role),
        trade: normalizeText(payload.trade)
    };
}

function isEmployeePayloadValid(employee) {
    return employee.name && employee.company && employee.role && employee.trade;
}

async function findExistingEmployee(employee) {
    const employees = await Employee.find({}, 'name');
    return employees.find(existingEmployee => normalizeNameKey(existingEmployee.name) === normalizeNameKey(employee.name)) || null;
}

// Get all employees needed by admin and manager workflows
router.get('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create new employee (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const employeeData = buildEmployeePayload(req.body);
    if (!isEmployeePayloadValid(employeeData)) {
        return res.status(400).json({ message: 'All employee fields are required' });
    }
    try {
        const existing = await findExistingEmployee(employeeData);
        if (existing) {
            return res.status(409).json({ message: 'An employee with this name already exists' });
        }

        const employee = new Employee(employeeData);
        await employee.save();
        res.status(201).json(employee);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create new employees in bulk (admin only)
router.post('/bulk', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const employees = req.body;
    if (!Array.isArray(employees) || employees.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array' });
    }

    try {
        const seen = new Set();
        const normalizedEmployees = [];

        for (const rawEmployee of employees) {
            const employee = buildEmployeePayload(rawEmployee);
            if (!isEmployeePayloadValid(employee)) {
                return res.status(400).json({ message: 'Each employee must include name, company, role and trade' });
            }

            const dedupeKey = normalizeNameKey(employee.name);
            if (seen.has(dedupeKey)) {
                continue;
            }
            seen.add(dedupeKey);
            normalizedEmployees.push(employee);
        }

        const existingEmployees = await Employee.find({}, 'name');

        const existingKeys = new Set(existingEmployees.map(employee =>
            normalizeNameKey(employee.name)
        ));

        const employeesToInsert = normalizedEmployees.filter(employee => {
            const dedupeKey = normalizeNameKey(employee.name);
            return !existingKeys.has(dedupeKey);
        });

        if (employeesToInsert.length === 0) {
            return res.status(200).json([]);
        }

        const result = await Employee.insertMany(employeesToInsert, { ordered: true });
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
