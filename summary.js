// Summary page functionality
const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof window.applyShellLayoutParity === 'function') {
            window.applyShellLayoutParity();
        }

        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');

        function hydrateUserProfile() {
            let sessionUser = null;
            try {
                sessionUser = JSON.parse(localStorage.getItem('user') || 'null');
            } catch (error) {
                sessionUser = null;
            }

            const displayName = String(sessionUser?.username || sessionUser?.name || 'Admin User').trim() || 'Admin User';
            const displayRole = String(sessionUser?.role || 'Administrator').trim() || 'Administrator';

            if (userNameEl) userNameEl.textContent = displayName;
            if (userRoleEl) userRoleEl.textContent = displayRole;
        }

        hydrateUserProfile();

        const navItems = document.querySelectorAll('.nav-item');
        const logoutBtn = document.getElementById('logoutBtn');
        const summaryValueTypeSelect = document.getElementById('summaryValueTypeSelect');
        const summaryPeriodSelect = document.getElementById('summaryPeriodSelect');

        const STORAGE_KEYS = {
            amount: 'solicitationAmountRecords',
            item: 'solicitationItemRecords'
        };

        let currentValueType = summaryValueTypeSelect?.value === 'item' ? 'item' : 'amount';
        let currentPeriod = summaryPeriodSelect?.value || 'today';

        // Page map for navigation
        const pageMap = {
            'dashboard': 'dashboard.html',
            'new-solicitation': 'new-solicitation.html',
            'records': 'records.html',
            'reports': 'reports.html',
            'summary': 'summary.html',
            'list': 'list.html'
        };

        const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'];
        const tooltip = createDonutTooltip();

        renderSummary();

        if (summaryValueTypeSelect) {
            summaryValueTypeSelect.addEventListener('change', () => {
                currentValueType = summaryValueTypeSelect.value === 'item' ? 'item' : 'amount';
                renderSummary();
            });
        }

        if (summaryPeriodSelect) {
            summaryPeriodSelect.addEventListener('change', () => {
                currentPeriod = summaryPeriodSelect.value || 'today';
                renderSummary();
            });
        }

        // Navigation
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (!page) return;

                // If already on this page, just update active state
                if (page === 'summary') {
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
                    showToast(`${page} page coming soon`, 'info');
                }
            });
        });

        // Header buttons
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    localStorage.removeItem('user');
                    ipcRenderer.send('navigate', 'login.html');
                }
            });
        }

    // Helpers
    function renderSummary() {
        const records = loadSummaryRecords();

        const barangayMap = {};
        records.forEach(record => {
            if (record && record.barangay) {
                if (!barangayMap[record.barangay]) {
                    barangayMap[record.barangay] = 0;
                }
                barangayMap[record.barangay] += getRecordMetricValue(record);
            }
        });

        const barangayData = Object.entries(barangayMap)
            .map(([label, amount], index) => ({ label, amount, color: colors[index % colors.length] }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 8);

        const categoryMap = {};
        records.forEach(record => {
            if (record && record.assistance) {
                if (!categoryMap[record.assistance]) {
                    categoryMap[record.assistance] = 0;
                }
                categoryMap[record.assistance] += getRecordMetricValue(record);
            }
        });

        const categoryData = Object.entries(categoryMap)
            .map(([label, amount], index) => ({ label, amount, color: colors[index % colors.length] }))
            .sort((a, b) => b.amount - a.amount);

        const personMap = {};
        records.forEach(record => {
            if (record) {
                const person = record.solicitor || 'N/A';
                if (!personMap[person]) {
                    personMap[person] = 0;
                }
                personMap[person] += getRecordMetricValue(record);
            }
        });

        const personData = Object.entries(personMap)
            .map(([label, amount], index) => ({ label, amount, color: colors[index % colors.length] }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 8);

        if (document.getElementById('donutBarangay')) {
            buildDonut('donutBarangay', 'legendBarangay', 'sumBarangay', 'sumBarangayTotal', barangayData, tooltip);
        }
        if (document.getElementById('donutCategory')) {
            buildDonut('donutCategory', 'legendCategory', 'sumCategory', 'sumCategoryTotal', categoryData, tooltip);
        }
        if (document.getElementById('donutPerson')) {
            buildDonut('donutPerson', 'legendPerson', 'sumPerson', 'sumPersonTotal', personData, tooltip);
        }

        updateHighlights(barangayData, categoryData);
    }

    function loadSummaryRecords() {
        try {
            const key = currentValueType === 'item' ? STORAGE_KEYS.item : STORAGE_KEYS.amount;
            const records = JSON.parse(localStorage.getItem(key) || '[]');
            const allRecords = Array.isArray(records) ? records : [];

            return allRecords.filter(record => isRecordInPeriod(record, currentPeriod));
        } catch (e) {
            console.error('Error parsing summary records:', e);
            return [];
        }
    }

    function isRecordInPeriod(record, period) {
        if (!record) {
            return false;
        }

        try {
            // Try to get date from record - handle various date field names
            const dateStr = record.date || record.createdAt || record.created;

            if (!dateStr) {
                // Strict filter: undated records should not appear in today/month/year views.
                return false;
            }

            // Parse the date - handle both ISO strings and YYYY-MM-DD format
            let recordDate;
            if (typeof dateStr === 'string' && dateStr.includes('-')) {
                // Parse YYYY-MM-DD format
                const parts = dateStr.split('T')[0].split('-');
                if (parts.length === 3) {
                    const [year, month, day] = parts.map(Number);
                    recordDate = new Date(year, month - 1, day);
                    recordDate.setHours(0, 0, 0, 0);
                } else {
                    return false;
                }
            } else {
                recordDate = new Date(dateStr);
                recordDate.setHours(0, 0, 0, 0);
            }

            // Invalid date should not match any period.
            if (isNaN(recordDate.getTime())) {
                return false;
            }

            // Get today's date in local timezone
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (period === 'today') {
                return recordDate.getTime() === today.getTime();
            } else if (period === 'month') {
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
            } else if (period === 'year') {
                const currentYear = today.getFullYear();
                return recordDate.getFullYear() === currentYear;
            }

            return true;
        } catch (e) {
            console.error('Error filtering by period:', e);
            return false;
        }
    }

    function getRecordMetricValue(record) {
        if (currentValueType === 'item') {
            return parseItemQuantity(record?.item);
        }
        return parseFloat(record?.amount) || 0;
    }

    function buildDonut(donutId, legendId, totalId, footerId, data, tooltipEl) {
        if (!data || data.length === 0) {
            console.warn(`No data for donut: ${donutId}`);
            const donut = document.getElementById(donutId);
            const legend = document.getElementById(legendId);
            const totalEl = document.getElementById(totalId);
            if (totalEl) totalEl.textContent = formatDisplay(0);
            const footerEl = document.getElementById(footerId);
            if (footerEl) footerEl.textContent = formatDisplay(0);

            // Reset chart visuals so previous filter results do not remain visible.
            if (donut) {
                donut.style.background = '#E5E7EB';
            }

            if (legend) {
                legend.innerHTML = '';
            }

            if (tooltipEl) {
                hideTooltip(tooltipEl);
            }
            return;
        }
        
        const total = data.reduce((sum, item) => sum + item.amount, 0);
        const donut = document.getElementById(donutId);
        const legend = document.getElementById(legendId);
        const totalEl = document.getElementById(totalId);
        const footerEl = document.getElementById(footerId);

        if (!donut || !legend || !totalEl) {
            console.warn(`Missing elements for donut: ${donutId}`);
            return;
        }

        totalEl.textContent = formatDisplay(total);
        if (footerEl) {
            footerEl.textContent = formatDisplay(total);
        }

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
        legend.innerHTML = data.map((item, index) => `
            <div class="legend-item" data-index="${index}">
                <div class="legend-left">
                    <span class="dot" style="background:${item.color}"></span>
                    <span>${item.label}</span>
                </div>
                <span class="legend-amount">${formatDisplay(item.amount)}</span>
            </div>
        `).join('');

        attachDonutTooltip(donut, data, total, tooltipEl);
        attachLegendTooltip(legend, data, tooltipEl);
    }

    function attachDonutTooltip(donutEl, data, total, tooltipEl) {
        if (!donutEl || !tooltipEl) {
            return;
        }

        const ranges = [];
        let currentDeg = 0;
        data.forEach(item => {
            const slice = (item.amount / total) * 360;
            const start = currentDeg;
            const end = currentDeg + slice;
            ranges.push({ start, end, item });
            currentDeg = end;
        });

        donutEl.addEventListener('mousemove', (event) => {
            const rect = donutEl.getBoundingClientRect();
            const x = event.clientX - rect.left - rect.width / 2;
            const y = event.clientY - rect.top - rect.height / 2;

            const distance = Math.sqrt(x * x + y * y);
            const outerRadius = rect.width / 2;
            const innerRadius = outerRadius - 28;

            if (distance < innerRadius || distance > outerRadius) {
                donutEl.style.cursor = 'default';
                hideTooltip(tooltipEl);
                return;
            }

            let angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
            if (angle < 0) {
                angle += 360;
            }

            // Adjust for the donut's -90deg rotation so hover aligns with slices.
            angle = (angle + 90) % 360;

            const match = ranges.find(range => angle >= range.start && angle < range.end);
            if (!match) {
                donutEl.style.cursor = 'default';
                hideTooltip(tooltipEl);
                return;
            }

            donutEl.style.cursor = 'pointer';
            tooltipEl.innerHTML = `${match.item.label}<br>${formatDisplay(match.item.amount)}`;
            tooltipEl.style.left = `${event.clientX + 12}px`;
            tooltipEl.style.top = `${event.clientY + 12}px`;
            tooltipEl.classList.add('show');
        });

        donutEl.addEventListener('mouseleave', () => {
            donutEl.style.cursor = 'default';
            hideTooltip(tooltipEl);
        });
    }

    function createDonutTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'donut-tooltip';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    function attachLegendTooltip(legendEl, data, tooltipEl) {
        if (!legendEl || !tooltipEl) {
            return;
        }

        legendEl.addEventListener('mousemove', (event) => {
            const itemEl = event.target.closest('.legend-item');
            if (!itemEl) {
                hideTooltip(tooltipEl);
                return;
            }

            const index = Number(itemEl.dataset.index);
            const item = Number.isFinite(index) ? data[index] : null;
            if (!item) {
                hideTooltip(tooltipEl);
                return;
            }

            tooltipEl.innerHTML = `${item.label}<br>${formatDisplay(item.amount)}`;
            tooltipEl.style.left = `${event.clientX + 12}px`;
            tooltipEl.style.top = `${event.clientY + 12}px`;
            tooltipEl.classList.add('show');
        });

        legendEl.addEventListener('mouseleave', () => {
            hideTooltip(tooltipEl);
        });
    }

    function hideTooltip(tooltipEl) {
        tooltipEl.classList.remove('show');
    }

    function updateHighlights(barangayData, categoryData) {
        const topBrgy = maxItem(barangayData);
        const topCat = maxItem(categoryData);

        const topBarangayEl = document.getElementById('topBarangay');
        const topBarangayAmountEl = document.getElementById('topBarangayAmount');
        const topCategoryEl = document.getElementById('topCategory');
        const topCategoryAmountEl = document.getElementById('topCategoryAmount');
        const overallTotalEl = document.getElementById('overallTotal');

        if (topBarangayEl) topBarangayEl.textContent = topBrgy.label;
        if (topBarangayAmountEl) topBarangayAmountEl.textContent = formatDisplay(topBrgy.amount);
        if (topCategoryEl) topCategoryEl.textContent = topCat.label;
        if (topCategoryAmountEl) topCategoryAmountEl.textContent = formatDisplay(topCat.amount);

        const overall = sumAll(barangayData);
        if (overallTotalEl) overallTotalEl.textContent = formatDisplay(overall);
    }

    function maxItem(arr) {
        if (!arr || arr.length === 0) {
            return { label: 'N/A', amount: 0 };
        }
        return arr.reduce((max, item) => item.amount > max.amount ? item : max, arr[0]);
    }

    function sumAll(arr) {
        if (!arr || arr.length === 0) {
            return 0;
        }
        return arr.reduce((sum, item) => sum + item.amount, 0);
    }

    function formatDisplay(val) {
        if (currentValueType === 'item') {
            return Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
        return `₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
    }

    function parseItemQuantity(value) {
        const normalized = String(value || '')
            .replace(/,/g, '')
            .trim();
        const numeric = Number(normalized);
        return Number.isFinite(numeric) ? numeric : 0;
    }

    function showToast(message, type = 'info') {
        try {
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
        } catch (e) {
            console.error('Toast error:', e);
        }
    }
    } catch (error) {
        console.error('Critical error in summary.js:', error);
        document.body.innerHTML = '<div style="padding: 20px; color: red;">Error loading page. Please check console for details.</div>';
    }
});
