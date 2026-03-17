// manager.js – handles logging work hours and logout
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const employeeSelect = document.getElementById('employee');
    const logForm = document.getElementById('logForm');
    const msg = document.getElementById('msg');
    const logoutBtn = document.getElementById('logoutBtn');

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
            employeeSelect.innerHTML = '';
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp._id;
                option.textContent = `${emp.name} – ${emp.role} (${emp.trade})`;
                employeeSelect.appendChild(option);
            });
        } catch (e) {
            console.error(e);
        }
    };

    // Submit work log
    logForm.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            employeeId: employeeSelect.value,
            date: logForm.date.value,
            hours: parseFloat(logForm.hours.value)
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
