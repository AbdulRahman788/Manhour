const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const mongoose = require('mongoose');

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function buildEmployeeProfile(payload = {}) {
    return {
        name: normalizeText(payload.name),
        company: normalizeText(payload.company),
        role: normalizeText(payload.role),
        trade: normalizeText(payload.trade)
    };
}

function isEmployeeProfileValid(profile) {
    return Boolean(profile.name && profile.company && profile.role && profile.trade);
}

function normalizeNameKey(name) {
    return normalizeText(name).toLowerCase();
}

async function findMatchingEmployeeByName(name) {
    const normalizedName = normalizeNameKey(name);
    if (!normalizedName) return null;

    const employees = await Employee.find({}, 'name company role trade');
    return employees.find(employee => normalizeNameKey(employee.name) === normalizedName) || null;
}

async function findMatchingEmployee(profile) {
    return findMatchingEmployeeByName(profile.name);
}

function buildAuthPayload(user) {
    const employeeId = user.employee
        ? (user.employee._id ? user.employee._id.toString() : user.employee.toString())
        : null;
    const linkedEmployeeProfile = user.employee && typeof user.employee === 'object'
        ? buildEmployeeProfile(user.employee)
        : null;

    return {
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        employeeProfile: linkedEmployeeProfile || user.employeeProfile || null,
        employeeId
    };
}

async function createEmployeeAccessToken(user) {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '8h' }
    );
}

// Public employee signup.
router.post('/register', async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const requestedName = normalizeText(req.body.name);

    if (!requestedName || !email || !password) {
        return res.status(400).json({ message: 'Full name, email, and password are required' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'A valid email address is required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: 'User already exists' });

        const matchedEmployee = await findMatchingEmployeeByName(requestedName);
        if (!matchedEmployee) {
            return res.status(404).json({
                message: 'We could not verify that name in the employee roster. Ask an admin to add you first.'
            });
        }

        const existingEmployeeAccount = await User.findOne({ employee: matchedEmployee._id });
        if (existingEmployeeAccount) {
            return res.status(409).json({
                message: 'An account has already been created for this employee record. Try logging in or contact admin.'
            });
        }

        const employeeProfile = buildEmployeeProfile(matchedEmployee.toObject());
        const user = new User({
            email,
            role: 'employee',
            approvalStatus: 'approved',
            employeeProfile,
            employee: matchedEmployee._id,
            approvedAt: new Date(),
            rejectedAt: null,
            reviewNotes: ''
        });
        await user.setPassword(password);
        await user.save();
        res.status(201).json({
            message: 'Your employee profile was verified. You can log in now.',
            employeeProfile
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Only admins can create internal accounts.
router.post('/admin/create', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = typeof req.body.role === 'string' ? req.body.role.trim().toLowerCase() : '';

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Email, password and role are required' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'A valid email address is required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    if (!['manager', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Only manager or admin accounts can be created here' });
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: 'User already exists' });

        const user = new User({ email, role, approvalStatus: 'approved' });
        await user.setPassword(password);
        await user.save();
        res.status(201).json({ message: `${role} account created` });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('employee', 'name company role trade');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            ...buildAuthPayload(user),
            reviewNotes: user.reviewNotes || '',
            approvedAt: user.approvedAt,
            rejectedAt: user.rejectedAt,
            createdAt: user.createdAt,
            employeeRecord: user.employee || null
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.put('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const nextEmail = req.body.email !== undefined ? normalizeEmail(req.body.email) : user.email;
        if (!nextEmail || !isValidEmail(nextEmail)) {
            return res.status(400).json({ message: 'A valid email address is required' });
        }

        const duplicate = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
        if (duplicate) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        user.email = nextEmail;

        const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
        const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

        if (currentPassword || newPassword) {
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ message: 'Both current and new password are required to change your password' });
            }

            const valid = await user.validatePassword(currentPassword);
            if (!valid) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ message: 'New password must be at least 8 characters long' });
            }

            await user.setPassword(newPassword);
        }

        await user.save();
        const savedUser = await User.findById(user._id).populate('employee', 'name company role trade');
        res.json({
            message: 'Account updated',
            user: {
                ...buildAuthPayload(savedUser),
                reviewNotes: savedUser.reviewNotes || '',
                approvedAt: savedUser.approvedAt,
                rejectedAt: savedUser.rejectedAt,
                createdAt: savedUser.createdAt,
                employeeRecord: savedUser.employee || null
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/pending-employees', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const users = await User.find({ role: 'employee', approvalStatus: 'pending' })
            .sort({ createdAt: 1 })
            .select('email employeeProfile approvalStatus createdAt reviewNotes');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.post('/pending-employees/:id/approve', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.role !== 'employee') {
            return res.status(404).json({ message: 'Employee signup not found' });
        }
        if (user.approvalStatus !== 'pending') {
            return res.status(409).json({ message: 'This signup has already been reviewed' });
        }
        if (!isEmployeeProfileValid(user.employeeProfile || {})) {
            return res.status(400).json({ message: 'Employee profile is incomplete' });
        }

        let employee = await findMatchingEmployee(user.employeeProfile);
        if (!employee) {
            employee = await Employee.create(user.employeeProfile);
        }

        user.employee = employee._id;
        user.approvalStatus = 'approved';
        user.reviewNotes = '';
        user.approvedAt = new Date();
        user.rejectedAt = null;
        await user.save();

        res.json({ message: 'Employee approved', employeeId: employee._id });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.post('/pending-employees/:id/reject', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.role !== 'employee') {
            return res.status(404).json({ message: 'Employee signup not found' });
        }
        if (user.approvalStatus !== 'pending') {
            return res.status(409).json({ message: 'This signup has already been reviewed' });
        }

        user.approvalStatus = 'rejected';
        user.reviewNotes = normalizeText(req.body.reviewNotes) || 'Please contact admin for access.';
        user.rejectedAt = new Date();
        await user.save();

        res.json({ message: 'Employee signup rejected' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Email and password required' });
    try {
        const user = await User.findOne({ email }).populate('employee', 'name company role trade');
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        const valid = await user.validatePassword(password);
        if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

        if (user.role === 'employee' && user.approvalStatus !== 'approved') {
            const message = user.approvalStatus === 'rejected'
                ? (user.reviewNotes || 'Your employee signup was rejected. Contact an administrator.')
                : 'Your employee account is still pending admin approval.';
            return res.status(403).json({ message, approvalStatus: user.approvalStatus });
        }

        const token = await createEmployeeAccessToken(user);
        res.json({ token, ...buildAuthPayload(user) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
