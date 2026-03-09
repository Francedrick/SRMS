// Dashboard functionality
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const logoutBtn = document.getElementById('logoutBtn');
    const ctaGetStarted = document.getElementById('ctaGetStarted');
    const helpBtn = document.getElementById('helpBtn');

    // Page map for navigation
    const pageMap = {
        'dashboard': 'dashboard.html',
        'new-solicitation': 'new-solicitation.html',
        'records': 'records.html',
        'reports': 'reports.html',
        'summary': 'summary.html',
        'list': 'list.html'
    };

    // Load and display statistics
    loadDashboardStats();
    updateCurrentDate();

    function updateCurrentDate() {
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            dateElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    function loadDashboardStats() {
        try {
            // Load records from localStorage
            const records = JSON.parse(localStorage.getItem('solicitationRecords') || '[]');
            const amountRecords = JSON.parse(localStorage.getItem('solicitationAmountRecords') || '[]');
            const itemRecords = JSON.parse(localStorage.getItem('solicitationItemRecords') || '[]');
            
            if (!Array.isArray(records)) {
                console.error('Records is not an array');
                return;
            }

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Calculate today's total solicitations
            const todayTotal = records
                .filter(record => {
                    const recordDate = new Date(record.date);
                    const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
                    return recordDay.getTime() === today.getTime();
                })
                .reduce((sum, record) => sum + (parseFloat(record.amount) || 0), 0);

            // Calculate this month's total
            const thisMonthTotal = records
                .filter(record => {
                    const recordDate = new Date(record.date);
                    return recordDate.getMonth() === currentMonth && 
                           recordDate.getFullYear() === currentYear;
                })
                .reduce((sum, record) => sum + (parseFloat(record.amount) || 0), 0);

            // Calculate this year's total
            const thisYearTotal = records
                .filter(record => {
                    const recordDate = new Date(record.date);
                    return recordDate.getFullYear() === currentYear;
                })
                .reduce((sum, record) => sum + (parseFloat(record.amount) || 0), 0);

            // Count today's requests
            const todayRequestCount = records
                .filter(record => {
                    const recordDate = new Date(record.date);
                    const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
                    return recordDay.getTime() === today.getTime();
                })
                .length;

            // Update DOM
            updateStatCard(0, todayTotal);
            updateStatCard(1, thisMonthTotal);
            updateStatCard(2, todayRequestCount, false); // false = don't format as currency
            updateStatCard(3, thisYearTotal);
            updateMostRequestedItem(Array.isArray(itemRecords) ? itemRecords : []);
            updateRecentRecords(
                Array.isArray(amountRecords) ? amountRecords : [],
                Array.isArray(itemRecords) ? itemRecords : []
            );

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    function parseItemQuantity(value) {
        const normalized = String(value || '').replace(/,/g, '').trim();
        const numeric = Number(normalized);
        return Number.isFinite(numeric) ? numeric : 0;
    }

    function updateMostRequestedItem(itemRecords) {
        const mostRequestedItemEl = document.getElementById('mostRequestedItem');
        const mostRequestedItemQtyEl = document.getElementById('mostRequestedItemQty');
        if (!mostRequestedItemEl || !mostRequestedItemQtyEl) {
            return;
        }

        if (!Array.isArray(itemRecords) || itemRecords.length === 0) {
            mostRequestedItemEl.textContent = 'N/A';
            mostRequestedItemQtyEl.textContent = '0 total quantity';
            return;
        }

        const itemMap = {};
        itemRecords.forEach(record => {
            const itemKey = String(record.assistance || 'N/A').trim() || 'N/A';
            if (!itemMap[itemKey]) {
                itemMap[itemKey] = 0;
            }
            itemMap[itemKey] += parseItemQuantity(record.item);
        });

        const topItemEntry = Object.entries(itemMap).sort((a, b) => b[1] - a[1])[0];
        if (!topItemEntry) {
            mostRequestedItemEl.textContent = 'N/A';
            mostRequestedItemQtyEl.textContent = '0 total quantity';
            return;
        }

        mostRequestedItemEl.textContent = topItemEntry[0];
        mostRequestedItemQtyEl.textContent = `${topItemEntry[1].toLocaleString('en-US')} total quantity`;
    }

    function updateRecentRecords(amountRecords, itemRecords) {
        const recentRecordsBody = document.getElementById('recentRecordsBody');
        if (!recentRecordsBody) {
            return;
        }

        const mergedMap = new Map();

        const upsertRecord = (record, valueType) => {
            const hasSourceRecordId = record.sourceRecordId !== null && record.sourceRecordId !== undefined;
            const recordKey = hasSourceRecordId
                ? `source-${record.sourceRecordId}`
                : `${valueType}-${record.id}`;

            if (!mergedMap.has(recordKey)) {
                mergedMap.set(recordKey, {
                    date: record.date,
                    assistance: record.assistance,
                    zone: record.zone,
                    barangay: record.barangay,
                    amount: null,
                    itemQuantity: 0
                });
            }

            const existing = mergedMap.get(recordKey);
            existing.date = record.date || existing.date;
            existing.assistance = record.assistance || existing.assistance;
            existing.zone = record.zone || existing.zone;
            existing.barangay = record.barangay || existing.barangay;

            if (valueType === 'amount') {
                const numericAmount = Number(record.amount);
                existing.amount = Number.isFinite(numericAmount) ? numericAmount : null;
            }

            if (valueType === 'item') {
                existing.itemQuantity = parseItemQuantity(record.item);
            }
        };

        if (Array.isArray(amountRecords)) {
            amountRecords.forEach(record => upsertRecord(record, 'amount'));
        }

        if (Array.isArray(itemRecords)) {
            itemRecords.forEach(record => upsertRecord(record, 'item'));
        }

        const combined = Array.from(mergedMap.values());

        if (combined.length === 0) {
            recentRecordsBody.innerHTML = '<tr><td colspan="5" class="recent-empty">No records yet</td></tr>';
            return;
        }

        const recentRows = [...combined]
            .sort((first, second) => {
                const firstDate = new Date(first.date).getTime();
                const secondDate = new Date(second.date).getTime();
                return secondDate - firstDate;
            })
            .slice(0, 5);

        recentRecordsBody.innerHTML = recentRows.map(record => {
            const recordDate = new Date(record.date);
            const dateText = Number.isNaN(recordDate.getTime())
                ? 'N/A'
                : recordDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const hasAmount = record.amount !== null && record.amount !== undefined && Number.isFinite(Number(record.amount));
            const amountText = hasAmount
                ? `₱${Number(record.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : 'N/A';
            const itemQuantity = Number(record.itemQuantity) || 0;
            const itemText = itemQuantity > 0 ? itemQuantity.toLocaleString('en-US') : '0';
            const valueText = hasAmount && itemQuantity > 0
                ? `${amountText} + ${itemText}`
                : hasAmount
                    ? amountText
                    : itemText;

            return `
                <tr>
                    <td>${dateText}</td>
                    <td>${record.assistance || 'N/A'}</td>
                    <td>${record.zone || 'N/A'}</td>
                    <td>${record.barangay || 'N/A'}</td>
                    <td>${valueText}</td>
                </tr>
            `;
        }).join('');
    }

    function updateStatCard(index, value, isCurrency = true) {
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards[index]) {
            const valueElement = statCards[index].querySelector('.stat-value');
            if (valueElement) {
                if (isCurrency) {
                    valueElement.textContent = '₱' + value.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                } else {
                    valueElement.textContent = value.toLocaleString('en-US');
                }
            }
        }
    }

    // Navigation items click
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const page = item.dataset.page;
            if (!page) return;
            
            // If already on this page, just update active state
            if (page === 'dashboard') {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                return;
            }
            
            // Navigate to the page
            const targetPage = pageMap[page];
            if (targetPage) {
                console.log('Navigating to:', targetPage);
                ipcRenderer.send('navigate', targetPage);
            } else {
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
