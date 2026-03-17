const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/manhours';

async function createAdmin() {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const existing = await User.findOne({ email: 'admin@example.com' });
    if (existing) {
        console.log('Admin user already exists');
        process.exit(0);
    }
    const admin = new User({ email: 'admin@example.com', role: 'admin' });
    await admin.setPassword('adminpass');
    await admin.save();
    console.log('Admin user created');
    process.exit(0);
}

createAdmin().catch(err => {
    console.error('Error creating admin:', err);
    process.exit(1);
});
