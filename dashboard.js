// Dashboard functionality
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const logoutBtn = document.getElementById('logoutBtn');
    const notificationBtn = document.getElementById('notificationBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const ctaGetStarted = document.getElementById('ctaGetStarted');
    const helpBtn = document.getElementById('helpBtn');

    // Navigation items click
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const page = item.dataset.page;
            
            if (page === 'new-solicitation') {
                ipcRenderer.send('navigate', 'new-solicitation.html');
            } else if (page === 'records') {
                ipcRenderer.send('navigate', 'records.html');
            } else if (page === 'reports') {
                ipcRenderer.send('navigate', 'reports.html');
            } else if (page === 'summary') {
                ipcRenderer.send('navigate', 'summary.html');
            } else if (page === 'list') {
                ipcRenderer.send('navigate', 'list.html');
            } else if (page === 'dashboard') {
                // Already on dashboard
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            } else {
                console.log(`Navigating to: ${page}`);
                alert(`${page} page coming soon`);
            }
        });
    });

    // Logout button
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            // Clear any session data
            localStorage.removeItem('user');
            
            // Navigate back to login
            ipcRenderer.send('navigate', 'login.html');
        }
    });

    // Notification button
    notificationBtn.addEventListener('click', () => {
        alert('You have 3 new notifications:\n\n1. New solicitation request pending\n2. Monthly report ready\n3. System update available');
    });

    // Settings button
    settingsBtn.addEventListener('click', () => {
        alert('Settings panel coming soon');
    });

    // CTA Get Started button
    ctaGetStarted.addEventListener('click', () => {
        ipcRenderer.send('navigate', 'new-solicitation.html');
    });

    // Help button
    helpBtn.addEventListener('click', () => {
        alert('Help & Support\n\nFor assistance, please contact:\nEmail: support@manila.gov.ph\nPhone: (02) 1234-5678\n\nOffice Hours: Mon-Fri, 8AM-5PM');
    });

    // Store user session
    if (!localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify({
            name: 'Admin User',
            role: 'Administrator',
            loginTime: new Date().toISOString()
        }));
    }
});
