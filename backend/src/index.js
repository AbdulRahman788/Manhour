const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const worklogRoutes = require('./routes/worklog');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/manhours';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend', 'login.html'));
});

app.use(express.static(path.join(__dirname, '../../frontend')));

app.use('/api/employees', employeeRoutes);
app.use('/api/worklogs', worklogRoutes);
app.use('/api/ai', require('./routes/ai_import'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
