(async () => {
    const base = 'http://localhost:5000';
    // Login as admin
    const loginRes = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'adminpass' })
    });
    const loginData = await loginRes.json();
    console.log('Login response status:', loginRes.status);
    console.log('Login data:', loginData);
    const token = loginData.token;

    // Fetch employee list (should be empty initially)
    const empRes = await fetch(`${base}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const empData = await empRes.json();
    console.log('Employees response status:', empRes.status);
    console.log('Employees data:', empData);
})();
