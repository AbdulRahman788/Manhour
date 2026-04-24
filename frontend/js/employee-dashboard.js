document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'employee') {
        window.location.href = 'login.html';
        return;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById('backBtn');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const monthHours = document.getElementById('monthHours');
    const monthEntries = document.getElementById('monthEntries');
    const approvalBadge = document.getElementById('approvalBadge');
    const statusCopy = document.getElementById('statusCopy');
    const dashboardMsg = document.getElementById('dashboardMsg');
    const recentHoursTableBody = document.querySelector('#recentHoursTable tbody');

    const setMessage = (text) => {
        dashboardMsg.textContent = text;
        dashboardMsg.style.display = text ? 'block' : 'none';
    };

    const authHeaders = { Authorization: `Bearer ${token}` };

    try {
        const [meRes, logsRes] = await Promise.all([
            fetch('/api/auth/me', { headers: authHeaders }),
            fetch('/api/worklogs/mine', { headers: authHeaders })
        ]);

        const meData = await meRes.json();
        const logs = await logsRes.json();

        if (!meRes.ok || !logsRes.ok) {
            throw new Error(meData.message || logs.message || 'Failed to load employee dashboard');
        }

        const employeeName = meData.employeeProfile?.name || meData.email;
        welcomeTitle.textContent = `${employeeName}, here’s your hours snapshot.`;
        approvalBadge.textContent = meData.approvalStatus === 'approved' ? 'Active' : meData.approvalStatus;
        statusCopy.textContent = meData.approvalStatus === 'approved'
            ? 'Your employee portal is ready to use.'
            : 'Your account is waiting on admin review.';

        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentMonthLogs = logs.filter(entry => new Date(entry.date).toISOString().startsWith(currentMonthPrefix));
        const totalHours = currentMonthLogs.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);

        monthHours.textContent = totalHours.toFixed(1);
        monthEntries.textContent = String(currentMonthLogs.length);

        recentHoursTableBody.innerHTML = '';
        logs.slice(0, 6).forEach(entry => {
            const row = document.createElement('tr');
            const date = new Date(entry.date).toISOString().split('T')[0];
            const timeEntry = entry.startTime && entry.endTime
                ? `${entry.startTime} - ${entry.endTime}`
                : 'Manual hours';
            row.innerHTML = `<td>${date}</td><td>${Number(entry.hours).toFixed(1)}</td><td>${timeEntry}</td>`;
            recentHoursTableBody.appendChild(row);
        });

        if (logs.length === 0) {
            recentHoursTableBody.innerHTML = '<tr><td colspan="3">No hours have been logged for you yet.</td></tr>';
        }
    } catch (error) {
        console.error(error);
        setMessage(error.message || 'Failed to load employee dashboard');
    }

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = 'login.html';
    });

    backBtn?.addEventListener('click', () => {
        window.history.back();
    });
});
