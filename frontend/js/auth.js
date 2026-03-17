// auth.js – handles login and signup form submissions

document.addEventListener('DOMContentLoaded', () => {
    // Determine which form is present (login or signup)
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async e => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) {
                    document.getElementById('errorMsg').textContent = data.message || 'Login failed';
                    return;
                }
                // store token and role, then redirect based on role
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
                if (data.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'manager.html';
                }
            } catch (err) {
                console.error(err);
                document.getElementById('errorMsg').textContent = 'Network error';
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async e => {
            e.preventDefault();
            const email = signupForm.email.value;
            const password = signupForm.password.value;
            const role = signupForm.role.value;
            const token = localStorage.getItem('token');
            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ email, password, role })
                });
                const data = await res.json();
                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                        document.getElementById('msg').textContent = 'Only logged-in admins can create manager accounts.';
                        return;
                    }
                    document.getElementById('msg').textContent = data.message || 'Signup failed';
                    return;
                }
                document.getElementById('msg').textContent = 'Manager account created.';
                signupForm.reset();
            } catch (err) {
                console.error(err);
                document.getElementById('msg').textContent = 'Network error';
            }
        });
    }
});
