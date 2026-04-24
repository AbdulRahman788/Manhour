// history.js – loads all work-log entries, supports inline editing, and handles export

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || !['admin', 'manager'].includes(role)) {
        window.location.href = 'login.html';
        return;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById('backBtn');
    const msg = document.getElementById('msg');
    const historyTableBody = document.querySelector('#historyTable tbody');
    const exportAllBtn = document.getElementById('exportAllBtn');

    const setMessage = (text, tone = 'error') => {
        msg.textContent = text;
        msg.className = tone;
    };

    const clearMessage = () => {
        msg.textContent = '';
        msg.className = '';
    };

    const formatDate = value => new Date(value).toISOString().split('T')[0];

    const loadHistory = async () => {
        try {
            const res = await fetch('/api/worklogs/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const logs = await res.json();

            if (!res.ok) {
                setMessage(logs.message || 'Failed to load history');
                return;
            }

            clearMessage();
            historyTableBody.innerHTML = '';

            logs.forEach(entry => {
                const employee = entry.employee;
                const dateStr = formatDate(entry.date);
                const tr = document.createElement('tr');
                tr.dataset.id = entry._id;

                const appendCell = text => {
                    const td = document.createElement('td');
                    td.textContent = text;
                    tr.appendChild(td);
                    return td;
                };

                appendCell(employee.name);
                appendCell(employee.company);
                appendCell(employee.role);
                appendCell(employee.trade);
                appendCell(dateStr);

                const hoursCell = document.createElement('td');
                hoursCell.textContent = entry.hours;
                tr.appendChild(hoursCell);

                const timeEntryCell = document.createElement('td');
                if (entry.startTime && entry.endTime) {
                    const lunchBreak = entry.lunchBreakMinutes ? `, break ${entry.lunchBreakMinutes}m` : '';
                    timeEntryCell.textContent = `${entry.startTime} - ${entry.endTime}${lunchBreak}`;
                } else {
                    timeEntryCell.textContent = 'Manual hours';
                }
                tr.appendChild(timeEntryCell);

                const actionsCell = document.createElement('td');
                actionsCell.className = 'table-actions';

                const hoursInput = document.createElement('input');
                hoursInput.type = 'number';
                hoursInput.min = '0';
                hoursInput.max = '24';
                hoursInput.step = '0.1';
                hoursInput.value = entry.hours;
                hoursInput.className = 'table-inline-input';

                const saveBtn = document.createElement('button');
                saveBtn.type = 'button';
                saveBtn.className = 'table-action-btn';
                saveBtn.textContent = 'Save';
                saveBtn.addEventListener('click', async () => {
                    saveBtn.disabled = true;
                    try {
                        const resUpdate = await fetch(`/api/worklogs/${entry._id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ hours: Number(hoursInput.value) })
                        });

                        const result = await resUpdate.json();
                        if (!resUpdate.ok) {
                            throw new Error(result.message || 'Failed to update work log');
                        }

                        setMessage('Work log updated successfully.', 'success');
                        await loadHistory();
                    } catch (error) {
                        console.error(error);
                        setMessage(error.message || 'Failed to update work log');
                    } finally {
                        saveBtn.disabled = false;
                    }
                });

                actionsCell.appendChild(hoursInput);
                actionsCell.appendChild(saveBtn);
                tr.appendChild(actionsCell);
                historyTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error(error);
            setMessage('Network error while loading history');
        }
    };

    exportAllBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/worklogs/export/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json();
                setMessage(err.message || 'Failed to download CSV');
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'worklogs_all.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setMessage('Network error during CSV download');
        }
    });

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    loadHistory();
});
