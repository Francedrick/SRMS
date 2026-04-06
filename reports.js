// Reports page functionality
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
        const filterZone = document.getElementById('filterZone');
        const filterBarangay = document.getElementById('filterBarangay');
        const filterDateFrom = document.getElementById('filterDateFrom');
        const filterDateTo = document.getElementById('filterDateTo');
        const tableBody = document.getElementById('tableBody');
        const tableContainer = document.getElementById('tableContainer');
        const emptyState = document.getElementById('emptyState');
        const reportValueTypeSelect = document.getElementById('reportValueTypeSelect');
        const reportValueColumnHeader = document.getElementById('reportValueColumnHeader');
        const totalLabelEl = document.getElementById('totalLabel');
        const totalAmountEl = document.getElementById('totalAmount');
        const chipDashboard = document.getElementById('chipDashboard');
        const chipCalendar = document.getElementById('chipCalendar');
        const printBtn = document.getElementById('printBtn');
        const tableView = document.getElementById('tableView');
        const calendarView = document.getElementById('calendarView');
        const reportsFooter = document.querySelector('.reports-footer');
        const calendarDays = document.getElementById('calendarDays');
    const currentMonthEl = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const printReport = document.getElementById('printReport');
    const printBarangay = document.getElementById('printBarangay');
    const printPeriod = document.getElementById('printPeriod');
    const printGenerated = document.getElementById('printGenerated');
    const printTotalRecords = document.getElementById('printTotalRecords');
    const printTotalAmount = document.getElementById('printTotalAmount');
    const printTotalValueLabel = document.getElementById('printTotalValueLabel');
    const printSummaryValueHeader = document.getElementById('printSummaryValueHeader');
    const printSummaryBody = document.getElementById('printSummaryBody');

    const VISIBLE_TABLE_ROWS = 10;

    let isCalendarView = false;
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth();

    // Page map for navigation
    const pageMap = {
        'dashboard': 'dashboard.html',
        'new-solicitation': 'new-solicitation.html',
        'records': 'records.html',
        'reports': 'reports.html',
        'summary': 'summary.html',
        'list': 'list.html'
    };

    // Zone-to-barangay mapping for filters
    const zoneBarangayMap = {
        '68': ['649', '650', '651', '652', '653'],
        '69': ['654', '655', '656'],
        '70': ['657', '658'],
        '71': ['659', '659-A', '660', '660-A', '661', '662', '663', '663-A', '664', '664-A'],
        '72': ['666', '667', '668', '669', '670'],
        '73': ['671', '672', '673', '674', '675', '676'],
        '74': ['677', '678', '679', '680', '681', '682', '683', '684', '685'],
        '75': ['686', '687', '688', '689', '690', '691', '692', '693', '694', '695'],
        '76': ['696', '697', '698', '699'],
        '77': ['700', '701', '702', '703', '704', '705', '706'],
        '78': ['707', '708', '709', '710', '711', '712', '713', '714', '715', '716', '717', '718', '719', '720', '721'],
        '79': ['722', '723', '724', '725', '726', '727', '728', '729', '730'],
        '80': ['731', '732', '733', '734', '735', '736', '737', '738', '739', '740', '741', '742', '743', '744'],
        '81': ['745', '746', '747', '748', '749', '750', '751', '752', '753', '754'],
        '82': ['755', '756', '757', '758', '759', '760', '761', '762'],
        '83': ['763', '764', '765', '766', '767', '768', '769'],
        '84': ['770', '771', '772', '773', '774', '775'],
        '85': ['776', '777', '778', '779', '780', '781', '782', '783'],
        '86': ['784', '785', '786', '787', '788', '789', '790', '791', '792', '793'],
        '87': ['794', '795', '796', '797', '798', '799', '800', '801', '802', '803', '804', '805', '806', '807'],
        '88': ['808', '809', '810', '811', '812', '813', '814', '815', '816', '817', '818', '818-A', '819', '820'],
        '89': ['821', '822', '823', '824', '825', '826', '827', '828']
    };

    const zoneList = Object.keys(zoneBarangayMap);
    const barangayList = Object.values(zoneBarangayMap).flat();
    const barangayToZone = barangayList.reduce((accumulator, barangay) => {
        const normalizedBarangay = normalizeBarangay(barangay);
        const zone = zoneList.find(key => zoneBarangayMap[key].includes(barangay));
        if (zone) {
            accumulator[normalizedBarangay] = zone;
        }
        return accumulator;
    }, {});

    const STORAGE_KEYS = {
        amount: 'solicitationAmountRecords',
        item: 'solicitationItemRecords'
    };

    function getCurrentValueType() {
        return reportValueTypeSelect?.value === 'item' ? 'item' : 'amount';
    }

    function getCurrentStorageKey() {
        return STORAGE_KEYS[getCurrentValueType()];
    }

    function getReportDataFromStorage() {
        try {
            const data = JSON.parse(localStorage.getItem(getCurrentStorageKey()) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    // Load report data from localStorage with error handling
    let reportData = getReportDataFromStorage();

    let filteredData = [...reportData];

    if (filterZone) {
        populateSelect(filterZone, zoneList, 'All Zones');
    }

    if (filterBarangay) {
        populateSelect(filterBarangay, barangayList, 'All Barangays');
    }

    updateValueTypeUI();

    // Render only if elements exist
    if (tableBody && totalAmountEl) {
        renderTable(filteredData);
        updateTotal(filteredData);
    }

    if (reportValueTypeSelect) {
        reportValueTypeSelect.addEventListener('change', () => {
            reportData = getReportDataFromStorage();
            filteredData = applyAllFilters(reportData);
            updateValueTypeUI();
            renderTable(filteredData);
            updateTotal(filteredData);

            if (isCalendarView) {
                renderCalendar();
            }
        });
    }

    if (filterZone) {
        filterZone.addEventListener('change', () => {
            const zone = normalizeZone(filterZone.value);
            if (zone && zoneBarangayMap[zone] && filterBarangay) {
                populateSelect(filterBarangay, zoneBarangayMap[zone], 'All Barangays');
                if (filterBarangay.value && !zoneBarangayMap[zone].includes(filterBarangay.value)) {
                    filterBarangay.value = '';
                }
            } else if (filterBarangay) {
                populateSelect(filterBarangay, barangayList, 'All Barangays');
            }

            filteredData = applyAllFilters(reportData);
            renderTable(filteredData);
            updateTotal(filteredData);

            if (isCalendarView) {
                renderCalendar();
            }
        });
    }

    if (filterBarangay) {
        filterBarangay.addEventListener('change', () => {
            const barangay = normalizeBarangay(filterBarangay.value);
            const zone = barangayToZone[barangay];
            if (zone && filterZone) {
                filterZone.value = zone;
                populateSelect(filterBarangay, zoneBarangayMap[zone], 'All Barangays');
                filterBarangay.value = barangay;
            }

            filteredData = applyAllFilters(reportData);
            renderTable(filteredData);
            updateTotal(filteredData);

            if (isCalendarView) {
                renderCalendar();
            }
        });
    }

    // Date filter listeners
    if (filterDateFrom) {
        filterDateFrom.addEventListener('change', () => {
            filteredData = applyAllFilters(reportData);
            renderTable(filteredData);
            updateTotal(filteredData);

            if (isCalendarView) {
                renderCalendar();
            }
        });
    }

    if (filterDateTo) {
        filterDateTo.addEventListener('change', () => {
            filteredData = applyAllFilters(reportData);
            renderTable(filteredData);
            updateTotal(filteredData);

            if (isCalendarView) {
                renderCalendar();
            }
        });
    }

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (!page) return;

            // If already on this page, just update active state
            if (page === 'reports') {
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

    // Top chips
    if (chipDashboard) {
        chipDashboard.addEventListener('click', () => ipcRenderer.send('navigate', 'dashboard.html'));
    }
    
    if (chipCalendar) {
        chipCalendar.addEventListener('click', () => {
            isCalendarView = !isCalendarView;
            toggleView();
        });
    }

    // Calendar navigation
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });
    }

    // Print button
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            showToast('Preparing print view...', 'info');
            const printHtml = buildPrintReportHtml();
            openPrintWindow(printHtml);
        });
    }

    // Logout and header buttons
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('user');
                ipcRenderer.send('navigate', 'login.html');
            }
        });
    }

    // Helpers
    function toggleView() {
        if (isCalendarView) {
            tableView.style.display = 'none';
            calendarView.style.display = 'block';
            if (reportsFooter) {
                reportsFooter.style.display = 'none';
            }
            chipCalendar.classList.add('active');
            renderCalendar();
            showToast('Switched to calendar view', 'info');
        } else {
            tableView.style.display = 'block';
            calendarView.style.display = 'none';
            if (reportsFooter) {
                reportsFooter.style.display = 'flex';
            }
            chipCalendar.classList.remove('active');
            showToast('Switched to table view', 'info');
        }
    }

    function renderCalendar() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        
        currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        // Get first day of month and number of days
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        // Get events for current month
        const eventsMap = {};
        filteredData.forEach(record => {
            const recordDate = new Date(record.date);
            if (recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth) {
                const day = recordDate.getDate();
                if (!eventsMap[day]) {
                    eventsMap[day] = [];
                }
                eventsMap[day].push(record);
            }
        });

        calendarDays.innerHTML = '';

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dayEl = createDayElement(day, true, []);
            calendarDays.appendChild(dayEl);
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const events = eventsMap[day] || [];
            const isToday = checkIfToday(currentYear, currentMonth, day);
            const dayEl = createDayElement(day, false, events, isToday);
            calendarDays.appendChild(dayEl);
        }

        // Next month days
        const totalCells = firstDay + daysInMonth;
        const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let day = 1; day <= remainingCells; day++) {
            const dayEl = createDayElement(day, true, []);
            calendarDays.appendChild(dayEl);
        }
    }

    function createDayElement(day, isOtherMonth, events, isToday = false) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayEl.classList.add('other-month');
        }
        
        if (isToday) {
            dayEl.classList.add('today');
        }
        
        if (events.length > 0) {
            dayEl.classList.add('has-event');
        }

        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        dayEl.appendChild(dayNumber);

        if (events.length > 0) {
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'calendar-day-events';
            
            if (events.length === 1) {
                const dot = document.createElement('div');
                dot.className = 'calendar-event-dot';
                eventsContainer.appendChild(dot);
            } else {
                const eventCount = document.createElement('div');
                eventCount.className = 'calendar-event-count';
                eventCount.textContent = `${events.length}`;
                eventsContainer.appendChild(eventCount);
            }
            
            dayEl.appendChild(eventsContainer);

            // Add tooltip with event details
            const tooltip = document.createElement('div');
            tooltip.className = 'calendar-day-tooltip';
            tooltip.textContent = `${events.length} record${events.length > 1 ? 's' : ''}`;
            dayEl.appendChild(tooltip);

            // Show details on click
            dayEl.addEventListener('click', () => {
                showEventDetails(events, day);
            });
        }

        return dayEl;
    }

    function checkIfToday(year, month, day) {
        const today = new Date();
        return today.getFullYear() === year && 
               today.getMonth() === month && 
               today.getDate() === day;
    }

    function showEventDetails(events, day) {
        const valueType = getCurrentValueType();
        const eventsList = events.map(e => 
            valueType === 'item'
                ? `${e.barangay} - ${e.solicitor} - ${String(e.item || '').trim() || 'N/A'}`
                : `${e.barangay} - ${e.solicitor} - ₱${Number(e.amount || 0).toLocaleString()}`
        ).join('\n');
        
        showToast(`Records for day ${day}:\n${eventsList}`, 'info');
    }

    function buildPrintReportHtml() {
        const valueType = getCurrentValueType();
        const displayValueLabel = valueType === 'item' ? 'Quantity' : 'Amount';
        const reportTitle = valueType === 'item'
            ? 'District 5 - Solicitation Quantity Report'
            : 'District 5 - Solicitation Amount Report';
        const generatedOn = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const totalRecords = filteredData.length;
        const totalAmount = filteredData.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const totalItems = filteredData.reduce((sum, row) => sum + parseItemQuantity(row.item), 0);
        const totalDisplay = valueType === 'item'
            ? totalItems.toLocaleString('en-US')
            : `₱${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        const summaryMap = {};
        filteredData.forEach(row => {
            const key = String(row.barangay || 'N/A');
            if (!summaryMap[key]) {
                summaryMap[key] = { barangay: key, zone: String(row.zone || 'N/A'), records: 0, amount: 0, items: 0 };
            }
            summaryMap[key].records += 1;
            summaryMap[key].amount += Number(row.amount || 0);
            summaryMap[key].items += parseItemQuantity(row.item);
        });

        const summaryRows = Object.values(summaryMap)
            .sort((a, b) => a.barangay.localeCompare(b.barangay));

        const summaryRowsHtml = summaryRows.length
            ? summaryRows.map(row => `
                <tr>
                    <td>${escapeHtml(row.barangay)}</td>
                    <td>${escapeHtml(row.zone)}</td>
                    <td>${row.records.toLocaleString('en-US')}</td>
                    <td>${valueType === 'item' ? row.items.toLocaleString('en-US') : `₱${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td colspan="4">No records available for the selected filter.</td>
                </tr>
            `;

        const detailRowsHtml = filteredData.length
            ? filteredData.map((row, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(String(row.zone || '-'))}</td>
                    <td>${escapeHtml(String(row.barangay || '-'))}</td>
                    <td>${escapeHtml(String(row.chairman || '-'))}</td>
                    <td>${escapeHtml(String(row.solicitor || '-'))}</td>
                    <td>${escapeHtml(String(row.assistance || '-'))}</td>
                    <td>${valueType === 'item'
                        ? escapeHtml(String(String(row.item || '').trim() || 'N/A'))
                        : `₱${Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</td>
                    <td>${escapeHtml(formatDate(row.date))}</td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td colspan="8">No records available for the selected filter.</td>
                </tr>
            `;

        return `
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${escapeHtml(reportTitle)}</title>
                    <style>
                        @page { margin: 18mm; }
                        body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
                        h1 { margin: 0 0 4px; font-size: 20px; text-align: center; color: #2C5F8D; }
                        h2 { margin: 18px 0 8px; font-size: 16px; color: #1E4A6F; }
                        .subtitle { margin: 0 0 2px; text-align: center; font-size: 13px; }
                        .meta { margin: 0 0 14px; text-align: center; font-size: 12px; }
                        .summary-grid { display: flex; gap: 12px; margin: 12px 0 16px; }
                        .summary-card { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; text-align: center; }
                        .summary-label { font-size: 12px; color: #4b5563; }
                        .summary-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                        th { background: #2C5F8D; color: #fff; padding: 8px; border: 1px solid #bfc9d7; font-size: 12px; }
                        td { padding: 7px; border: 1px solid #d1d5db; font-size: 11px; text-align: center; }
                        .note { margin-top: 12px; font-size: 11px; line-height: 1.5; }
                        .signature { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; page-break-inside: avoid; }
                        .signature div { width: 32%; text-align: center; font-size: 11px; }
                        .footer { margin-top: 18px; text-align: center; font-size: 10px; color: #6b7280; }
                        .page-break { page-break-before: always; }
                        tr { page-break-inside: avoid; }
                    </style>
                </head>
                <body>
                    <h1>SOLICITATION RECORD MONITORING SYSTEM</h1>
                    <p class="subtitle">City Government of Manila</p>
                    <p class="subtitle"><strong>${escapeHtml(reportTitle)}</strong></p>
                    <p class="meta">Date Generated: ${escapeHtml(generatedOn)} | Report Period: ${escapeHtml(getReportPeriod(filteredData))}</p>

                    <div class="summary-grid">
                        <div class="summary-card">
                            <div class="summary-label">Total Records</div>
                            <div class="summary-value">${totalRecords.toLocaleString('en-US')}</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">Total ${escapeHtml(displayValueLabel)}</div>
                            <div class="summary-value">${totalDisplay}</div>
                        </div>
                    </div>

                    <h2>Solicitation Report Summary by Barangay</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Barangay</th>
                                <th>Zone</th>
                                <th>Records</th>
                                <th>Total ${escapeHtml(displayValueLabel)}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${summaryRowsHtml}
                        </tbody>
                    </table>

                    <div class="page-break"></div>

                    <h2>Detailed Solicitation Records</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Zone</th>
                                <th>Barangay</th>
                                <th>Chairman</th>
                                <th>Solicitor</th>
                                <th>Assistance</th>
                                <th>${escapeHtml(displayValueLabel)}</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detailRowsHtml}
                        </tbody>
                    </table>

                    <p class="note"><strong>Note:</strong><br>
                    This report is generated based on current filters for zone, barangay, and date range.<br>
                    Values shown reflect the selected report type (${escapeHtml(displayValueLabel)}).</p>

                    <div class="signature">
                        <div>Prepared by<br><br>__________________________<br>Name &amp; Signature</div>
                        <div>Reviewed by<br><br>__________________________<br>Name &amp; Signature</div>
                        <div>Approved by<br><br>__________________________<br>Name &amp; Signature</div>
                    </div>

                    <div class="footer">
                        SOLICITATION RECORD MONITORING SYSTEM<br>
                        This is a computer-generated report from the City Government of Manila<br>
                        © 2026 City Government of Manila. All Rights Reserved.
                    </div>
                </body>
            </html>
        `;
    }

    function openPrintWindow(htmlContent) {
        const printWindow = window.open('', '_blank', 'width=1024,height=768');
        if (!printWindow) {
            showToast('Unable to open print preview. Please allow popups.', 'error');
            return;
        }

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderTable(data) {
        const valueType = getCurrentValueType();
        tableContainer.classList.remove('hidden');
        emptyState.classList.remove('show');

        const recordRowsHtml = data.map(row => `
            <tr>
                <td>${row.zone}</td>
                <td>${row.barangay}</td>
                <td>${row.chairman}</td>
                <td>${row.solicitor}</td>
                <td>${row.assistance}</td>
                <td class="amount-cell">${valueType === 'item' ? (String(row.item || '').trim() || 'N/A') : `₱${Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</td>
                <td>${formatDate(row.date)}</td>
            </tr>
        `).join('');

        const emptyRowCount = Math.max(0, VISIBLE_TABLE_ROWS - data.length);
        const emptyRowsHtml = Array.from({ length: emptyRowCount }, () => `
            <tr class="empty-row" aria-hidden="true">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
            </tr>
        `).join('');

        tableBody.innerHTML = recordRowsHtml + emptyRowsHtml;
    }

    function updateTotal(data) {
        const valueType = getCurrentValueType();
        const total = data.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const totalItems = data.reduce((sum, row) => sum + parseItemQuantity(row.item), 0);

        if (valueType === 'item') {
            totalAmountEl.textContent = totalItems.toLocaleString('en-US');
        } else {
            totalAmountEl.textContent = `₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
    }

    function updateValueTypeUI() {
        const valueType = getCurrentValueType();
        if (reportValueColumnHeader) {
            reportValueColumnHeader.textContent = valueType === 'item' ? 'Quantity' : 'Amount';
        }
        if (totalLabelEl) {
            totalLabelEl.textContent = valueType === 'item' ? 'Total Quantity:' : 'Total Amount:';
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function getReportPeriod(data) {
        if (!data.length) {
            return 'No records';
        }

        const dates = data
            .map(row => new Date(row.date))
            .filter(date => !Number.isNaN(date.valueOf()))
            .sort((a, b) => a - b);

        if (!dates.length) {
            return 'No dates available';
        }

        const start = dates[0];
        const end = dates[dates.length - 1];
        if (start.toDateString() === end.toDateString()) {
            return start.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }

        const startText = start.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const endText = end.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        return `${startText} - ${endText}`;
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

    function populateSelect(select, items, placeholder) {
        select.innerHTML = `<option value="">${placeholder}</option>` + items
            .map(item => `<option value="${item}">${item}</option>`)
            .join('');
    }

    function normalizeZone(value) {
        return String(value || '')
            .replace(/zone\s*/i, '')
            .trim();
    }

    function normalizeBarangay(value) {
        return String(value || '')
            .replace(/barangay\s*/i, '')
            .trim()
            .toUpperCase();
    }

    function applyZoneBarangayFilters(sourceData) {
        const zone = filterZone ? normalizeZone(filterZone.value) : '';
        const barangay = filterBarangay ? normalizeBarangay(filterBarangay.value) : '';

        return sourceData.filter(row => {
            const matchesZone = !zone || normalizeZone(row.zone) === zone;
            const matchesBarangay = !barangay || normalizeBarangay(row.barangay) === barangay;
            return matchesZone && matchesBarangay;
        });
    }

    function applyAllFilters(sourceData) {
        const zone = filterZone ? normalizeZone(filterZone.value) : '';
        const barangay = filterBarangay ? normalizeBarangay(filterBarangay.value) : '';
        const dateFrom = filterDateFrom ? filterDateFrom.value : '';
        const dateTo = filterDateTo ? filterDateTo.value : '';

        return sourceData.filter(row => {
            const matchesZone = !zone || normalizeZone(row.zone) === zone;
            const matchesBarangay = !barangay || normalizeBarangay(row.barangay) === barangay;
            
            let matchesDate = true;
            if (dateFrom || dateTo) {
                const recordDate = new Date(row.date);
                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    matchesDate = matchesDate && recordDate >= fromDate;
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999); // Include entire end date
                    matchesDate = matchesDate && recordDate <= toDate;
                }
            }
            
            return matchesZone && matchesBarangay && matchesDate;
        });
    }

    function parseItemQuantity(value) {
        const normalized = String(value || '')
            .replace(/,/g, '')
            .trim();

        const numeric = Number(normalized);
        return Number.isFinite(numeric) ? numeric : 0;
    }
    } catch (error) {
        console.error('Critical error in reports.js:', error);
        document.body.innerHTML = '<div style=\"padding: 20px; color: red;\">Error loading page. Please check console for details.</div>';
    }
});
