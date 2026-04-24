const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const mongoose = require('mongoose');

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

function isValidEmployeeId(id) {
    return mongoose.Types.ObjectId.isValid(id);
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

// Update employee (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const employeeId = req.params.id;
    if (!isValidEmployeeId(employeeId)) {
        return res.status(400).json({ message: 'Invalid employee id' });
    }

    const employeeData = buildEmployeePayload(req.body);
    if (!isEmployeePayloadValid(employeeData)) {
        return res.status(400).json({ message: 'All employee fields are required' });
    }

    try {
        const existingByName = await findExistingEmployee(employeeData);
        if (existingByName && existingByName._id.toString() !== employeeId) {
            return res.status(409).json({ message: 'Another employee with this name already exists' });
        }

        const updatedEmployee = await Employee.findByIdAndUpdate(
            employeeId,
            employeeData,
            { new: true, runValidators: true }
        );

        if (!updatedEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json(updatedEmployee);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete employee (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const employeeId = req.params.id;
    if (!isValidEmployeeId(employeeId)) {
        return res.status(400).json({ message: 'Invalid employee id' });
    }

    try {
        const deletedEmployee = await Employee.findByIdAndDelete(employeeId);
        if (!deletedEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
