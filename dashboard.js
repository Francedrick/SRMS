// Dashboard functionality
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const logoutBtn = document.getElementById('logoutBtn');
    const ctaGetStarted = document.getElementById('ctaGetStarted');
    const mostRequestedRange = document.getElementById('mostRequestedRange');
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    const STORAGE_KEYS_TO_WATCH = new Set([
        'solicitationRecords',
        'solicitationAmountRecords',
        'solicitationItemRecords'
    ]);
    let dashboardRefreshIntervalId = null;

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
    hydrateUserProfile();
    loadDashboardStats();
    updateCurrentDate();
    setupRealtimeDashboardUpdates();

    if (mostRequestedRange) {
        mostRequestedRange.addEventListener('change', () => {
            loadDashboardStats();
        });
    }

    function hydrateUserProfile() {
        let sessionUser = null;
        try {
            sessionUser = JSON.parse(localStorage.getItem('user') || 'null');
        } catch (error) {
            sessionUser = null;
        }

        if (!sessionUser || typeof sessionUser !== 'object') {
            sessionUser = {
                username: 'Admin User',
                role: 'Administrator',
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('user', JSON.stringify(sessionUser));
        }

        const displayName = String(sessionUser.username || sessionUser.name || 'Admin User').trim() || 'Admin User';
        const displayRole = String(sessionUser.role || 'Administrator').trim() || 'Administrator';

        if (userNameEl) {
            userNameEl.textContent = displayName;
        }
        if (userRoleEl) {
            userRoleEl.textContent = displayRole;
        }
    }

    function setupRealtimeDashboardUpdates() {
        const refreshDashboard = () => {
            loadDashboardStats();
            updateCurrentDate();
        };

        // Updates when another window/tab writes to localStorage.
        window.addEventListener('storage', (event) => {
            if (event && STORAGE_KEYS_TO_WATCH.has(event.key)) {
                refreshDashboard();
            }
        });

        // Keep data current even if updates happen from non-storage event sources.
        dashboardRefreshIntervalId = window.setInterval(refreshDashboard, 3000);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                refreshDashboard();
            }
        });

        window.addEventListener('focus', refreshDashboard);
        window.addEventListener('beforeunload', () => {
            if (dashboardRefreshIntervalId !== null) {
                window.clearInterval(dashboardRefreshIntervalId);
            }
        });
    }

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

    function getRangeBounds(rangeKey, referenceDate = new Date()) {
        const currentStart = new Date(referenceDate);
        const currentEnd = new Date(referenceDate);
        const previousStart = new Date(referenceDate);
        const previousEnd = new Date(referenceDate);

        if (rangeKey === 'today') {
            currentStart.setHours(0, 0, 0, 0);
            currentEnd.setTime(currentStart.getTime() + 24 * 60 * 60 * 1000);
            previousEnd.setTime(currentStart.getTime());
            previousStart.setTime(previousEnd.getTime() - 24 * 60 * 60 * 1000);
            return { currentStart, currentEnd, previousStart, previousEnd, label: 'day' };
        }

        if (rangeKey === 'year') {
            currentStart.setMonth(0, 1);
            currentStart.setHours(0, 0, 0, 0);
            currentEnd.setFullYear(currentStart.getFullYear() + 1, 0, 1);
            currentEnd.setHours(0, 0, 0, 0);
            previousStart.setFullYear(currentStart.getFullYear() - 1, 0, 1);
            previousStart.setHours(0, 0, 0, 0);
            previousEnd.setTime(currentStart.getTime());
            return { currentStart, currentEnd, previousStart, previousEnd, label: 'year' };
        }

        currentStart.setDate(1);
        currentStart.setHours(0, 0, 0, 0);
        currentEnd.setMonth(currentStart.getMonth() + 1, 1);
        currentEnd.setHours(0, 0, 0, 0);
        previousStart.setMonth(currentStart.getMonth() - 1, 1);
        previousStart.setHours(0, 0, 0, 0);
        previousEnd.setTime(currentStart.getTime());

        return { currentStart, currentEnd, previousStart, previousEnd, label: 'month' };
    }

    function sumItemQuantitiesByAssistance(records) {
        const itemMap = {};
        records.forEach(record => {
            const itemKey = String(record.assistance || 'N/A').trim() || 'N/A';
            if (!itemMap[itemKey]) {
                itemMap[itemKey] = 0;
            }
            itemMap[itemKey] += parseItemQuantity(record.item);
        });
        return itemMap;
    }

    function computePercentChange(currentValue, previousValue) {
        const current = Number(currentValue) || 0;
        const previous = Number(previousValue) || 0;

        if (previous <= 0 && current <= 0) {
            return 0;
        }
        if (previous <= 0 && current > 0) {
            return 100;
        }

        return ((current - previous) / previous) * 100;
    }

    function animateMostRequestedQuantity(element, nextValue) {
        if (!element) {
            return;
        }

        const targetValue = Math.max(0, Number(nextValue) || 0);
        const startValue = Number(element.dataset.rawValue || 0);

        if (element._countAnimationFrameId) {
            window.cancelAnimationFrame(element._countAnimationFrameId);
        }

        if (startValue === targetValue) {
            element.textContent = targetValue.toLocaleString('en-US');
            element.dataset.rawValue = String(targetValue);
            return;
        }

        const durationMs = 550;
        const startedAt = performance.now();
        const delta = targetValue - startValue;
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const updateFrame = (now) => {
            const elapsed = now - startedAt;
            const progress = Math.min(elapsed / durationMs, 1);
            const eased = easeOutCubic(progress);
            const currentValue = Math.round(startValue + (delta * eased));

            element.textContent = currentValue.toLocaleString('en-US');

            if (progress < 1) {
                element._countAnimationFrameId = window.requestAnimationFrame(updateFrame);
            } else {
                element.dataset.rawValue = String(targetValue);
                element._countAnimationFrameId = null;
            }
        };

        element.dataset.rawValue = String(targetValue);
        element._countAnimationFrameId = window.requestAnimationFrame(updateFrame);
    }

    function animateMostRequestedItemName(element, labelText) {
        if (!element) {
            return;
        }

        const nextLabel = String(labelText || 'N/A');
        const previousLabel = element.textContent;
        element.textContent = nextLabel;

        if (previousLabel !== nextLabel) {
            element.classList.remove('item-switch');
            void element.offsetWidth;
            element.classList.add('item-switch');
        }
    }

    function updateMostRequestedItem(itemRecords) {
        const mostRequestedItemEl = document.getElementById('mostRequestedItem');
        const mostRequestedItemQtyEl = document.getElementById('mostRequestedItemQty');
        const mostRequestedProgressEl = document.getElementById('mostRequestedProgress');
        if (!mostRequestedItemEl || !mostRequestedItemQtyEl) {
            return;
        }

        const selectedRange = mostRequestedRange ? mostRequestedRange.value : 'month';
        const rangeBounds = getRangeBounds(selectedRange, new Date());
        const hasValidDate = (recordDate) => Number.isFinite(recordDate.getTime());
        const isWithin = (recordDate, start, end) => recordDate >= start && recordDate < end;

        const sourceRecords = Array.isArray(itemRecords) ? itemRecords : [];
        const currentRangeRecords = sourceRecords.filter(record => {
            const recordDate = new Date(record.date);
            return hasValidDate(recordDate) && isWithin(recordDate, rangeBounds.currentStart, rangeBounds.currentEnd);
        });

        const previousRangeRecords = sourceRecords.filter(record => {
            const recordDate = new Date(record.date);
            return hasValidDate(recordDate) && isWithin(recordDate, rangeBounds.previousStart, rangeBounds.previousEnd);
        });

        if (currentRangeRecords.length === 0) {
            animateMostRequestedItemName(mostRequestedItemEl, 'N/A');
            animateMostRequestedQuantity(mostRequestedItemQtyEl, 0);
            if (mostRequestedProgressEl) {
                mostRequestedProgressEl.style.width = '0%';
            }
            return;
        }

        const currentItemMap = sumItemQuantitiesByAssistance(currentRangeRecords);

        const topItemEntry = Object.entries(currentItemMap).sort((a, b) => b[1] - a[1])[0];
        if (!topItemEntry) {
            animateMostRequestedItemName(mostRequestedItemEl, 'N/A');
            animateMostRequestedQuantity(mostRequestedItemQtyEl, 0);
            if (mostRequestedProgressEl) {
                mostRequestedProgressEl.style.width = '0%';
            }
            return;
        }

        animateMostRequestedItemName(mostRequestedItemEl, topItemEntry[0]);
        animateMostRequestedQuantity(mostRequestedItemQtyEl, topItemEntry[1]);

        const previousItemMap = sumItemQuantitiesByAssistance(previousRangeRecords);
        const previousQuantity = previousItemMap[topItemEntry[0]] || 0;
        const currentQuantity = topItemEntry[1];
        const changePercent = computePercentChange(currentQuantity, previousQuantity);

        if (mostRequestedProgressEl) {
            const progressWidth = Math.min(Math.abs(changePercent), 100);
            mostRequestedProgressEl.style.width = `${progressWidth}%`;
        }
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

});
