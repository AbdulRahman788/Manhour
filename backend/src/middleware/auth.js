const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ message: 'Access token missing' });

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, payload) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        // Attach user info to request
        User.findById(payload.id)
            .then(user => {
                if (!user) return res.status(404).json({ message: 'User not found' });
                req.user = { id: user._id, role: user.role, email: user.email };
                next();
            })
            .catch(err => res.status(500).json({ message: 'Server error', error: err.message }));
    });
}

// Role based access helper
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'User not authenticated' });
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
}

module.exports = { authenticateToken, authorizeRoles };
