// summary.js – fetches monthly work logs and displays them

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const monthInput = document.getElementById('monthSelect');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const detailsBtn = document.getElementById('detailsBtn');
    const summaryTable = document.getElementById('summaryTable');
    const detailsTable = document.getElementById('detailsTable');
    const tableBody = document.querySelector('#summaryTable tbody');
    const msg = document.getElementById('msg');
    const logoutBtn = document.getElementById('logoutBtn');

    // Modal Elements
    const modal = document.getElementById('employeeModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalName = document.getElementById('modalEmpName');
    const modalRole = document.getElementById('modalEmpRole');
    const modalTrade = document.getElementById('modalEmpTrade');
    const modalTotal = document.getElementById('modalEmpTotal');
    const modalTableBody = document.querySelector('#modalTable tbody');
    const exportIndividualBtn = document.getElementById('exportIndividualBtn');

    // Search Functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#summaryTable tbody tr');
            rows.forEach(row => {
                const name = row.children[0].textContent.toLowerCase();
                if (name.includes(term)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    let currentMonthLogs = []; // Store fetched logs for filtering
    let selectedEmployeeId = null;
    let showDetails = false;

    // Close Modal Logic
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    const fetchSummary = async (month) => {
        if (!month) return;
        try {
            const res = await fetch(`/api/worklogs?month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            currentMonthLogs = data; // Store globally for modal access

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                msg.textContent = data.message || 'Failed to load summary';
                return;
            }

            // Aggregate hours per employee
            const totals = {};
            let validEntryCount = 0;

            data.forEach(entry => {
                const emp = entry.employee;
                if (!emp) return; // Skip logs with deleted/missing employees

                validEntryCount++;
                const id = emp._id;
                if (!totals[id]) {
                    totals[id] = {
                        id: emp._id, // Store ID for click handler
                        name: emp.name,
                        company: emp.company,
                        role: emp.role,
                        trade: emp.trade,
                        hours: 0
                    };
                }
                totals[id].hours += entry.hours;
            });

            if (validEntryCount === 0) {
                msg.textContent = 'No work logs found for this month.';
                msg.style.color = '#888';
            } else {
                msg.textContent = ''; // Clear error
            }

            // Render Summary Table
            tableBody.innerHTML = '';
            for (const item of Object.values(totals)) {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.title = 'Click to view details';

                // Click handler to open modal
                tr.addEventListener('click', () => openEmployeeModal(item.id, totals[item.id]));

                const tdName = document.createElement('td');
                tdName.textContent = item.name;
                tr.appendChild(tdName);

                const tdCompany = document.createElement('td');
                tdCompany.textContent = item.company;
                tr.appendChild(tdCompany);

                const tdRole = document.createElement('td');
                tdRole.textContent = item.role;
                tr.appendChild(tdRole);

                const tdTrade = document.createElement('td');
                tdTrade.textContent = item.trade;
                tr.appendChild(tdTrade);

                const tdHours = document.createElement('td');
                tdHours.textContent = item.hours.toFixed(1);
                tr.appendChild(tdHours);

                tableBody.appendChild(tr);
            }

            // Render Details Table (Global View)
            const detailsBody = document.querySelector('#detailsTable tbody');
            detailsBody.innerHTML = '';
            data.sort((a, b) => new Date(b.date) - new Date(a.date));

            data.forEach(entry => {
                const tr = document.createElement('tr');
                const emp = entry.employee;

                const tdName = document.createElement('td');
                tdName.textContent = emp.name;
                tr.appendChild(tdName);

                const tdRole = document.createElement('td');
                tdRole.textContent = emp.role;
                tr.appendChild(tdRole);

                const tdTrade = document.createElement('td');
                tdTrade.textContent = emp.trade;
                tr.appendChild(tdTrade);

                const tdDate = document.createElement('td');
                tdDate.textContent = new Date(entry.date).toISOString().split('T')[0];
                tr.appendChild(tdDate);

                const tdHours = document.createElement('td');
                tdHours.textContent = entry.hours.toFixed(1);
                tr.appendChild(tdHours);

                detailsBody.appendChild(tr);
            });

        } catch (e) {
            console.error(e);
            msg.textContent = 'Network error';
        }
    };

    // Open Modal Function
    function openEmployeeModal(empId, empData) {
        selectedEmployeeId = empId;
        modalName.textContent = empData.name;
        modalRole.textContent = empData.role;
        modalTrade.textContent = empData.trade;
        modalTotal.textContent = empData.hours.toFixed(1);
        modalTableBody.innerHTML = '';

        // Filter logs for this employee
        const empLogs = currentMonthLogs.filter(log => log.employee._id === empId);
        empLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        empLogs.forEach(log => {
            const tr = document.createElement('tr');

            const tdDate = document.createElement('td');
            tdDate.textContent = new Date(log.date).toISOString().split('T')[0];
            tr.appendChild(tdDate);

            // Hours
            const tdHours = document.createElement('td');
            tdHours.textContent = log.hours.toFixed(1);
            tr.appendChild(tdHours);

            // Visual (simple bar)
            const tdVisual = document.createElement('td');
            const bar = document.createElement('div');
            bar.style.backgroundColor = 'var(--primary-color)';
            bar.style.height = '10px';
            bar.style.width = Math.min(log.hours * 10, 100) + 'px'; // Max 10 hours for full width roughly
            bar.style.borderRadius = '5px';
            tdVisual.appendChild(bar);
            tr.appendChild(tdVisual);

            modalTableBody.appendChild(tr);
        });

        modal.style.display = 'block';
    }

    // Export Individual CSV
    exportIndividualBtn.addEventListener('click', () => {
        if (!selectedEmployeeId || currentMonthLogs.length === 0) return;

        const empLogs = currentMonthLogs.filter(log => log.employee._id === selectedEmployeeId);
        if (empLogs.length === 0) return;

        const empName = empLogs[0].employee.name.replace(/ /g, '_');
        let csv = 'Date,Hours\n';
        empLogs.forEach(log => {
            csv += `${new Date(log.date).toISOString().split('T')[0]},${log.hours}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${empName}_worklogs.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    });

    if (detailsBtn && summaryTable && detailsTable) {
        detailsBtn.addEventListener('click', () => {
            showDetails = !showDetails;
            if (showDetails) {
                summaryTable.style.display = 'none';
                detailsTable.style.display = 'table';
                detailsBtn.textContent = 'Show Summary';
                detailsBtn.style.background = 'var(--primary-color)';
                detailsBtn.style.color = '#000';
            } else {
                summaryTable.style.display = 'table';
                detailsTable.style.display = 'none';
                detailsBtn.textContent = 'Show Details';
                detailsBtn.style.background = 'transparent';
                detailsBtn.style.color = 'var(--primary-color)';
            }
        });
    }

    monthInput.addEventListener('change', () => {
        const month = monthInput.value; // format YYYY-MM
        fetchSummary(month);
    });

    // Auto-load current month (or Jan 2026 if user was just working there? No, sticking to current date is standard)
    // Actually, let's default to the current month.
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthInput.value = currentMonthStr;
    fetchSummary(currentMonthStr);

    // CSV download handler
    downloadBtn.addEventListener('click', async () => {
        const month = monthInput.value;
        if (!month) {
            msg.textContent = 'Select a month first';
            return;
        }
        try {
            const res = await fetch(`/api/worklogs/export?month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                // Check if unauthorized
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                const err = await res.json();
                msg.textContent = err.message || 'Failed to download CSV';
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `worklogs_${month}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            msg.textContent = 'Network error during CSV download';
        }
    });

    // Back Button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    // Logout handler
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
});
