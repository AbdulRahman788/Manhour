// admin.js – handles employee creation, approvals, imports, and internal user setup
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const addEmployeeSection = document.getElementById('addEmployeeSection');
    const createUserSection = document.getElementById('createUserSection');
    const individualBulkHoursSection = document.getElementById('individualBulkHoursSection');
    const openAddEmployeeButtons = document.querySelectorAll('.js-open-add-employee');
    const openCreateUserButtons = document.querySelectorAll('.js-open-create-user');
    const openIndividualBulkHoursButtons = document.querySelectorAll('.js-open-individual-bulk-hours');
    const cancelAddEmployeeBtn = document.getElementById('cancelAddEmployee');
    const cancelCreateUserBtn = document.getElementById('cancelCreateUser');
    const cancelIndividualBulkHoursBtn = document.getElementById('cancelIndividualBulkHours');
    const addForm = document.getElementById('addEmployeeForm');
    const createUserForm = document.getElementById('createUserForm');
    const individualBulkHoursForm = document.getElementById('individualBulkHoursForm');
    const employeeList = document.getElementById('employeeList');
    const pendingEmployeeList = document.getElementById('pendingEmployeeList');
    const employeeCount = document.getElementById('employeeCount');
    const employeeCountSecondary = document.getElementById('employeeCountSecondary');
    const pendingApprovalCount = document.getElementById('pendingApprovalCount');
    const logoutBtn = document.getElementById('logoutBtn');
    const downloadCSVBtn = document.getElementById('downloadCSV');
    const employeeFormTitle = document.getElementById('employeeFormTitle');
    const employeeIdInput = document.getElementById('employeeId');
    const saveEmployeeBtn = document.getElementById('saveEmployeeBtn');
    const employeeFormMsg = document.getElementById('employeeFormMsg');
    const createUserMsg = document.getElementById('createUserMsg');
    const individualBulkHoursMsg = document.getElementById('individualBulkHoursMsg');
    const bulkHoursEmployeeSelect = document.getElementById('bulkHoursEmployeeId');
    const backBtn = document.getElementById('backBtn');

    const authHeaders = {
        Authorization: `Bearer ${token}`
    };

    const resetEmployeeForm = () => {
        addForm.reset();
        employeeIdInput.value = '';
        employeeFormTitle.textContent = 'Add Employee';
        saveEmployeeBtn.textContent = 'Save Employee';
        employeeFormMsg.textContent = '';
        employeeFormMsg.className = 'page-note';
    };

    const resetCreateUserForm = () => {
        createUserForm.reset();
        createUserMsg.textContent = '';
        createUserMsg.className = 'page-note';
    };

    const resetIndividualBulkHoursForm = () => {
        individualBulkHoursForm?.reset();
        if (bulkHoursEmployeeSelect) {
            bulkHoursEmployeeSelect.value = '';
        }
        if (individualBulkHoursMsg) {
            individualBulkHoursMsg.textContent = '';
            individualBulkHoursMsg.className = 'page-note';
        }
    };

    const openAddEmployeeSection = () => {
        addEmployeeSection?.classList.add('active');
        createUserSection?.classList.remove('active');
        individualBulkHoursSection?.classList.remove('active');
        addEmployeeSection?.scrollIntoView({ behavior: 'smooth' });
    };

    const openCreateUserSection = () => {
        createUserSection?.classList.add('active');
        addEmployeeSection?.classList.remove('active');
        individualBulkHoursSection?.classList.remove('active');
        createUserSection?.scrollIntoView({ behavior: 'smooth' });
    };

    const openIndividualBulkHoursSection = () => {
        individualBulkHoursSection?.classList.add('active');
        addEmployeeSection?.classList.remove('active');
        createUserSection?.classList.remove('active');
        individualBulkHoursSection?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAuthFailure = response => {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            window.location.href = 'login.html';
            return true;
        }
        return false;
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch('/api/employees', { headers: authHeaders });
            if (!response.ok) {
                if (handleAuthFailure(response)) return;
                throw new Error('Failed to fetch employees');
            }

            const employees = await response.json();
            employeeList.innerHTML = '';
            if (employeeCount) employeeCount.textContent = employees.length;
            if (employeeCountSecondary) employeeCountSecondary.textContent = employees.length;
            if (bulkHoursEmployeeSelect) {
                bulkHoursEmployeeSelect.innerHTML = '<option value="">Select an employee</option>';
            }

            if (employees.length === 0) {
                employeeList.innerHTML = '<li class="empty-note">No employees found.</li>';
                return;
            }

            employees.forEach(emp => {
                if (bulkHoursEmployeeSelect) {
                    const option = document.createElement('option');
                    option.value = emp._id;
                    option.textContent = `${emp.name} - ${emp.company}`;
                    bulkHoursEmployeeSelect.appendChild(option);
                }

                const li = document.createElement('li');
                li.className = 'employee-list-item';

                const main = document.createElement('div');
                main.className = 'employee-list-main';
                main.innerHTML = `
                    <span class="employee-list-name">${emp.name}</span>
                    <div class="employee-list-meta">${emp.role} at ${emp.company}</div>
                `;

                const side = document.createElement('div');
                side.className = 'employee-list-side';

                const trade = document.createElement('span');
                trade.className = 'employee-list-pill';
                trade.textContent = emp.trade;
                side.appendChild(trade);

                const actions = document.createElement('div');
                actions.className = 'employee-list-actions';

                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'table-action-btn';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', () => {
                    employeeIdInput.value = emp._id;
                    addForm.name.value = emp.name;
                    addForm.company.value = emp.company;
                    addForm.role.value = emp.role;
                    addForm.trade.value = emp.trade;
                    employeeFormTitle.textContent = 'Edit Employee';
                    saveEmployeeBtn.textContent = 'Update Employee';
                    employeeFormMsg.textContent = '';
                    openAddEmployeeSection();
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'table-action-btn table-action-btn-danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', async () => {
                    if (!window.confirm(`Delete ${emp.name}?`)) return;

                    try {
                        const resDelete = await fetch(`/api/employees/${emp._id}`, {
                            method: 'DELETE',
                            headers: authHeaders
                        });
                        const result = await resDelete.json();
                        if (!resDelete.ok) {
                            throw new Error(result.message || 'Failed to delete employee');
                        }

                        await fetchEmployees();
                    } catch (error) {
                        console.error(error);
                        alert(error.message || 'Failed to delete employee');
                    }
                });

                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);
                side.appendChild(actions);

                li.appendChild(main);
                li.appendChild(side);
                employeeList.appendChild(li);
            });
        } catch (error) {
            console.error(error);
            if (employeeCount) employeeCount.textContent = '0';
            if (employeeCountSecondary) employeeCountSecondary.textContent = '0';
            employeeList.innerHTML = '<li class="error-note">Error loading employees.</li>';
        }
    };

    const fetchPendingEmployees = async () => {
        try {
            const response = await fetch('/api/auth/pending-employees', { headers: authHeaders });
            const users = await response.json();
            if (!response.ok) {
                if (handleAuthFailure(response)) return;
                throw new Error(users.message || 'Failed to fetch pending employees');
            }

            pendingEmployeeList.innerHTML = '';
            pendingApprovalCount.textContent = users.length;

            if (users.length === 0) {
                pendingEmployeeList.innerHTML = '<li class="empty-note">No employee signups are waiting for review.</li>';
                return;
            }

            users.forEach(user => {
                const li = document.createElement('li');
                li.className = 'employee-list-item';

                const requestedDate = new Date(user.createdAt).toISOString().split('T')[0];
                const name = user.employeeProfile?.name || user.email;
                const company = user.employeeProfile?.company || 'Unknown company';
                const workerRole = user.employeeProfile?.role || 'Employee';
                const trade = user.employeeProfile?.trade || 'General';

                li.innerHTML = `
                    <div class="employee-list-main">
                        <span class="employee-list-name">${name}</span>
                        <div class="employee-list-meta">
                            ${user.email}<br />
                            ${workerRole} at ${company}<br />
                            Trade: ${trade}
                        </div>
                    </div>
                `;

                const side = document.createElement('div');
                side.className = 'employee-list-side';

                const requestedPill = document.createElement('span');
                requestedPill.className = 'employee-list-pill';
                requestedPill.textContent = `Requested ${requestedDate}`;
                side.appendChild(requestedPill);

                const actions = document.createElement('div');
                actions.className = 'employee-list-actions';

                const approveBtn = document.createElement('button');
                approveBtn.type = 'button';
                approveBtn.className = 'table-action-btn';
                approveBtn.textContent = 'Approve';
                approveBtn.addEventListener('click', async () => {
                    try {
                        const response = await fetch(`/api/auth/pending-employees/${user._id}/approve`, {
                            method: 'POST',
                            headers: authHeaders
                        });
                        const result = await response.json();
                        if (!response.ok) {
                            throw new Error(result.message || 'Failed to approve employee');
                        }
                        await Promise.all([fetchPendingEmployees(), fetchEmployees()]);
                    } catch (error) {
                        console.error(error);
                        alert(error.message || 'Failed to approve employee');
                    }
                });

                const rejectBtn = document.createElement('button');
                rejectBtn.type = 'button';
                rejectBtn.className = 'table-action-btn table-action-btn-danger';
                rejectBtn.textContent = 'Reject';
                rejectBtn.addEventListener('click', async () => {
                    const reviewNotes = window.prompt(
                        'Optional note for the employee:',
                        'Please contact admin for access.'
                    ) || '';

                    try {
                        const response = await fetch(`/api/auth/pending-employees/${user._id}/reject`, {
                            method: 'POST',
                            headers: {
                                ...authHeaders,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ reviewNotes })
                        });
                        const result = await response.json();
                        if (!response.ok) {
                            throw new Error(result.message || 'Failed to reject employee');
                        }
                        await fetchPendingEmployees();
                    } catch (error) {
                        console.error(error);
                        alert(error.message || 'Failed to reject employee');
                    }
                });

                actions.appendChild(approveBtn);
                actions.appendChild(rejectBtn);
                side.appendChild(actions);
                li.appendChild(side);
                pendingEmployeeList.appendChild(li);
            });
        } catch (error) {
            console.error(error);
            pendingApprovalCount.textContent = '0';
            pendingEmployeeList.innerHTML = '<li class="error-note">Error loading employee approvals.</li>';
        }
    };

    if (openAddEmployeeButtons.length > 0) {
        openAddEmployeeButtons.forEach(button => {
            button.addEventListener('click', openAddEmployeeSection);
        });
    }

    if (openCreateUserButtons.length > 0) {
        openCreateUserButtons.forEach(button => {
            button.addEventListener('click', openCreateUserSection);
        });
    }

    if (openIndividualBulkHoursButtons.length > 0) {
        openIndividualBulkHoursButtons.forEach(button => {
            button.addEventListener('click', openIndividualBulkHoursSection);
        });
    }

    cancelAddEmployeeBtn?.addEventListener('click', () => {
        addEmployeeSection?.classList.remove('active');
        resetEmployeeForm();
    });

    cancelCreateUserBtn?.addEventListener('click', () => {
        createUserSection?.classList.remove('active');
        resetCreateUserForm();
    });

    cancelIndividualBulkHoursBtn?.addEventListener('click', () => {
        individualBulkHoursSection?.classList.remove('active');
        resetIndividualBulkHoursForm();
    });

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = 'login.html';
    });

    backBtn?.addEventListener('click', () => {
        window.history.back();
    });

    addForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            name: addForm.name.value,
            company: addForm.company.value,
            role: addForm.role.value,
            trade: addForm.trade.value
        };

        try {
            const isEditing = Boolean(employeeIdInput.value);
            const endpoint = isEditing ? `/api/employees/${employeeIdInput.value}` : '/api/employees';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to save employee');
            }

            resetEmployeeForm();
            addEmployeeSection?.classList.remove('active');
            await fetchEmployees();
        } catch (error) {
            console.error(error);
            employeeFormMsg.className = 'error';
            employeeFormMsg.textContent = error.message || 'Failed to save employee';
        }
    });

    createUserForm?.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const response = await fetch('/api/auth/admin/create', {
                method: 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: createUserForm.email.value,
                    password: createUserForm.password.value,
                    role: createUserForm.role.value
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to create internal user');
            }

            resetCreateUserForm();
            createUserMsg.className = 'success';
            createUserMsg.textContent = result.message || 'User created';
        } catch (error) {
            console.error(error);
            createUserMsg.className = 'error';
            createUserMsg.textContent = error.message || 'Failed to create internal user';
        }
    });

    individualBulkHoursForm?.addEventListener('submit', async e => {
        e.preventDefault();

        const employeeId = individualBulkHoursForm.employeeId.value;
        const startDate = individualBulkHoursForm.startDate.value;
        const endDate = individualBulkHoursForm.endDate.value;
        const hours = Number(individualBulkHoursForm.hours.value);

        if (!employeeId || !startDate || !endDate) {
            individualBulkHoursMsg.className = 'error';
            individualBulkHoursMsg.textContent = 'Employee, start date, and end date are required.';
            return;
        }

        if (Number.isNaN(hours) || hours < 0 || hours > 24) {
            individualBulkHoursMsg.className = 'error';
            individualBulkHoursMsg.textContent = 'Hours per day must be between 0 and 24.';
            return;
        }

        if (startDate > endDate) {
            individualBulkHoursMsg.className = 'error';
            individualBulkHoursMsg.textContent = 'Start date must be on or before end date.';
            return;
        }

        const employeeOption = bulkHoursEmployeeSelect?.selectedOptions?.[0];
        const employeeName = employeeOption ? employeeOption.textContent.split(' - ')[0].trim() : '';
        const logs = [];
        const currentDate = new Date(`${startDate}T00:00:00`);
        const finalDate = new Date(`${endDate}T00:00:00`);

        while (currentDate <= finalDate) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            logs.push({
                employeeId,
                name: employeeName,
                date: `${year}-${month}-${day}`,
                hours
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (logs.length === 0) {
            individualBulkHoursMsg.className = 'error';
            individualBulkHoursMsg.textContent = 'No dates were generated for that range.';
            return;
        }

        try {
            const response = await fetch('/api/worklogs/bulk', {
                method: 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logs)
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to add bulk hours');
            }

            individualBulkHoursMsg.className = 'success';
            individualBulkHoursMsg.textContent = `Bulk hours added. Success: ${result.success}. Failed: ${result.failed}.`;
            individualBulkHoursForm.reset();
            if (bulkHoursEmployeeSelect) {
                bulkHoursEmployeeSelect.value = '';
            }
        } catch (error) {
            console.error(error);
            individualBulkHoursMsg.className = 'error';
            individualBulkHoursMsg.textContent = error.message || 'Failed to add bulk hours';
        }
    });

    if (downloadCSVBtn) {
        downloadCSVBtn.addEventListener('click', () => {
            alert('Download CSV feature coming soon!');
        });
    }

    const handleFileUpload = async (file, type) => {
        const reader = new FileReader();
        reader.onload = async event => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    alert('Sheet is empty');
                    return;
                }

                if (type === 'employees') {
                    const validEmployees = [];
                    jsonData.forEach(row => {
                        const normalizedRow = {};
                        Object.keys(row).forEach(key => {
                            normalizedRow[key.trim().toLowerCase()] = row[key];
                        });

                        const name = normalizedRow.name || normalizedRow['employee name'] || normalizedRow.employee || normalizedRow['full name'];
                        const company = normalizedRow.company || normalizedRow.organization || 'Unknown';
                        const roleName = normalizedRow.role || normalizedRow['job title'] || normalizedRow.title || 'Employee';
                        const trade = normalizedRow.trade || normalizedRow.department || 'General';

                        if (name) {
                            validEmployees.push({ name, company, role: roleName, trade });
                        }
                    });

                    if (validEmployees.length === 0) {
                        const firstRowKeys = jsonData.length > 0 ? Object.keys(jsonData[0]).join(', ') : 'None';
                        alert(`No valid employee rows found.\nRequired columns: Name, Company, Role, Trade\nFound columns in first row: ${firstRowKeys}`);
                        return;
                    }

                    const response = await fetch('/api/employees/bulk', {
                        method: 'POST',
                        headers: {
                            ...authHeaders,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(validEmployees)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        alert(`Successfully added ${result.length} employees!`);
                        fetchEmployees();
                    } else {
                        const error = await response.json();
                        alert(`Failed to upload: ${error.message}`);
                    }
                } else if (type === 'monthly_logs') {
                    const monthStr = prompt('Please enter the Target Month for this data (YYYY-MM):', new Date().toISOString().slice(0, 7));
                    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
                        alert('Invalid format. Please use YYYY-MM.');
                        return;
                    }

                    const [selectedYear, selectedMonth] = monthStr.split('-').map(Number);
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (rawData.length === 0) {
                        alert('Sheet is empty');
                        return;
                    }

                    let headerRowIndex = -1;
                    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
                        const row = rawData[i];
                        if (row.some(cell => typeof cell === 'string' && cell.trim().toLowerCase() === 'name')) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        alert("Could not find a 'Name' column in the first 10 rows.");
                        return;
                    }

                    const headers = rawData[headerRowIndex].map(h => (h ? h.toString().trim() : ''));
                    const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
                    const companyIndex = headers.findIndex(h => h.toLowerCase() === 'company');
                    const roleIndex = headers.findIndex(h => ['role', 'title', 'job title'].includes(h.toLowerCase()));
                    const tradeIndex = headers.findIndex(h => ['trade', 'department'].includes(h.toLowerCase()));

                    if (nameIndex === -1) {
                        alert("Header row found but 'Name' column is missing.");
                        return;
                    }

                    const logs = [];
                    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                        const row = rawData[i];
                        if (!row || row.length === 0) continue;

                        const name = row[nameIndex];
                        if (!name) continue;

                        const company = companyIndex !== -1 ? row[companyIndex] : 'Unknown';
                        const roleName = roleIndex !== -1 ? row[roleIndex] : 'Employee';
                        const trade = tradeIndex !== -1 ? row[tradeIndex] : 'General';

                        row.forEach((cellValue, colIndex) => {
                            if (colIndex === nameIndex || colIndex === companyIndex || colIndex === roleIndex || colIndex === tradeIndex) return;

                            const header = headers[colIndex];
                            if (!header) return;

                            const dayMatch = header.match(/^(\d{1,2})/);
                            const day = dayMatch ? Number(dayMatch[1]) : null;
                            if (!day || day < 1 || day > 31) return;

                            const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                            if (dateObj.getMonth() !== selectedMonth - 1) return;

                            if (cellValue !== undefined && cellValue !== null && cellValue !== '' && cellValue !== 0 && cellValue !== '0') {
                                const y = dateObj.getFullYear();
                                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                                const d = String(dateObj.getDate()).padStart(2, '0');
                                logs.push({
                                    name,
                                    company,
                                    role: roleName,
                                    trade,
                                    date: `${y}-${m}-${d}`,
                                    hours: Number(cellValue)
                                });
                            }
                        });
                    }

                    if (logs.length === 0) {
                        alert("No valid work logs found. Ensure columns are named like '2-Jan' or 'DD-MMM' and contain hours.");
                        return;
                    }

                    const response = await fetch('/api/worklogs/bulk', {
                        method: 'POST',
                        headers: {
                            ...authHeaders,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(logs)
                    });
                    const result = await response.json();
                    if (response.ok) {
                        alert(`Import Complete!\nSuccess: ${result.success}\nFailed: ${result.failed}\nErrors: ${result.errors.length}`);
                    } else {
                        alert(`Import Failed: ${result.message}`);
                    }
                }
            } catch (error) {
                console.error(error);
                alert('Error processing file. Please ensure it is a valid Excel or CSV file.');
            } finally {
                const csvInput = document.getElementById('csvFileInput');
                const excelInput = document.getElementById('excelFileInput');
                if (csvInput) csvInput.value = '';
                if (excelInput) excelInput.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const uploadCSVSquare = document.getElementById('uploadCSVSquare');
    const csvFileInput = document.getElementById('csvFileInput');
    if (uploadCSVSquare && csvFileInput) {
        uploadCSVSquare.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', e => {
            if (e.target.files[0]) handleFileUpload(e.target.files[0], 'employees');
        });
    }

    const uploadExcelSquare = document.getElementById('uploadExcelSquare');
    const excelFileInput = document.getElementById('excelFileInput');
    if (uploadExcelSquare && excelFileInput) {
        uploadExcelSquare.addEventListener('click', () => excelFileInput.click());
        excelFileInput.addEventListener('change', e => {
            if (e.target.files[0]) handleFileUpload(e.target.files[0], 'monthly_logs');
        });
    }

    fetchEmployees();
    fetchPendingEmployees();
});
