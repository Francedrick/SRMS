// Summary page functionality
const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');
require('toastify-js/src/toastify.css');

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const logoutBtn = document.getElementById('logoutBtn');
    const notificationBtn = document.getElementById('notificationBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const helpBtn = document.getElementById('helpBtn');

    // Sample aggregated data
    const barangayData = [
        { label: 'Barangay 645', amount: 258946, color: '#3B82F6' },
        { label: 'Barangay 765', amount: 256888, color: '#F59E0B' },
        { label: 'Barangay 652', amount: 257028, color: '#10B981' },
        { label: 'Barangay 756', amount: 272860, color: '#EF4444' },
        { label: 'Barangay 751', amount: 586124, color: '#8B5CF6' }
    ];

    const categoryData = [
        { label: 'Financial Aid', amount: 458946, color: '#3B82F6' },
        { label: 'Medical', amount: 356888, color: '#F59E0B' },
        { label: 'Educational', amount: 257028, color: '#10B981' },
        { label: 'Housing', amount: 172860, color: '#EF4444' },
        { label: 'Relief', amount: 339137, color: '#8B5CF6' }
    ];

    const personData = [
        { label: 'Juan Dela Cruz', amount: 358946, color: '#3B82F6' },
        { label: 'Maria Santos', amount: 256888, color: '#F59E0B' },
        { label: 'Pedro Reyes', amount: 357028, color: '#10B981' },
        { label: 'Ana Garcia', amount: 272860, color: '#EF4444' },
        { label: 'Luis Ramos', amount: 364137, color: '#8B5CF6' }
    ];

    buildDonut('donutBarangay', 'legendBarangay', 'sumBarangay', barangayData);
    buildDonut('donutCategory', 'legendCategory', 'sumCategory', categoryData);
    buildDonut('donutPerson', 'legendPerson', 'sumPerson', personData);

    updateHighlights();

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
                ipcRenderer.send('navigate', 'reports.html');
            } else if (page === 'summary') {
                // Already here
            } else if (page === 'list') {
                ipcRenderer.send('navigate', 'list.html');
            } else {
                showToast(`${page} page coming soon`, 'info');
            }
        });
    });

    // Header buttons
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('user');
            ipcRenderer.send('navigate', 'login.html');
        }
    });

    notificationBtn.addEventListener('click', () => showToast('You have 3 new notifications', 'info'));
    settingsBtn.addEventListener('click', () => showToast('Settings panel coming soon', 'info'));
    helpBtn.addEventListener('click', () => showToast('Need help? Contact IT support at support@manila.gov.ph', 'info'));

    // Helpers
    function buildDonut(donutId, legendId, totalId, data) {
        const total = data.reduce((sum, item) => sum + item.amount, 0);
        const donut = document.getElementById(donutId);
        const legend = document.getElementById(legendId);
        const totalEl = document.getElementById(totalId);

        totalEl.textContent = formatCurrency(total);

        // Build conic gradient
        let currentDeg = 0;
        const segments = data.map(item => {
            const slice = (item.amount / total) * 360;
            const start = currentDeg;
            const end = currentDeg + slice;
            currentDeg = end;
            return `${item.color} ${start}deg ${end}deg`;
        }).join(', ');

        donut.style.background = `conic-gradient(${segments})`;

        // Legend
        legend.innerHTML = data.map(item => `
            <div class="legend-item">
                <div class="legend-left">
                    <span class="dot" style="background:${item.color}"></span>
                    <span>${item.label}</span>
                </div>
                <span class="legend-amount">${formatCurrency(item.amount)}</span>
            </div>
        `).join('');
    }

    function updateHighlights() {
        const topBrgy = maxItem(barangayData);
        const topCat = maxItem(categoryData);

        document.getElementById('topBarangay').textContent = topBrgy.label;
        document.getElementById('topBarangayAmount').textContent = formatCurrency(topBrgy.amount);
        document.getElementById('topCategory').textContent = topCat.label;
        document.getElementById('topCategoryAmount').textContent = formatCurrency(topCat.amount);

        const overall = sumAll(barangayData); // using barangay as aggregate reference
        document.getElementById('overallTotal').textContent = formatCurrency(overall);
    }

    function maxItem(arr) {
        return arr.reduce((max, item) => item.amount > max.amount ? item : max, arr[0]);
    }

    function sumAll(arr) {
        return arr.reduce((sum, item) => sum + item.amount, 0);
    }

    function formatCurrency(val) {
        return `₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
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
