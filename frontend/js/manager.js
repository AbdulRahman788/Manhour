// manager.js – handles logging work hours and logout
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || !['admin', 'manager'].includes(role)) {
        window.location.href = 'login.html';
        return;
    }

    const employeeSelect = document.getElementById('employee');
    const logForm = document.getElementById('logForm');
    const msg = document.getElementById('msg');
    const logoutBtn = document.getElementById('logoutBtn');
    const hoursInput = document.getElementById('hours');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const lunchBreakInput = document.getElementById('lunchBreakMinutes');
    const selectedEmployeePreview = document.getElementById('selectedEmployeePreview');
    let employeeDirectory = [];

    const parseTimeToMinutes = value => {
        if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
            return null;
        }

        const [hours, minutes] = value.split(':').map(Number);
        if (
            !Number.isInteger(hours) ||
            !Number.isInteger(minutes) ||
            hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59
        ) {
            return null;
        }

        return (hours * 60) + minutes;
    };

    const calculateHoursFromTimeInputs = () => {
        const startMinutes = parseTimeToMinutes(startTimeInput.value);
        const endMinutes = parseTimeToMinutes(endTimeInput.value);

        if (startMinutes === null || endMinutes === null) {
            return null;
        }

        const lunchBreakMinutes = Number(lunchBreakInput.value || 0);
        if (!Number.isFinite(lunchBreakMinutes) || lunchBreakMinutes < 0) {
            return null;
        }

        const workedMinutes = endMinutes - startMinutes - lunchBreakMinutes;
        if (workedMinutes < 0) {
            return null;
        }

        return Number((workedMinutes / 60).toFixed(2));
    };

    const syncHoursFromTimeInputs = () => {
        const calculatedHours = calculateHoursFromTimeInputs();
        if (calculatedHours === null) {
            return;
        }

        hoursInput.value = calculatedHours;
    };

    const renderEmployeePreview = employeeId => {
        if (!selectedEmployeePreview) {
            return;
        }

        const employee = employeeDirectory.find(entry => entry._id === employeeId);
        if (!employee) {
            selectedEmployeePreview.innerHTML = '';
            selectedEmployeePreview.classList.remove('active');
            return;
        }

        selectedEmployeePreview.innerHTML = `
            <span class="employee-preview-label">Selected</span>
            <strong>${employee.name}</strong>
            <span>${employee.role} • ${employee.trade}</span>
        `;
        selectedEmployeePreview.classList.add('active');
    };

    // Load employees into dropdown
    const loadEmployees = async () => {
        try {
            const res = await fetch('/api/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error('Failed to fetch employees');
            }
            const employees = await res.json();
            employeeDirectory = employees;
            employeeSelect.innerHTML = '';

            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Select an employee';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            employeeSelect.appendChild(placeholderOption);

            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp._id;
                option.textContent = `${emp.name} - ${emp.role} (${emp.trade})`;
                employeeSelect.appendChild(option);
            });

            renderEmployeePreview(employeeSelect.value);
        } catch (e) {
            console.error(e);
        }
    };

    startTimeInput.addEventListener('input', syncHoursFromTimeInputs);
    endTimeInput.addEventListener('input', syncHoursFromTimeInputs);
    lunchBreakInput.addEventListener('input', syncHoursFromTimeInputs);
    employeeSelect.addEventListener('change', () => renderEmployeePreview(employeeSelect.value));

    // Submit work log
    logForm.addEventListener('submit', async e => {
        e.preventDefault();
        const calculatedHours = calculateHoursFromTimeInputs();
        const startTimeProvided = Boolean(startTimeInput.value);
        const endTimeProvided = Boolean(endTimeInput.value);

        if (startTimeProvided !== endTimeProvided) {
            msg.textContent = 'Please enter both start time and end time, or leave both blank.';
            msg.className = 'error';
            return;
        }

        if ((startTimeProvided || endTimeProvided) && calculatedHours === null) {
            msg.textContent = 'Please make sure the end time is after the start time and the lunch break is valid.';
            msg.className = 'error';
            return;
        }

        const hoursValue = startTimeProvided ? calculatedHours : parseFloat(hoursInput.value);
        if (!Number.isFinite(hoursValue) || hoursValue < 0) {
            msg.textContent = 'Please enter valid hours.';
            msg.className = 'error';
            return;
        }

        const data = {
            employeeId: employeeSelect.value,
            date: logForm.date.value,
            hours: hoursValue,
            startTime: startTimeInput.value || undefined,
            endTime: endTimeInput.value || undefined,
            lunchBreakMinutes: lunchBreakInput.value === '' ? undefined : Number(lunchBreakInput.value)
        };
        try {
            const res = await fetch('/api/worklogs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) {
                msg.textContent = result.message || 'Error logging hours';
                msg.className = 'error';
                return;
            }
            msg.textContent = 'Hours logged successfully';
            msg.className = 'success';
            logForm.reset();
            hoursInput.value = '';
        } catch (e) {
            console.error(e);
            msg.textContent = 'Network error';
            msg.className = 'error';
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        window.history.back();
    });

    loadEmployees();
});
