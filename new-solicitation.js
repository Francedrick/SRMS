// New Solicitation Form functionality
const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');
require('toastify-js/src/toastify.css');

document.addEventListener('DOMContentLoaded', () => {
    const solicitationForm = document.getElementById('solicitationForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const notificationBtn = document.getElementById('notificationBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const helpBtn = document.getElementById('helpBtn');
    const navItems = document.querySelectorAll('.nav-item');

    // Set today's date as default
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // Navigation items click
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const page = item.dataset.page;
            
            if (page === 'dashboard') {
                ipcRenderer.send('navigate', 'dashboard.html');
            } else if (page === 'records') {
                ipcRenderer.send('navigate', 'records.html');
            } else if (page === 'reports') {
                ipcRenderer.send('navigate', 'reports.html');
            } else if (page === 'summary') {
                ipcRenderer.send('navigate', 'summary.html');
            } else if (page === 'list') {
                ipcRenderer.send('navigate', 'list.html');
            } else if (page === 'new-solicitation') {
                // Already here
            } else {
                showToast(`${page} page coming soon`, 'info');
            }
        });
    });

    // Form submission
    solicitationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = {
            zone: document.getElementById('zone').value,
            assistanceType: document.getElementById('assistanceType').value,
            barangay: document.getElementById('barangay').value,
            amount: document.getElementById('amount').value,
            chairman: document.getElementById('chairman').value,
            date: document.getElementById('date').value,
            solicitor: document.getElementById('solicitor').value,
            status: document.getElementById('status').value
        };

        // Validate required fields
        if (!formData.zone || !formData.assistanceType || !formData.barangay || 
            !formData.amount || !formData.date || !formData.status) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        // Simulate saving the record
        console.log('Submitting solicitation record:', formData);
        
        showToast('Solicitation record submitted successfully!', 'success');
        
        // Reset form after short delay
        setTimeout(() => {
            solicitationForm.reset();
            dateInput.value = today;
        }, 1500);
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel? All unsaved data will be lost.')) {
            solicitationForm.reset();
            dateInput.value = today;
            showToast('Form cleared', 'info');
        }
    });

    // Logout button
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('user');
            ipcRenderer.send('navigate', 'login.html');
        }
    });

    // Notification button
    notificationBtn.addEventListener('click', () => {
        showToast('You have 3 new notifications', 'info');
    });

    // Settings button
    settingsBtn.addEventListener('click', () => {
        showToast('Settings panel coming soon', 'info');
    });

    // Help button
    helpBtn.addEventListener('click', () => {
        showToast('Need help? Contact IT support at support@manila.gov.ph', 'info');
    });

    // Toast notification function
    function showToast(message, type = 'info') {
        const backgroundColor = {
            success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            error: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            info: 'linear-gradient(135deg, #4158D0 0%, #5B4FC7 100%)'
        };

        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: backgroundColor[type] || backgroundColor.info,
                borderRadius: "12px",
                padding: "16px 24px",
                fontSize: "14px",
                fontWeight: "500"
            }
        }).showToast();
    }

    // Amount input formatting
    const amountInput = document.getElementById('amount');
    amountInput.addEventListener('blur', function() {
        if (this.value) {
            this.value = parseFloat(this.value).toFixed(2);
        }
    });
});
