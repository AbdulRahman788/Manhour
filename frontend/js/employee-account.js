document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'employee') {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('accountForm');
    const message = document.getElementById('accountMsg');
    const statusBadge = document.getElementById('accountStatusBadge');
    const statusText = document.getElementById('accountStatusText');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById('backBtn');

    const setMessage = (text, tone = 'error') => {
        message.textContent = text;
        message.className = tone;
        message.style.display = text ? 'block' : 'none';
    };

    const populateForm = (user) => {
        form.name.value = user.employeeProfile?.name || '';
        form.email.value = user.email || '';
        form.company.value = user.employeeProfile?.company || '';
        form.role.value = user.employeeProfile?.role || '';
        form.trade.value = user.employeeProfile?.trade || '';
        statusBadge.textContent = user.approvalStatus || 'pending';
        statusText.textContent = user.approvalStatus === 'approved'
            ? 'Your access is active.'
            : (user.reviewNotes || 'Your profile is waiting on admin review.');
    };

    try {
        const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const user = await response.json();

        if (!response.ok) {
            throw new Error(user.message || 'Failed to load account');
        }

        populateForm(user);
    } catch (error) {
        console.error(error);
        setMessage(error.message || 'Failed to load account');
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            const response = await fetch('/api/auth/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: form.email.value,
                    currentPassword: form.currentPassword.value,
                    newPassword: form.newPassword.value
                })
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to update account');
            }

            populateForm(result.user);
            form.currentPassword.value = '';
            form.newPassword.value = '';
            setMessage('Account updated successfully.', 'success');
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'Failed to update account');
        }
    });

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = 'login.html';
    });

    backBtn?.addEventListener('click', () => {
        window.history.back();
    });
});
