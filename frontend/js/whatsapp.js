document.addEventListener('DOMContentLoaded', () => {
    const parseBtn = document.getElementById('parseBtn');
    const textArea = document.getElementById('whatsappText');
    const resultArea = document.getElementById('resultArea');
    const resultEmpty = document.getElementById('resultEmpty');
    const loading = document.getElementById('loading');
    const previewTableBody = document.querySelector('#previewTable tbody');
    const saveMsg = document.getElementById('saveMsg');
    const parsedDate = document.getElementById('parsedDate');
    const parsedSite = document.getElementById('parsedSite');
    const parsedCount = document.getElementById('parsedCount');
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Store parsed data to send to backend later
    let currentParsedData = [];

    const setStatusMessage = (message, tone = 'muted') => {
        saveMsg.textContent = message;
        if (tone === 'success') {
            saveMsg.style.color = 'var(--success-color)';
        } else if (tone === 'error') {
            saveMsg.style.color = 'var(--danger-color)';
        } else {
            saveMsg.style.color = 'var(--text-muted)';
        }
    };

    const showEmptyState = () => {
        resultArea.style.display = 'none';
        if (resultEmpty) resultEmpty.style.display = 'grid';
    };

    const showResultState = () => {
        resultArea.style.display = 'grid';
        if (resultEmpty) resultEmpty.style.display = 'none';
    };

    showEmptyState();

    parseBtn.addEventListener('click', async () => {
        const text = textArea.value.trim();
        if (!text) {
            setStatusMessage('Paste a WhatsApp report before extracting.', 'error');
            return;
        }

        setStatusMessage('');
        loading.style.display = 'block';
        showEmptyState();
        parseBtn.disabled = true;
        parseBtn.textContent = 'Extracting...';

        try {
            const res = await fetch('/api/ai/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message: text })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'AI Parse Failed');

            // Render Results
            parsedDate.textContent = data.date || 'Unknown';
            parsedSite.textContent = data.site || 'Unknown';

            previewTableBody.innerHTML = '';
            currentParsedData = data.workers || [];
            parsedCount.textContent = currentParsedData.length;

            if (currentParsedData.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 2;
                td.textContent = 'No workers found. Adjust the message and try again.';
                tr.appendChild(td);
                previewTableBody.appendChild(tr);
                setStatusMessage('No worker entries were detected.', 'error');
            } else {
                currentParsedData.forEach(worker => {
                    const tr = document.createElement('tr');
                    const nameCell = document.createElement('td');
                    const hoursCell = document.createElement('td');

                    nameCell.textContent = worker.name;
                    hoursCell.textContent = worker.hours;

                    tr.appendChild(nameCell);
                    tr.appendChild(hoursCell);
                    previewTableBody.appendChild(tr);
                });
                setStatusMessage(`Ready to save ${currentParsedData.length} extracted entr${currentParsedData.length === 1 ? 'y' : 'ies'}.`);
            }

            showResultState();

        } catch (err) {
            console.error(err);
            setStatusMessage(`Error: ${err.message}`, 'error');
            showEmptyState();
        } finally {
            loading.style.display = 'none';
            parseBtn.disabled = false;
            parseBtn.textContent = 'Extract Work Logs';
        }
    });

    // Save Button Handler
    const finalSaveBtn = document.getElementById('saveBtn');
    finalSaveBtn.addEventListener('click', async () => {
        if (currentParsedData.length === 0) return;

        const dateStr = document.getElementById('parsedDate').textContent;
        // Parse date to YYYY-MM-DD
        // Assuming AI returns something parsable or strict format
        // We'll trust the AI for now or just pass the date string to backend to handle?
        // Better to ask backend to return ISO date.

        // Prepare bulk payload
        // We need to match the bulk endpoint structure: [{name, date, hours, company?, role?}]
        const payload = currentParsedData.map(w => ({
            name: w.name,
            date: dateStr, // This might need formatting!
            hours: parseFloat(w.hours),
            company: 'Unknown', // AI doesn't extract this yet
            role: 'Worker',
            trade: 'General'
        }));

        try {
            finalSaveBtn.disabled = true;
            finalSaveBtn.textContent = "Saving...";
            setStatusMessage('Saving extracted entries...');

            const res = await fetch('/api/worklogs/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok) {
                setStatusMessage(`Saved ${result.success} logs successfully.`, 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            setStatusMessage(`Error saving: ${e.message}`, 'error');
        } finally {
            finalSaveBtn.disabled = false;
            finalSaveBtn.textContent = "Save to Database";
        }
    });
});
