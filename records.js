// Records page functionality
const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');
require('toastify-js/src/toastify.css');

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const filterZone = document.getElementById('filterZone');
    const filterBarangay = document.getElementById('filterBarangay');
    const filterAssistance = document.getElementById('filterAssistance');
    const filterDateRange = document.getElementById('filterDateRange');
    const filterStatus = document.getElementById('filterStatus');
    const exportBtn = document.getElementById('exportBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const tableBody = document.getElementById('tableBody');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    const logoutBtn = document.getElementById('logoutBtn');
    const notificationBtn = document.getElementById('notificationBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const helpBtn = document.getElementById('helpBtn');
    const navItems = document.querySelectorAll('.nav-item');

    // Sample data (empty initially - will show empty state)
    let records = [];
    
    // Uncomment to add sample data:
    /*
    records = [
        {
            id: 1,
            zone: 'Zone 1',
            barangay: 'Barangay 1',
            chairman: 'Juan Dela Cruz',
            solicitor: 'Maria Santos',
            assistance: 'Financial Aid',
            amount: 5000,
            date: '2026-01-15',
            status: 'approved'
        },
        {
            id: 2,
            zone: 'Zone 2',
            barangay: 'Barangay 3',
            chairman: 'Pedro Reyes',
            solicitor: 'Ana Garcia',
            assistance: 'Medical Assistance',
            amount: 8000,
            date: '2026-01-20',
            status: 'pending'
        },
        {
            id: 3,
            zone: 'Zone 3',
            barangay: 'Barangay 2',
            chairman: 'Carlos Lopez',
            solicitor: 'Rosa Martinez',
            assistance: 'Educational Support',
            amount: 3500,
            date: '2026-01-22',
            status: 'completed'
        }
    ];
    */

    // Initialize page
    renderRecords(records);

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
                // Already on records page
            } else if (page === 'reports') {
                ipcRenderer.send('navigate', 'reports.html');
            } else if (page === 'summary') {
                ipcRenderer.send('navigate', 'summary.html');
            } else if (page === 'list') {
                ipcRenderer.send('navigate', 'list.html');
            } else {
                showToast(`${page} page coming soon`, 'info');
            }
        });
    });

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = records.filter(record => 
            record.zone.toLowerCase().includes(searchTerm) ||
            record.barangay.toLowerCase().includes(searchTerm) ||
            record.chairman.toLowerCase().includes(searchTerm) ||
            record.solicitor.toLowerCase().includes(searchTerm)
        );
        renderRecords(filtered);
    });

    // Filter functionality
    [filterZone, filterBarangay, filterAssistance, filterStatus].forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });

    function applyFilters() {
        let filtered = [...records];

        if (filterZone.value) {
            filtered = filtered.filter(r => r.zone.toLowerCase().includes(filterZone.value));
        }
        if (filterBarangay.value) {
            filtered = filtered.filter(r => r.barangay.toLowerCase().includes(filterBarangay.value));
        }
        if (filterAssistance.value) {
            filtered = filtered.filter(r => r.assistance.toLowerCase().includes(filterAssistance.value));
        }
        if (filterStatus.value) {
            filtered = filtered.filter(r => r.status === filterStatus.value);
        }

        renderRecords(filtered);
    }

    // Render records table
    function renderRecords(data) {
        if (data.length === 0) {
            tableContainer.classList.add('hidden');
            emptyState.classList.add('show');
            return;
        }

        tableContainer.classList.remove('hidden');
        emptyState.classList.remove('show');

        tableBody.innerHTML = data.map(record => `
            <tr>
                <td>${record.zone}</td>
                <td>${record.barangay}</td>
                <td>${record.chairman}</td>
                <td>${record.solicitor}</td>
                <td>${record.assistance}</td>
                <td>₱${record.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>${formatDate(record.date)}</td>
                <td><span class="status-badge status-${record.status}">${capitalizeFirst(record.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="viewRecord(${record.id})" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="btn-action btn-edit" onclick="editRecord(${record.id})" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteRecord(${record.id})" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Export functionality
    exportBtn.addEventListener('click', () => {
        if (records.length === 0) {
            showToast('No records to export', 'error');
            return;
        }
        
        showToast('Exporting records to CSV...', 'success');
        // Add actual CSV export logic here
    });

    // Refresh functionality
    refreshBtn.addEventListener('click', () => {
        showToast('Refreshing records...', 'info');
        
        // Reset filters
        searchInput.value = '';
        filterZone.value = '';
        filterBarangay.value = '';
        filterAssistance.value = '';
        filterDateRange.value = '';
        filterStatus.value = '';
        
        renderRecords(records);
    });

    // Date range filter (placeholder)
    filterDateRange.addEventListener('click', () => {
        showToast('Date range picker coming soon', 'info');
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('user');
            ipcRenderer.send('navigate', 'login.html');
        }
    });

    // Other buttons
    notificationBtn.addEventListener('click', () => {
        showToast('You have 3 new notifications', 'info');
    });

    settingsBtn.addEventListener('click', () => {
        showToast('Settings panel coming soon', 'info');
    });

    helpBtn.addEventListener('click', () => {
        showToast('Need help? Contact IT support at support@manila.gov.ph', 'info');
    });

    // Helper functions
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
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

    // Make action functions global
    window.viewRecord = function(id) {
        const record = records.find(r => r.id === id);
        if (record) {
            showToast(`Viewing record for ${record.solicitor}`, 'info');
            // Add view logic here
        }
    };

    window.editRecord = function(id) {
        const record = records.find(r => r.id === id);
        if (record) {
            showToast(`Editing record for ${record.solicitor}`, 'info');
            // Add edit logic here
        }
    };

    window.deleteRecord = function(id) {
        const record = records.find(r => r.id === id);
        if (record && confirm(`Delete record for ${record.solicitor}?`)) {
            records = records.filter(r => r.id !== id);
            renderRecords(records);
            showToast('Record deleted successfully', 'success');
        }
    };
});
