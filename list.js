// Barangay Directory (List) functionality
const Toastify = require('toastify-js');
require('toastify-js/src/toastify.css');
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const logoutBtn = document.getElementById('logoutBtn');
    const notificationBtn = document.getElementById('notificationBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const helpBtn = document.getElementById('helpBtn');
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('tableBody');
    const tableWrapper = document.getElementById('tableWrapper');
    const emptyState = document.getElementById('emptyState');
    const recordCount = document.getElementById('recordCount');
    const contactsCount = document.getElementById('contactsCount');
    const pageButtons = document.getElementById('pageButtons');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const addContactBtn = document.getElementById('addContactBtn');

    // Sample data
    let records = [
        { zone: 'Zone 1', barangay: 'Barangay 645', current: 'Juan Dela Cruz', initials: 'JDC', former: 'Pedro Santos', phone: '+63 912 345 6789' },
        { zone: 'Zone 1', barangay: 'Barangay 652', current: 'Maria Garcia', initials: 'MG', former: 'Ana Reyes', phone: '+63 923 456 7890' },
        { zone: 'Zone 2', barangay: 'Barangay 756', current: 'Jose Ramos', initials: 'JR', former: 'Luis Martinez', phone: '+63 934 567 8901' },
        { zone: 'Zone 3', barangay: 'Barangay 765', current: 'Cynthia Cruz', initials: 'CC', former: 'Mario Santos', phone: '+63 915 222 3344' },
        { zone: 'Zone 4', barangay: 'Barangay 771', current: 'Leo Diaz', initials: 'LD', former: 'Mark Reyes', phone: '+63 917 555 6677' },
        { zone: 'Zone 4', barangay: 'Barangay 780', current: 'Iris Tan', initials: 'IT', former: 'Dino Cruz', phone: '+63 918 123 4567' }
    ];

    let filtered = [...records];
    const pageSize = 5;
    let currentPage = 1;

    render();

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
                ipcRenderer.send('navigate', 'summary.html');
            } else if (page === 'list') {
                // Already here
            } else {
                showToast(`${page} page coming soon`, 'info');
            }
        });
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filtered = records.filter(r =>
            r.zone.toLowerCase().includes(term) ||
            r.barangay.toLowerCase().includes(term) ||
            r.current.toLowerCase().includes(term) ||
            r.former.toLowerCase().includes(term) ||
            r.phone.toLowerCase().includes(term)
        );
        currentPage = 1;
        render();
    });

    // Pagination
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            render();
        }
    });

    nextBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(filtered.length / pageSize) || 1;
        if (currentPage < maxPage) {
            currentPage += 1;
            render();
        }
    });

    addContactBtn.addEventListener('click', () => {
        showToast('Add contact flow coming soon', 'info');
    });

    function render() {
        const maxPage = Math.ceil(filtered.length / pageSize) || 1;
        currentPage = Math.min(currentPage, maxPage);

        const start = (currentPage - 1) * pageSize;
        const pageData = filtered.slice(start, start + pageSize);

        recordCount.textContent = `Showing ${filtered.length} barangay records`;
        contactsCount.textContent = `Total contacts: ${filtered.length}`;

        if (!pageData.length) {
            tableWrapper.classList.add('hidden');
            emptyState.classList.add('show');
        } else {
            tableWrapper.classList.remove('hidden');
            emptyState.classList.remove('show');
        }

        tableBody.innerHTML = pageData.map(r => `
            <tr>
                <td>${r.zone}</td>
                <td>${r.barangay}</td>
                <td>
                    <div class="name-pill">
                        <span class="avatar">${r.initials}</span>
                        <span>${r.current}</span>
                    </div>
                </td>
                <td>${r.former}</td>
                <td><a class="contact-link" href="tel:${r.phone.replace(/[^0-9+]/g,'')}">${r.phone}</a></td>
                <td>
                    <div class="action-links">
                        <a class="action-link" href="#">View</a>
                        <a class="action-link" href="#">Edit</a>
                    </div>
                </td>
            </tr>
        `).join('');

        renderPager(maxPage);
    }

    function renderPager(maxPage) {
        pageButtons.innerHTML = '';
        for (let i = 1; i <= maxPage; i++) {
            const btn = document.createElement('button');
            btn.className = `page-chip ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                currentPage = i;
                render();
            });
            pageButtons.appendChild(btn);
        }
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === maxPage;
    }

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
