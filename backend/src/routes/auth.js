const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Only admins can create manager accounts.
router.post('/register', authenticateToken, authorizeRoles('admin'), async (req, res) => {
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
    if (role !== 'manager') {
        return res.status(400).json({ message: 'Only manager accounts can be created here' });
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: 'User already exists' });
        const user = new User({ email, role });
        await user.setPassword(password);
        await user.save();
        res.status(201).json({ message: 'User created' });
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
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        const valid = await user.validatePassword(password);
        if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '8h' });
        res.json({ token, role: user.role, email: user.email });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
