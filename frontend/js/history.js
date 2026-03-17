// history.js – loads all work‑log entries and handles "Export All CSV"

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById('backBtn');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }
    const msg = document.getElementById('msg');
    const historyTableBody = document.querySelector('#historyTable tbody');
    const exportAllBtn = document.getElementById('exportAllBtn');

    // -----------------------------------------------------------------
    // Load all logs and render the table
    // -----------------------------------------------------------------
    const loadHistory = async () => {
        try {
            const res = await fetch('/api/worklogs/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const logs = await res.json();

            if (!res.ok) {
                msg.textContent = logs.message || 'Failed to load history';
                return;
            }

            historyTableBody.innerHTML = '';
            logs.forEach(entry => {
                const e = entry.employee;
                const dateStr = new Date(entry.date).toISOString().split('T')[0];
                const tr = document.createElement('tr');
                const tdEmp = document.createElement('td'); tdEmp.textContent = e.name; tr.appendChild(tdEmp);
                const tdComp = document.createElement('td'); tdComp.textContent = e.company; tr.appendChild(tdComp);
                const tdRole = document.createElement('td'); tdRole.textContent = e.role; tr.appendChild(tdRole);
                const tdTrade = document.createElement('td'); tdTrade.textContent = e.trade; tr.appendChild(tdTrade);
                const tdDate = document.createElement('td'); tdDate.textContent = dateStr; tr.appendChild(tdDate);
                const tdHours = document.createElement('td'); tdHours.textContent = entry.hours; tr.appendChild(tdHours);
                historyTableBody.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
            msg.textContent = 'Network error while loading history';
        }
    };

    // -----------------------------------------------------------------
    // Export all logs as CSV
    // -----------------------------------------------------------------
    exportAllBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/worklogs/export/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json();
                msg.textContent = err.message || 'Failed to download CSV';
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
        } catch (e) {
            console.error(e);
            msg.textContent = 'Network error during CSV download';
        }
    });

    // -----------------------------------------------------------------
    // Logout
    // -----------------------------------------------------------------
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // Initial load
    loadHistory();
});
