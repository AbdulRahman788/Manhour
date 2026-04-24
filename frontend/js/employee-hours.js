document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'employee') {
        window.location.href = 'login.html';
        return;
    }

    const authHeaders = { Authorization: `Bearer ${token}` };
    const monthInput = document.getElementById('monthSelect');
    const hoursSummary = document.getElementById('hoursSummary');
    const hoursMsg = document.getElementById('hoursMsg');
    const tableBody = document.querySelector('#employeeHoursTable tbody');
    const logForm = document.getElementById('employeeLogForm');
    const dateInput = document.getElementById('logDate');
    const hoursInput = document.getElementById('hoursInput');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const lunchBreakInput = document.getElementById('lunchBreakMinutes');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById('backBtn');

    const setMessage = (text, tone = 'error') => {
        hoursMsg.textContent = text;
        hoursMsg.className = tone;
        hoursMsg.style.display = text ? 'block' : 'none';

        if (text) {
            hoursMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

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

    const loadHours = async month => {
        try {
            const query = month ? `?month=${month}` : '';
            const response = await fetch(`/api/worklogs/mine${query}`, {
                headers: authHeaders
            });
            const logs = await response.json();

            if (!response.ok) {
                throw new Error(logs.message || 'Failed to load hours');
            }

            tableBody.innerHTML = '';
            const totalHours = logs.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
            hoursSummary.textContent = `${logs.length} entr${logs.length === 1 ? 'y' : 'ies'} • ${totalHours.toFixed(1)} hours`;

            logs.forEach(entry => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(entry.date).toISOString().split('T')[0]}</td>
                    <td>${Number(entry.hours).toFixed(1)}</td>
                    <td>${entry.startTime || '-'}</td>
                    <td>${entry.endTime || '-'}</td>
                    <td>${entry.lunchBreakMinutes || 0} min</td>
                `;
                tableBody.appendChild(tr);
            });

            if (logs.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5">No hours found for this month.</td></tr>';
            }

            setMessage('', 'success');
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'Failed to load hours');
        }
    };

    startTimeInput.addEventListener('input', syncHoursFromTimeInputs);
    endTimeInput.addEventListener('input', syncHoursFromTimeInputs);
    lunchBreakInput.addEventListener('input', syncHoursFromTimeInputs);

    logForm.addEventListener('submit', async event => {
        event.preventDefault();

        const startTimeProvided = Boolean(startTimeInput.value);
        const endTimeProvided = Boolean(endTimeInput.value);
        const calculatedHours = calculateHoursFromTimeInputs();

        if (startTimeProvided !== endTimeProvided) {
            setMessage('Please enter both start and end time, or leave both blank.');
            return;
        }

        if ((startTimeProvided || endTimeProvided) && calculatedHours === null) {
            setMessage('Please make sure the end time is after the start time and the lunch break is valid.');
            return;
        }

        const manualHours = parseFloat(hoursInput.value);
        const hoursValue = startTimeProvided ? calculatedHours : manualHours;

        if (!dateInput.value) {
            setMessage('Please choose a work date.');
            return;
        }

        if (!Number.isFinite(hoursValue) || hoursValue < 0 || hoursValue > 24) {
            setMessage('Please enter valid hours between 0 and 24.');
            return;
        }

        try {
            const response = await fetch('/api/worklogs/mine', {
                method: 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date: dateInput.value,
                    hours: hoursValue,
                    startTime: startTimeInput.value || undefined,
                    endTime: endTimeInput.value || undefined,
                    lunchBreakMinutes: lunchBreakInput.value === '' ? undefined : Number(lunchBreakInput.value)
                })
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to save hours');
            }

            setMessage('Saved successfully.', 'success');
            logForm.reset();
            dateInput.value = new Date().toISOString().split('T')[0];
            await loadHours(monthInput.value);
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'Failed to save hours');
        }
    });

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    dateInput.value = today;
    monthInput.value = currentMonth;
    monthInput.addEventListener('change', () => loadHours(monthInput.value));

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = 'login.html';
    });

    backBtn?.addEventListener('click', () => {
        window.history.back();
    });

    loadHours(currentMonth);
});
