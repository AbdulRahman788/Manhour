const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeProfileSchema = new mongoose.Schema({
    name: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
    trade: { type: String, trim: true, default: '' }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'employee'], required: true },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    employeeProfile: {
        type: EmployeeProfileSchema,
        default: () => ({})
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null
    },
    reviewNotes: { type: String, trim: true, default: '' },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null }
}, { timestamps: true });

UserSchema.pre('validate', function (next) {
    if (this.role === 'employee') {
        if (!this.approvalStatus || (this.approvalStatus === 'approved' && this.isNew)) {
            this.approvalStatus = 'pending';
        }
    } else {
        this.approvalStatus = 'approved';
    }

    next();
});

// Helper method to set password
UserSchema.methods.setPassword = async function (password) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(password, salt);
};

// Helper method to validate password
UserSchema.methods.validatePassword = async function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
