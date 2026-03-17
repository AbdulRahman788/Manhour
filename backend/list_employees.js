const mongoose = require('mongoose');
const Employee = require('./src/models/Employee');
const MONGO_URI = 'mongodb://localhost:27017/manhours';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const employees = await Employee.find({}, 'name');
        console.log("--- EXISTING EMPLOYEES ---");
        employees.forEach(e => console.log(e.name));
        process.exit();
    })
    .catch(err => console.error(err));
