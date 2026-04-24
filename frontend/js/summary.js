// summary.js – fetches monthly work logs, displays summaries, and supports inline editing

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || !['admin', 'manager'].includes(role)) {
        window.location.href = 'login.html';
        return;
    }

    const monthInput = document.getElementById('monthSelect');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const detailsBtn = document.getElementById('detailsBtn');
    const summaryTable = document.getElementById('summaryTable');
    const detailsTable = document.getElementById('detailsTable');
    const summaryBody = document.querySelector('#summaryTable tbody');
    const detailsBody = document.querySelector('#detailsTable tbody');
    const msg = document.getElementById('msg');
    const logoutBtn = document.getElementById('logoutBtn');

    const modal = document.getElementById('employeeModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalName = document.getElementById('modalEmpName');
    const modalRole = document.getElementById('modalEmpRole');
    const modalTrade = document.getElementById('modalEmpTrade');
    const modalTotal = document.getElementById('modalEmpTotal');
    const modalTableBody = document.querySelector('#modalTable tbody');
    const exportIndividualBtn = document.getElementById('exportIndividualBtn');
    const searchInput = document.getElementById('searchInput');

    let currentMonthLogs = [];
    let selectedEmployeeId = null;
    let showDetails = false;

    const setMessage = (text, tone = 'error') => {
        msg.textContent = text;
        msg.className = tone;
    };

    const clearMessage = () => {
        msg.textContent = '';
        msg.className = '';
    };

    const formatDate = value => new Date(value).toISOString().split('T')[0];

    const getEmployeeTotals = logs => {
        const totals = {};

        logs.forEach(entry => {
            const employee = entry.employee;
            if (!employee) return;

            if (!totals[employee._id]) {
                totals[employee._id] = {
                    id: employee._id,
                    name: employee.name,
                    company: employee.company,
                    role: employee.role,
                    trade: employee.trade,
                    hours: 0
                };
            }

            totals[employee._id].hours += entry.hours;
        });

        return totals;
    };

    const updateWorkLogHours = async (workLogId, hours) => {
        const response = await fetch(`/api/worklogs/${workLogId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ hours: Number(hours) })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Failed to update work log');
        }

        return result;
    };

    const handleSaveHours = async (workLogId, hoursInput) => {
        try {
            const nextHours = Number(hoursInput.value);
            if (!Number.isFinite(nextHours) || nextHours < 0 || nextHours > 24) {
                throw new Error('Enter valid hours between 0 and 24.');
            }

            await updateWorkLogHours(workLogId, nextHours);
            setMessage('Monthly hours updated successfully.', 'success');
            await fetchSummary(monthInput.value);
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'Failed to update hours');
        }
    };

    const buildHoursEditor = entry => {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-actions';

        const hoursInput = document.createElement('input');
        hoursInput.type = 'number';
        hoursInput.min = '0';
        hoursInput.max = '24';
        hoursInput.step = '0.1';
        hoursInput.value = Number(entry.hours).toFixed(1);
        hoursInput.className = 'table-inline-input';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'table-action-btn';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            try {
                await handleSaveHours(entry._id, hoursInput);
            } finally {
                saveBtn.disabled = false;
            }
        });

        wrapper.appendChild(hoursInput);
        wrapper.appendChild(saveBtn);
        return wrapper;
    };

    const renderSummaryTable = totals => {
        summaryBody.innerHTML = '';

        Object.values(totals).forEach(item => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.title = 'Click to view details';
            tr.addEventListener('click', () => openEmployeeModal(item.id, totals[item.id]));

            const nameCell = document.createElement('td');
            nameCell.textContent = item.name;
            tr.appendChild(nameCell);

            const companyCell = document.createElement('td');
            companyCell.textContent = item.company;
            tr.appendChild(companyCell);

            const roleCell = document.createElement('td');
            roleCell.textContent = item.role;
            tr.appendChild(roleCell);

            const tradeCell = document.createElement('td');
            tradeCell.textContent = item.trade;
            tr.appendChild(tradeCell);

            const hoursCell = document.createElement('td');
            hoursCell.textContent = item.hours.toFixed(1);
            tr.appendChild(hoursCell);

            summaryBody.appendChild(tr);
        });
    };

    const renderDetailsTable = logs => {
        detailsBody.innerHTML = '';

        logs
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(entry => {
                const tr = document.createElement('tr');
                const employee = entry.employee;

                const nameCell = document.createElement('td');
                nameCell.textContent = employee.name;
                tr.appendChild(nameCell);

                const roleCell = document.createElement('td');
                roleCell.textContent = employee.role;
                tr.appendChild(roleCell);

                const tradeCell = document.createElement('td');
                tradeCell.textContent = employee.trade;
                tr.appendChild(tradeCell);

                const dateCell = document.createElement('td');
                dateCell.textContent = formatDate(entry.date);
                tr.appendChild(dateCell);

                const hoursCell = document.createElement('td');
                hoursCell.textContent = Number(entry.hours).toFixed(1);
                tr.appendChild(hoursCell);

                const actionsCell = document.createElement('td');
                actionsCell.appendChild(buildHoursEditor(entry));
                tr.appendChild(actionsCell);

                detailsBody.appendChild(tr);
            });
    };

    function openEmployeeModal(employeeId, employeeData) {
        selectedEmployeeId = employeeId;
        modalName.textContent = employeeData.name;
        modalRole.textContent = employeeData.role;
        modalTrade.textContent = employeeData.trade;
        modalTotal.textContent = employeeData.hours.toFixed(1);
        modalTableBody.innerHTML = '';

        currentMonthLogs
            .filter(log => log.employee && log.employee._id === employeeId)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(log => {
                const tr = document.createElement('tr');

                const dateCell = document.createElement('td');
                dateCell.textContent = formatDate(log.date);
                tr.appendChild(dateCell);

                const hoursCell = document.createElement('td');
                hoursCell.textContent = Number(log.hours).toFixed(1);
                tr.appendChild(hoursCell);

                const visualCell = document.createElement('td');
                const bar = document.createElement('div');
                bar.style.backgroundColor = 'var(--primary-color)';
                bar.style.height = '10px';
                bar.style.width = `${Math.min(log.hours * 10, 100)}px`;
                bar.style.borderRadius = '5px';
                visualCell.appendChild(bar);
                tr.appendChild(visualCell);

                const actionsCell = document.createElement('td');
                actionsCell.appendChild(buildHoursEditor(log));
                tr.appendChild(actionsCell);

                modalTableBody.appendChild(tr);
            });

        modal.style.display = 'block';
    }

    const fetchSummary = async month => {
        if (!month) return;

        try {
            const response = await fetch(`/api/worklogs?month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            currentMonthLogs = Array.isArray(data) ? data : [];

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }

                setMessage(data.message || 'Failed to load summary');
                return;
            }

            const totals = getEmployeeTotals(currentMonthLogs);
            if (Object.keys(totals).length === 0) {
                setMessage('No work logs found for this month.', 'success');
            } else {
                clearMessage();
            }

            renderSummaryTable(totals);
            renderDetailsTable(currentMonthLogs);

            if (selectedEmployeeId && modal.style.display === 'block' && totals[selectedEmployeeId]) {
                openEmployeeModal(selectedEmployeeId, totals[selectedEmployeeId]);
            }
        } catch (error) {
            console.error(error);
            setMessage('Network error');
        }
    };

    if (searchInput) {
        searchInput.addEventListener('input', event => {
            const term = event.target.value.toLowerCase();
            const rows = document.querySelectorAll('#summaryTable tbody tr');
            rows.forEach(row => {
                const name = row.children[0].textContent.toLowerCase();
                row.style.display = name.includes(term) ? '' : 'none';
            });
        });
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    window.onclick = event => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    exportIndividualBtn.addEventListener('click', () => {
        if (!selectedEmployeeId || currentMonthLogs.length === 0) return;

        const employeeLogs = currentMonthLogs.filter(log => log.employee && log.employee._id === selectedEmployeeId);
        if (employeeLogs.length === 0) return;

        const employeeName = employeeLogs[0].employee.name.replace(/ /g, '_');
        let csv = 'Date,Hours\n';
        employeeLogs.forEach(log => {
            csv += `${formatDate(log.date)},${log.hours}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${employeeName}_worklogs.csv`;
        anchor.click();
        window.URL.revokeObjectURL(url);
    });

    if (detailsBtn && summaryTable && detailsTable) {
        detailsBtn.addEventListener('click', () => {
            showDetails = !showDetails;
            if (showDetails) {
                summaryTable.style.display = 'none';
                detailsTable.style.display = 'table';
                detailsBtn.textContent = 'Show Summary';
            } else {
                summaryTable.style.display = 'table';
                detailsTable.style.display = 'none';
                detailsBtn.textContent = 'Show Details';
            }
        });
    }

    monthInput.addEventListener('change', () => {
        fetchSummary(monthInput.value);
    });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthInput.value = currentMonth;
    fetchSummary(currentMonth);

    downloadBtn.addEventListener('click', async () => {
        const month = monthInput.value;
        if (!month) {
            setMessage('Select a month first');
            return;
        }

        try {
            const response = await fetch(`/api/worklogs/export?month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }

                const error = await response.json();
                setMessage(error.message || 'Failed to download CSV');
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `worklogs_${month}.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setMessage('Network error during CSV download');
        }
    });

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
});
