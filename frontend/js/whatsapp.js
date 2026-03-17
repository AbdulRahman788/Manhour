document.addEventListener('DOMContentLoaded', () => {
    const parseBtn = document.getElementById('parseBtn');
    const textArea = document.getElementById('whatsappText');
    const resultArea = document.getElementById('resultArea');
    const loading = document.getElementById('loading');
    const previewTableBody = document.querySelector('#previewTable tbody');
    const saveMsg = document.getElementById('saveMsg');
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Store parsed data to send to backend later
    let currentParsedData = [];

    parseBtn.addEventListener('click', async () => {
        const text = textArea.value.trim();
        if (!text) return alert("Please paste a message first!");

        loading.style.display = 'block';
        resultArea.style.display = 'none';
        parseBtn.disabled = true;

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
            document.getElementById('parsedDate').textContent = data.date || 'Unknown';
            document.getElementById('parsedSite').textContent = data.site || 'Unknown';

            previewTableBody.innerHTML = '';
            currentParsedData = data.workers || [];

            if (currentParsedData.length === 0) {
                previewTableBody.innerHTML = '<tr><td colspan="2">No workers found. Try again?</td></tr>';
            } else {
                currentParsedData.forEach(worker => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${worker.name}</td>
                        <td>${worker.hours}</td>
                    `;
                    previewTableBody.appendChild(tr);
                });
            }

            resultArea.style.display = 'block';

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            loading.style.display = 'none';
            parseBtn.disabled = false;
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
                saveMsg.style.color = '#00e676';
                saveMsg.textContent = `Success! Saved ${result.success} logs.`;
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            saveMsg.style.color = 'red';
            saveMsg.textContent = "Error saving: " + e.message;
        } finally {
            finalSaveBtn.disabled = false;
            finalSaveBtn.textContent = "Save to Database";
        }
    });
});
