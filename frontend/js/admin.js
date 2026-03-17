// admin.js – handles employee creation, list, and logout
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Elements
    const addEmployeeSection = document.getElementById('addEmployeeSection');
    const openAddEmployeeButtons = document.querySelectorAll('.js-open-add-employee');
    const cancelAddEmployeeBtn = document.getElementById('cancelAddEmployee');
    const addForm = document.getElementById('addEmployeeForm');
    const employeeList = document.getElementById('employeeList');
    const employeeCount = document.getElementById('employeeCount');
    const employeeCountSecondary = document.getElementById('employeeCountSecondary');
    const logoutBtn = document.getElementById('logoutBtn');
    const downloadCSVBtn = document.getElementById('downloadCSV');

    // Toggle Add Employee Section
    const openAddEmployeeSection = () => {
        if (addEmployeeSection) {
            addEmployeeSection.classList.add('active');
            addEmployeeSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (openAddEmployeeButtons.length > 0) {
        openAddEmployeeButtons.forEach(button => {
            button.addEventListener('click', openAddEmployeeSection);
        });
    }

    if (cancelAddEmployeeBtn) {
        cancelAddEmployeeBtn.addEventListener('click', () => {
            addEmployeeSection.classList.remove('active');
            addForm.reset();
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    // Fetch and render employee list
    const fetchEmployees = async () => {
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
            employeeList.innerHTML = '';
            if (employeeCount) employeeCount.textContent = employees.length;
            if (employeeCountSecondary) employeeCountSecondary.textContent = employees.length;

            if (employees.length === 0) {
                employeeList.innerHTML = '<li class="empty-note">No employees found.</li>';
                return;
            }

            employees.forEach(emp => {
                const li = document.createElement('li');
                li.className = 'employee-list-item';
                const main = document.createElement('div');
                main.className = 'employee-list-main';

                const name = document.createElement('span');
                name.className = 'employee-list-name';
                name.textContent = emp.name;

                const meta = document.createElement('div');
                meta.className = 'employee-list-meta';
                meta.textContent = `${emp.role} at ${emp.company}`;

                const trade = document.createElement('span');
                trade.className = 'employee-list-pill';
                trade.textContent = emp.trade;

                main.appendChild(name);
                main.appendChild(meta);
                li.appendChild(main);
                li.appendChild(trade);
                employeeList.appendChild(li);
            });
        } catch (e) {
            console.error(e);
            if (employeeCount) employeeCount.textContent = '0';
            if (employeeCountSecondary) employeeCountSecondary.textContent = '0';
            employeeList.innerHTML = '<li class="error-note">Error loading employees.</li>';
        }
    };

    // Submit new employee
    if (addForm) {
        addForm.addEventListener('submit', async e => {
            e.preventDefault();
            const data = {
                name: addForm.name.value,
                company: addForm.company.value,
                role: addForm.role.value,
                trade: addForm.trade.value
            };
            try {
                const res = await fetch('/api/employees', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
                if (!res.ok) throw new Error('Failed to add');
                addForm.reset();
                addEmployeeSection.classList.remove('active');
                await fetchEmployees();
            } catch (e) {
                console.error(e);
                alert('Failed to add employee');
            }
        });
    }

    // CSV Download Placeholder
    if (downloadCSVBtn) {
        downloadCSVBtn.addEventListener('click', () => {
            alert('Download CSV feature coming soon!');
        });
    }

    // Unified Import Logic (CSV & Excel) using SheetJS
    const handleFileUpload = async (file, type) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    alert("Sheet is empty");
                    return;
                }

                if (type === 'employees') {
                    // Bulk Employee Import
                    const validEmployees = [];
                    jsonData.forEach(row => {
                        // Normalize keys: trim and lowercase
                        const normalizedRow = {};
                        Object.keys(row).forEach(key => {
                            normalizedRow[key.trim().toLowerCase()] = row[key];
                        });

                        const name = normalizedRow['name'] || normalizedRow['employee name'] || normalizedRow['employee'] || normalizedRow['full name'];
                        const company = normalizedRow['company'] || normalizedRow['organization'] || 'Unknown'; // Default if missing
                        const role = normalizedRow['role'] || normalizedRow['job title'] || normalizedRow['title'] || 'Employee'; // Default if missing
                        const trade = normalizedRow['trade'] || normalizedRow['department'] || 'General'; // Default if missing

                        if (name) {
                            validEmployees.push({ name, company, role, trade });
                        } else {
                            console.warn('Skipping row due to missing name:', row);
                        }
                    });

                    if (validEmployees.length === 0) {
                        // Debug info
                        const firstRowKeys = jsonData.length > 0 ? Object.keys(jsonData[0]).join(', ') : 'None';
                        alert(`No valid employee rows found.\nRequired columns: Name, Company, Role, Trade\nFound columns in first row: ${firstRowKeys}`);
                        return;
                    }

                    const res = await fetch('/api/employees/bulk', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(validEmployees)
                    });

                    if (res.ok) {
                        const result = await res.json();
                        alert(`Successfully added ${result.length} employees!`);
                        fetchEmployees();
                    } else {
                        const err = await res.json();
                        alert(`Failed to upload: ${err.message}`);
                    }
                } else if (type === 'monthly_logs') {
                    // Prompt for Target Month (YYYY-MM) to force data into that month
                    const monthStr = prompt("Please enter the Target Month for this data (YYYY-MM):", new Date().toISOString().slice(0, 7));
                    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
                        alert("Invalid format. Please use YYYY-MM.");
                        // Clear inputs
                        const csvInput = document.getElementById('csvFileInput');
                        const excelInput = document.getElementById('excelFileInput');
                        if (csvInput) csvInput.value = '';
                        if (excelInput) excelInput.value = '';
                        return;
                    }
                    const [selectedYear, selectedMonth] = monthStr.split('-').map(Number); // Month is 1-12 here

                    // Read as Array of Arrays to find header row
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (rawData.length === 0) {
                        alert("Sheet is empty");
                        return;
                    }

                    // Find header row (row containing "Name")
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

                    if (nameIndex === -1) {
                        alert("Header row found but 'Name' column is missing.");
                        return;
                    }

                    const companyIndex = headers.findIndex(h => h.toLowerCase() === 'company');
                    const roleIndex = headers.findIndex(h => ['role', 'title', 'job title'].includes(h.toLowerCase()));
                    const tradeIndex = headers.findIndex(h => ['trade', 'department'].includes(h.toLowerCase()));

                    const logs = [];

                    // Process data rows
                    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                        const row = rawData[i];
                        if (!row || row.length === 0) continue;

                        const name = row[nameIndex];
                        if (!name) continue;

                        // Extract optional details for auto-creation
                        const company = companyIndex !== -1 ? row[companyIndex] : 'Unknown';
                        const role = roleIndex !== -1 ? row[roleIndex] : 'Employee';
                        const trade = tradeIndex !== -1 ? row[tradeIndex] : 'General';

                        // Iterate over all columns to find dates
                        row.forEach((cellValue, colIndex) => {
                            if (colIndex === nameIndex || colIndex === companyIndex || colIndex === roleIndex || colIndex === tradeIndex) return;

                            const header = headers[colIndex];
                            if (!header) return;

                            // Parse Header for Date
                            // We look for a Day Number (1-31) at the start of the header
                            // E.g. "2-Jan", "5-Jan", "1", "2" -> we take "2", "5", "1", "2"

                            let day = null;
                            const dayMatch = header.match(/^(\d{1,2})/); // Match number at start
                            if (dayMatch) {
                                day = parseInt(dayMatch[1]);
                            }

                            if (day && day >= 1 && day <= 31) {
                                // Construct date using SELECTED year and month
                                // selectedMonth is 1-12, Date constructor needs 0-11
                                const dateObj = new Date(selectedYear, selectedMonth - 1, day);

                                // Validation: Ensure the date is valid (e.g. not Feb 30)
                                // Also skip if the date in the column header (e.g. "2-Jan") explicitly mismatches selected month? 
                                // No, user explicitly requested "Target Month" override.
                                if (dateObj.getMonth() !== selectedMonth - 1) {
                                    // Invalid date for this month (e.g. Sep 31), skip
                                    return;
                                }

                                if (cellValue !== undefined && cellValue !== null && cellValue !== '' && cellValue != 0 && cellValue != '0') {
                                    const y = dateObj.getFullYear();
                                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                                    const d = String(dateObj.getDate()).padStart(2, '0');
                                    const dateString = `${y}-${m}-${d}`;

                                    logs.push({
                                        name: name,
                                        company: company, // Send details for auto-creation
                                        role: role,
                                        trade: trade,
                                        date: dateString,
                                        hours: Number(cellValue)
                                    });
                                }
                            }
                        });
                    }

                    if (logs.length === 0) {
                        alert("No valid work logs found. Ensure columns are named like '2-Jan' or 'DD-MMM' and contain hours.");
                        // Clear inputs
                        const csvInput = document.getElementById('csvFileInput');
                        const excelInput = document.getElementById('excelFileInput');
                        if (csvInput) csvInput.value = '';
                        if (excelInput) excelInput.value = '';
                        return;
                    }

                    const res = await fetch('/api/worklogs/bulk', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(logs)
                    });
                    const result = await res.json();
                    if (res.ok) {
                        alert(`Import Complete!\nSuccess: ${result.success}\nFailed: ${result.failed}\nErrors: ${result.errors.length}`);
                    } else {
                        alert(`Import Failed: ${result.message}`);
                    }
                }

            } catch (err) {
                console.error(err);
                alert("Error processing file. Please ensure it is a valid Excel or CSV file.");
            }

            // Clear inputs
            const csvInput = document.getElementById('csvFileInput');
            const excelInput = document.getElementById('excelFileInput');
            if (csvInput) csvInput.value = '';
            if (excelInput) excelInput.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    // CSV Upload Implementation
    const uploadCSVSquare = document.getElementById('uploadCSVSquare');
    const csvFileInput = document.getElementById('csvFileInput');

    if (uploadCSVSquare && csvFileInput) {
        uploadCSVSquare.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleFileUpload(e.target.files[0], 'employees');
        });
    }

    // Excel Upload Implementation
    const uploadExcelSquare = document.getElementById('uploadExcelSquare');
    const excelFileInput = document.getElementById('excelFileInput');

    if (uploadExcelSquare && excelFileInput) {
        uploadExcelSquare.addEventListener('click', () => excelFileInput.click());
        excelFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleFileUpload(e.target.files[0], 'monthly_logs');
        });
    }

    // Initial load
    fetchEmployees();
});
