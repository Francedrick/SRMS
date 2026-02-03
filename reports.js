// Reports page functionality
const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');
require('toastify-js/src/toastify.css');

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const logoutBtn = document.getElementById('logoutBtn');
    const notificationBtn = document.getElementById('notificationBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const helpBtn = document.getElementById('helpBtn');
    const filterBarangay = document.getElementById('filterBarangay');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const tableBody = document.getElementById('tableBody');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    const totalAmountEl = document.getElementById('totalAmount');
    const chipDashboard = document.getElementById('chipDashboard');
    const chipGenerate = document.getElementById('chipGenerate');
    const chipCalendar = document.getElementById('chipCalendar');
    const printBtn = document.getElementById('printBtn');
    const exportBtn = document.getElementById('exportBtn');

    // Sample report data
    let reportData = [
        { id: 1, zone: 'Zone 1', barangay: 'Barangay 1', chairman: 'Juan Dela Cruz', solicitor: 'Maria Santos', assistance: 'Financial Aid', amount: 5000, date: '2026-01-12' },
        { id: 2, zone: 'Zone 2', barangay: 'Barangay 3', chairman: 'Pedro Reyes', solicitor: 'Ana Garcia', assistance: 'Medical Assistance', amount: 7800, date: '2026-01-18' },
        { id: 3, zone: 'Zone 3', barangay: 'Barangay 2', chairman: 'Carlos Lopez', solicitor: 'Rosa Martinez', assistance: 'Educational Support', amount: 3200, date: '2026-01-21' },
        { id: 4, zone: 'Zone 1', barangay: 'Barangay 4', chairman: 'Josefina Cruz', solicitor: 'Miguel Ramos', assistance: 'Burial Assistance', amount: 6000, date: '2026-01-23' },
        { id: 5, zone: 'Zone 4', barangay: 'Barangay 5', chairman: 'Andrea Dizon', solicitor: 'Luis Hernandez', assistance: 'Financial Aid', amount: 4500, date: '2026-01-25' }
    ];

    let filteredData = [...reportData];

    renderTable(filteredData);
    updateTotal(filteredData);

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;

            if (page === 'dashboard') {
                ipcRenderer.send('navigate', 'dashboard.html');
            } else if (page === 'new-solicitation') {
                ipcRenderer.send('navigate', 'new-solicitation.html');
            } else if (page === 'records') {
                ipcRenderer.send('navigate', 'records.html');
            } else if (page === 'reports') {
                // Already here
            } else if (page === 'summary') {
                ipcRenderer.send('navigate', 'summary.html');
            } else if (page === 'list') {
                ipcRenderer.send('navigate', 'list.html');
            } else {
                showToast(`${page} page coming soon`, 'info');
            }
        });
    });

    // Top chips
    chipDashboard.addEventListener('click', () => ipcRenderer.send('navigate', 'dashboard.html'));
    chipGenerate.addEventListener('click', () => showToast('Generating PDF report...', 'info'));
    chipCalendar.addEventListener('click', () => showToast('Calendar view coming soon', 'info'));

    // Filter application
    applyFilterBtn.addEventListener('click', () => {
        const barangay = filterBarangay.value;
        filteredData = barangay ? reportData.filter(r => r.barangay === barangay) : [...reportData];
        renderTable(filteredData);
        updateTotal(filteredData);
        showToast('Filter applied', 'success');
    });

    // Print and Export buttons
    printBtn.addEventListener('click', () => {
        showToast('Preparing print view...', 'info');
        window.print();
    });

    exportBtn.addEventListener('click', () => {
        if (!filteredData.length) {
            showToast('No data to export', 'error');
            return;
        }
        showToast('Exporting data to CSV...', 'success');
        // Add CSV export logic here
    });

    // Logout and header buttons
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('user');
            ipcRenderer.send('navigate', 'login.html');
        }
    });

    notificationBtn.addEventListener('click', () => {
        showToast('You have 3 new notifications', 'info');
    });

    settingsBtn.addEventListener('click', () => {
        showToast('Settings panel coming soon', 'info');
    });

    helpBtn.addEventListener('click', () => {
        showToast('Need help? Contact IT support at support@manila.gov.ph', 'info');
    });

    // Helpers
    function renderTable(data) {
        if (!data.length) {
            tableContainer.classList.add('hidden');
            emptyState.classList.add('show');
            tableBody.innerHTML = '';
            return;
        }

        tableContainer.classList.remove('hidden');
        emptyState.classList.remove('show');

        tableBody.innerHTML = data.map(row => `
            <tr>
                <td>${row.zone}</td>
                <td>${row.barangay}</td>
                <td>${row.chairman}</td>
                <td>${row.solicitor}</td>
                <td>${row.assistance}</td>
                <td class="amount-cell">₱${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>${formatDate(row.date)}</td>
            </tr>
        `).join('');
    }

    function updateTotal(data) {
        const total = data.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        totalAmountEl.textContent = `₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

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
});
