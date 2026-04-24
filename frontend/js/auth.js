// auth.js – handles login and roster-verified employee signup

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    const redirectByRole = role => {
        if (role === 'admin') {
            window.location.href = 'admin.html';
            return;
        }
        if (role === 'manager') {
            window.location.href = 'manager.html';
            return;
        }
        window.location.href = 'employee-dashboard.html';
    };

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

                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
                redirectByRole(data.role);
            } catch (err) {
                console.error(err);
                document.getElementById('errorMsg').textContent = 'Network error';
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async e => {
            e.preventDefault();
            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: signupForm.name.value,
                        email: signupForm.email.value,
                        password: signupForm.password.value
                    })
                });
                const data = await res.json();
                if (!res.ok) {
                    document.getElementById('msg').className = 'error';
                    document.getElementById('msg').textContent = data.message || 'Signup failed';
                    return;
                }

                document.getElementById('msg').className = 'success';
                document.getElementById('msg').textContent = data.message || 'Your account is ready. You can log in now.';
                signupForm.reset();
            } catch (err) {
                console.error(err);
                document.getElementById('msg').className = 'error';
                document.getElementById('msg').textContent = 'Network error';
            }
        });
    }
});
