// Records page functionality
const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');

const FIREBASE_PROJECT_ID = 'solicitation-record-management';
const FIREBASE_API_KEY = 'AIzaSyBKWo_Cwk0ZviijLJ5OU1a8Ym1r6e-6p8o';

document.addEventListener('DOMContentLoaded', () => {
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

    const searchInput = document.getElementById('searchInput');
    const filterZone = document.getElementById('filterZone');
    const filterBarangay = document.getElementById('filterBarangay');
    const filterAssistance = document.getElementById('filterAssistance');
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo = document.getElementById('filterDateTo');
    const filterStatus = document.getElementById('filterStatus');
    const valueTypeSelect = document.getElementById('valueTypeSelect');
    const valueColumnHeader = document.getElementById('valueColumnHeader');
    const refreshBtn = document.getElementById('refreshBtn');
    const tableBody = document.getElementById('tableBody');
    const tableContainer = document.getElementById('tableContainer');
    const sortableHeaders = document.querySelectorAll('.records-table thead th[data-sort-field]');
    const emptyState = document.getElementById('emptyState');
    const logoutBtn = document.getElementById('logoutBtn');
    const navItems = document.querySelectorAll('.nav-item');
    const editZoneInput = document.getElementById('editZone');
    const editBarangayInput = document.getElementById('editBarangay');
    const editChairmanInput = document.getElementById('editChairman');
    const editSolicitorInput = document.getElementById('editSolicitor');
    const editAmountInput = document.getElementById('editAmount');
    const editValueLabel = document.getElementById('editValueLabel');
    const editAssistanceInput = document.getElementById('editAssistance');
    const editAssistanceDropdown = document.getElementById('editAssistanceDropdown');

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
    const barangayToZone = barangayList.reduce((acc, barangay) => {
        const zone = zoneList.find(key => zoneBarangayMap[key].includes(barangay));
        if (zone) {
            acc[barangay] = zone;
        }
        return acc;
    }, {});

    const BARANGAY_DROPDOWN_DELAY_MS = 250;
    const MIN_VISIBLE_TABLE_ROWS = 8;
    const ITEM_FILTER_PREFIX = 'Item - ';
    const STORAGE_KEYS = {
        amount: 'solicitationAmountRecords',
        item: 'solicitationItemRecords'
    };

    const assistanceTypeTree = [
        {
            category: 'Event',
            children: ['Wedding', 'Christening', 'Birthday']
        },
        {
            category: 'Sport Materials',
            children: ['Volley Ball', 'Basket Ball', 'Badminton', 'Chess', 'Dart']
        },
        {
            category: 'Medical Items',
            children: ['Wheel Chair', 'Saklay', 'BP', 'Nebulizer', 'Baby Kit']
        },
        {
            category: 'Optical',
            children: ['Reading Glasses', 'Cataract Patient']
        },
        {
            category: 'Animal Assistance',
            children: ['Anti Rabies']
        },
        {
            category: 'Medical Assistance',
            children: []
        },
        {
            category: 'Financial Assistance',
            children: []
        },
        {
            category: 'Burial Assistance',
            children: []
        }
    ];

    function getCurrentValueType() {
        return valueTypeSelect?.value === 'item' ? 'item' : 'amount';
    }

    function getCurrentStorageKey() {
        return STORAGE_KEYS[getCurrentValueType()];
    }

    function syncEditValueFieldByType() {
        if (!editAmountInput) {
            return;
        }

        const isItemType = getCurrentValueType() === 'item';
        if (editValueLabel) {
            editValueLabel.innerHTML = `${isItemType ? 'Quantity' : 'Amount'} <span class="required">*</span>`;
        }

        editAmountInput.placeholder = isItemType ? 'Enter Quantity' : 'Enter Amount';
    }

    function getRecordsFromCurrentStorage() {
        try {
            const data = JSON.parse(localStorage.getItem(getCurrentStorageKey()) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    // Function to close all dropdowns
    function closeAllDropdowns(exceptDropdownId) {
        document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
            if (dropdown.id !== exceptDropdownId) {
                dropdown.classList.remove('show');
                dropdown.closest('.autocomplete-wrapper')?.classList.remove('active');
            }
        });

    }

    function toNumericInteger(value) {
        return String(value || '').replace(/[^0-9]/g, '');
    }

    function toNumericDecimal(value) {
        let sanitized = String(value || '').replace(/[^0-9.]/g, '');
        const firstDotIndex = sanitized.indexOf('.');
        if (firstDotIndex !== -1) {
            sanitized = `${sanitized.slice(0, firstDotIndex + 1)}${sanitized.slice(firstDotIndex + 1).replace(/\./g, '')}`;
        }
        return sanitized;
    }

    function toLettersOnly(value) {
        return String(value || '')
            .replace(/[^A-Za-z\s]/g, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/^\s+/, '');
    }

    function hasOnlyLetters(value, allowHyphen = false) {
        const pattern = allowHyphen ? /^[A-Za-z\s-]+$/ : /^[A-Za-z\s]+$/;
        return pattern.test(String(value || '').trim());
    }

    // Load records from localStorage
    let records = getRecordsFromCurrentStorage();
    let lastRenderedRecords = [...records];
    let sortState = {
        field: 'id',
        direction: 'desc'
    };

    // Initialize page
    loadRecords();
    syncSolicitationCollectionsFromFirebase();

    if (filterZone) {
        populateSelect(filterZone, zoneList, 'All Zones');
    }
    if (filterBarangay) {
        populateSelect(filterBarangay, barangayList, 'All Barangays');
    }
    if (filterAssistance) {
        refreshAssistanceFilterOptions();
        setupAutocomplete(
            'filterAssistance',
            'filterAssistanceDropdown',
            () => getAssistanceFilterOptions(),
            () => applyFilters()
        );
    }

    if (editZoneInput) {
        editZoneInput.setAttribute('inputmode', 'numeric');
        editZoneInput.addEventListener('input', () => {
            editZoneInput.value = toNumericInteger(editZoneInput.value);
        });
    }

    if (editBarangayInput) {
        editBarangayInput.setAttribute('inputmode', 'numeric');
        editBarangayInput.addEventListener('input', () => {
            editBarangayInput.value = toNumericInteger(editBarangayInput.value);
        });
    }

    if (editAmountInput) {
        editAmountInput.setAttribute('inputmode', 'decimal');
        editAmountInput.addEventListener('input', () => {
            editAmountInput.value = toNumericDecimal(editAmountInput.value);
        });
    }
    syncEditValueFieldByType();

    if (editChairmanInput) {
        editChairmanInput.addEventListener('input', () => {
            editChairmanInput.value = toLettersOnly(editChairmanInput.value);
        });
    }

    if (editSolicitorInput) {
        editSolicitorInput.addEventListener('input', () => {
            editSolicitorInput.value = toLettersOnly(editSolicitorInput.value);
        });
    }

    initializeSorting();

    if (editZoneInput && editBarangayInput && editChairmanInput) {
        function openEditBarangayDropdown() {
            setTimeout(() => {
                editBarangayInput.focus();
                editBarangayInput.dispatchEvent(new Event('input', { bubbles: true }));
            }, BARANGAY_DROPDOWN_DELAY_MS);
        }

        function getEditChairmanOptions() {
            const barangayContacts = loadBarangayContacts();
            const barrangay = normalizeBarangay(editBarangayInput.value);
            const matched = barangayContacts.filter(c => normalizeBarangay(c.barangay) === barrangay);
            const chairmen = matched.map(c => c.current).filter(Boolean);
            return uniqueSorted(chairmen);
        }

        function syncEditChairmanFromBarangay(shouldOpenDropdown = false) {
            const chairmanOptions = getEditChairmanOptions();
            const currentChairmanValue = String(editChairmanInput.value || '').trim();
            const hasMatch = chairmanOptions.some(name => name.toUpperCase() === currentChairmanValue.toUpperCase());

            if (currentChairmanValue && !hasMatch) {
                editChairmanInput.value = '';
            }

            if (shouldOpenDropdown) {
                setTimeout(() => {
                    editChairmanInput.focus();
                    editChairmanInput.dispatchEvent(new Event('input', { bubbles: true }));
                }, 150);
            }
        }

        setupAutocomplete('editZone', 'editZoneDropdown', () => zoneList, (value) => {
            const normalizedZone = normalizeZone(value);
            editZoneInput.value = normalizedZone;
            updateEditBarangayOptions(normalizedZone);
            openEditBarangayDropdown();
        });
        setupAutocomplete('editBarangay', 'editBarangayDropdown', () => getEditBarangayOptions(), (value) => {
            const normalizedBarangay = normalizeBarangay(value);
            editBarangayInput.value = normalizedBarangay;
            const mappedZone = barangayToZone[normalizedBarangay];
            if (mappedZone) {
                editZoneInput.value = mappedZone;
                updateEditBarangayOptions(mappedZone);
            }
            // Clear chairman immediately when barangay changes
            editChairmanInput.value = '';
            syncEditChairmanFromBarangay(true);
        });
        setupAutocomplete('editChairman', 'editChairmanDropdown', () => getEditChairmanOptions());
        setupAutocomplete('editAssistance', 'editAssistanceDropdown', () => getAssistanceFilterOptions());

        editZoneInput.addEventListener('blur', () => {
            const normalizedZone = normalizeZone(editZoneInput.value);
            if (zoneBarangayMap[normalizedZone]) {
                editZoneInput.value = normalizedZone;
                updateEditBarangayOptions(normalizedZone);
            }
        });

        editBarangayInput.addEventListener('blur', () => {
            const normalizedBarangay = normalizeBarangay(editBarangayInput.value);
            if (barangayToZone[normalizedBarangay]) {
                editBarangayInput.value = normalizedBarangay;
                editZoneInput.value = barangayToZone[normalizedBarangay];
                updateEditBarangayOptions(editZoneInput.value);
            }
            syncEditChairmanFromBarangay(false);
        });
    }

    function loadBarangayContacts() {
        try {
            const data = JSON.parse(localStorage.getItem('barangayContacts') || '[]');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function uniqueSorted(list) {
        const map = new Map();
        list.forEach(item => {
            const upper = String(item || '').toUpperCase();
            if (upper && !map.has(upper)) {
                map.set(upper, item);
            }
        });
        return Array.from(map.values()).sort();
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, (char) => {
            const entities = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            };
            return entities[char] || char;
        });
    }

    function loadRecords() {
        records = getRecordsFromCurrentStorage();
        refreshAssistanceFilterOptions();
        renderRecords(sortData(records));
    }

    function initializeSorting() {
        sortableHeaders.forEach(header => {
            header.classList.add('sortable-header');
            header.dataset.sortDirection = '';
            header.addEventListener('click', () => {
                const field = header.dataset.sortField;
                if (!field) {
                    return;
                }

                if (sortState.field !== field) {
                    sortState.field = field;
                    sortState.direction = 'asc';
                } else {
                    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
                }

                updateSortHeaderIndicators();
                applyFilters();
            });
        });

        updateSortHeaderIndicators();
    }

    function updateSortHeaderIndicators() {
        sortableHeaders.forEach(header => {
            const field = header.dataset.sortField;
            const isActive = field === sortState.field;
            header.dataset.sortDirection = isActive ? sortState.direction : '';
        });
    }

    function compareValues(valueA, valueB) {
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return valueA - valueB;
        }
        const aText = String(valueA ?? '').toLowerCase();
        const bText = String(valueB ?? '').toLowerCase();
        return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
    }

    function getSortValue(record, field) {
        switch (field) {
            case 'id':
                return Number(record.id) || 0;
            case 'zone': {
                const normalized = normalizeZone(record.zone);
                const numericValue = Number(normalized);
                return Number.isFinite(numericValue) ? numericValue : String(normalized || '').toUpperCase();
            }
            case 'barangay':
                return normalizeBarangay(record.barangay);
            case 'chairman':
                return String(record.chairman || '').trim();
            case 'solicitor':
                return String(record.solicitor || '').trim();
            case 'assistance':
                return String(record.assistance || '').trim();
            case 'value': {
                if (getCurrentValueType() === 'item') {
                    return String(record.item || '').trim();
                }
                const amountValue = Number(record.amount);
                return Number.isFinite(amountValue) ? amountValue : Number.NEGATIVE_INFINITY;
            }
            case 'date': {
                const timestamp = new Date(record.date).getTime();
                return Number.isFinite(timestamp) ? timestamp : 0;
            }
            case 'status':
                return String(record.status || '').trim();
            default:
                return String(record[field] || '').trim();
        }
    }

    function sortData(data) {
        const sorted = [...data].sort((a, b) => {
            const valueA = getSortValue(a, sortState.field);
            const valueB = getSortValue(b, sortState.field);
            const comparison = compareValues(valueA, valueB);
            return sortState.direction === 'desc' ? -comparison : comparison;
        });
        return sorted;
    }

    const assistanceFilterAllowedCategoriesByValueType = {
        amount: new Set([
            'Event', 'Optical', 'Medical Assistance', 'Financial Assistance', 'Burial Assistance'
        ]),
        item: new Set([
            'Sport Material', 'Medical Item', 'Event', 'Optical', 'Animal Assistance'
        ])
    };

    function normalizeAssistanceCategoryLabel(category) {
        if (category === 'Sport Materials') {
            return 'Sport Material';
        }
        if (category === 'Medical Items') {
            return 'Medical Item';
        }
        return category;
    }

    function getAssistanceBaseOptions() {
        const valueType = getCurrentValueType();
        const allowedCategories = assistanceFilterAllowedCategoriesByValueType[valueType] || new Set();

        return assistanceTypeTree
            .flatMap(function(node) {
                const normalizedCategory = normalizeAssistanceCategoryLabel(node.category);
                if (!allowedCategories.has(normalizedCategory)) {
                    return [];
                }

                const children = Array.isArray(node.children) ? node.children : [];
                if (!children.length) {
                    return [normalizedCategory];
                }
                return children.map(function(child) { return normalizedCategory + ' - ' + child; });
            });
    }

    function getCustomItemFilterOptions() {
        if (getCurrentValueType() !== 'item') {
            return [];
        }

        return records
            .map(record => String(record.assistance || '').trim())
            .filter(assistance => assistance.startsWith(ITEM_FILTER_PREFIX));
    }

    function getAssistanceFilterOptions() {
        return uniqueSorted([
            ...getAssistanceBaseOptions(),
            ...getCustomItemFilterOptions()
        ]);
    }

    function refreshAssistanceFilterOptions() {
        if (!filterAssistance) {
            return;
        }
        const currentValue = filterAssistance.value;
        if (currentValue) {
            filterAssistance.value = currentValue;
        }
    }

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (!page) return;
            
            // If already on this page, just update active state
            if (page === 'records') {
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

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    // Filter functionality
    [filterAssistance, filterDateFrom, filterDateTo, filterStatus].filter(f => f).forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });

    if (filterAssistance) {
        filterAssistance.addEventListener('input', applyFilters);
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
            applyFilters();
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
            applyFilters();
        });
    }

    function applyFilters() {
        let filtered = [...records];

        const searchTerm = String(searchInput?.value || '').toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(record =>
                String(record.zone || '').toLowerCase().includes(searchTerm) ||
                String(record.barangay || '').toLowerCase().includes(searchTerm) ||
                String(record.chairman || '').toLowerCase().includes(searchTerm) ||
                String(record.solicitor || '').toLowerCase().includes(searchTerm) ||
                String(record.assistance || '').toLowerCase().includes(searchTerm) ||
                formatDate(record.date).toLowerCase().includes(searchTerm) ||
                String(record.status || '').toLowerCase().includes(searchTerm)
            );
        }

        if (filterZone.value) {
            const zoneValue = normalizeZone(filterZone.value);
            filtered = filtered.filter(r => normalizeZone(r.zone) === zoneValue);
        }
        if (filterBarangay.value) {
            const barangayValue = normalizeBarangay(filterBarangay.value);
            filtered = filtered.filter(r => normalizeBarangay(r.barangay) === barangayValue);
        }
        if (filterAssistance.value) {
            const assistanceValue = filterAssistance.value.toLowerCase();
            filtered = filtered.filter(r => String(r.assistance || '').toLowerCase().includes(assistanceValue));
        }
        if (filterDateFrom.value) {
            filtered = filtered.filter(r => new Date(r.date) >= new Date(filterDateFrom.value));
        }
        if (filterDateTo.value) {
            filtered = filtered.filter(r => new Date(r.date) <= new Date(filterDateTo.value));
        }
        if (filterStatus.value) {
            filtered = filtered.filter(r => r.status === filterStatus.value);
        }

        renderRecords(sortData(filtered));
    }

    // Render records table
    function renderRecords(data) {
        if (!tableContainer || !emptyState || !tableBody) {
            console.error('Required DOM elements not found');
            return;
        }

        lastRenderedRecords = data;

        const selectedValueType = valueTypeSelect?.value || 'amount';
        if (valueColumnHeader) {
            valueColumnHeader.textContent = selectedValueType === 'item' ? 'Quantity' : 'Amount';
        }

        tableContainer.classList.remove('hidden');
        emptyState.classList.remove('show');

        const recordRowsHtml = data.map(record => {
            const rawAmount = record.amount;
            const hasAmount = rawAmount !== null && rawAmount !== undefined && String(rawAmount).trim() !== '';
            const numericAmount = Number(rawAmount);
            const amountText = hasAmount && Number.isFinite(numericAmount)
                ? `₱${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : 'N/A';
            const itemText = String(record.item || '').trim() || 'N/A';
            const valueText = selectedValueType === 'item' ? itemText : amountText;

            return `
            <tr>
                <td>${record.zone}</td>
                <td>${record.barangay}</td>
                <td>${record.chairman}</td>
                <td>${record.solicitor}</td>
                <td>${record.assistance}</td>
                <td>${valueText}</td>
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
        `;
        }).join('');

        const emptyRowCount = Math.max(0, MIN_VISIBLE_TABLE_ROWS - data.length);
        const emptyRowsHtml = Array.from({ length: emptyRowCount }, () => `
            <tr class="empty-row" aria-hidden="true">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
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

    if (valueTypeSelect) {
        valueTypeSelect.addEventListener('change', () => {
            syncEditValueFieldByType();
            loadRecords();
            applyFilters();
        });
    }

    // Refresh functionality
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            showToast('Refreshing records...', 'info');
            
            // Reload records from localStorage
            loadRecords();
            
            // Reset filters
            if (searchInput) searchInput.value = '';
            if (filterZone) filterZone.value = '';
            if (filterBarangay) filterBarangay.value = '';
            if (filterAssistance) filterAssistance.value = '';
            if (filterDateFrom) filterDateFrom.value = '';
            if (filterDateTo) filterDateTo.value = '';
            if (filterStatus) filterStatus.value = '';

            sortState = {
                field: 'id',
                direction: 'desc'
            };
            updateSortHeaderIndicators();

            if (filterZone) {
                populateSelect(filterZone, zoneList, 'All Zones');
            }
            if (filterBarangay) {
                populateSelect(filterBarangay, barangayList, 'All Barangays');
            }
            
            renderRecords(sortData(records));
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('user');
                ipcRenderer.send('navigate', 'login.html');
            }
        });
    }

    // Other buttons
    // Helper functions
    function populateSelect(select, items, placeholder) {
        select.innerHTML = `<option value="">${placeholder}</option>` + items
            .map(item => `<option value="${item}">${item}</option>`)
            .join('');
    }

    function getEditBarangayOptions() {
        if (!editZoneInput) return barangayList;
        const zone = normalizeZone(editZoneInput.value);
        if (zone && zoneBarangayMap[zone]) {
            return zoneBarangayMap[zone];
        }
        return barangayList;
    }

    function updateEditBarangayOptions(zone) {
        if (!editBarangayInput) return;
        const normalizedZone = normalizeZone(zone);
        const allowedBarangays = zoneBarangayMap[normalizedZone] || barangayList;
        const currentBarangay = normalizeBarangay(editBarangayInput.value);
        if (currentBarangay && !allowedBarangays.includes(currentBarangay)) {
            editBarangayInput.value = '';
        }
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

    function getFirestoreFieldString(fields, key) {
        const field = fields && fields[key];
        if (!field) return '';
        if (typeof field.stringValue === 'string') return field.stringValue;
        if (typeof field.integerValue === 'string') return field.integerValue;
        if (typeof field.doubleValue === 'number') return String(field.doubleValue);
        return '';
    }

    function mapFirebaseSolicitationDoc(doc, valueType, index) {
        const fields = doc?.fields || {};
        const firebaseDocId = String(doc?.name || '').split('/').pop() || '';
        const zone = normalizeZone(getFirestoreFieldString(fields, 'zone'));
        const barangay = normalizeBarangay(getFirestoreFieldString(fields, 'barangay'));
        const chairman = String(getFirestoreFieldString(fields, 'chairman') || 'N/A').trim() || 'N/A';
        const solicitor = String(getFirestoreFieldString(fields, 'solicitor') || 'N/A').trim() || 'N/A';
        const assistance = String(
            getFirestoreFieldString(fields, 'assistance') ||
            getFirestoreFieldString(fields, 'assistance tyoe') ||
            getFirestoreFieldString(fields, 'assistanceType')
        ).trim();
        const date = String(getFirestoreFieldString(fields, 'date')).trim();
        const status = String(getFirestoreFieldString(fields, 'status') || 'pending').trim() || 'pending';

        const mapped = {
            id: index + 1,
            sourceRecordId: firebaseDocId,
            zone,
            barangay,
            chairman,
            solicitor,
            assistance,
            date,
            status
        };

        if (valueType === 'amount') {
            mapped.amount = getFirestoreFieldString(fields, 'amount');
            mapped.item = null;
        } else {
            mapped.item = getFirestoreFieldString(fields, 'quantity') || getFirestoreFieldString(fields, 'item');
            mapped.amount = null;
        }

        return mapped;
    }

    async function fetchFirebaseSolicitationCollection(collectionName, valueType) {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(collectionName)}?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) {
            const details = await response.text();
            throw new Error(`Fetch ${collectionName} failed (${response.status}): ${details}`);
        }

        const payload = await response.json();
        const docs = Array.isArray(payload.documents) ? payload.documents : [];
        return docs.map((doc, index) => mapFirebaseSolicitationDoc(doc, valueType, index));
    }

    async function syncSolicitationCollectionsFromFirebase() {
        try {
            const [amountRecordsFromFirebase, itemRecordsFromFirebase] = await Promise.all([
                fetchFirebaseSolicitationCollection('amount', 'amount'),
                fetchFirebaseSolicitationCollection('quantity', 'item')
            ]);

            localStorage.setItem('solicitationAmountRecords', JSON.stringify(amountRecordsFromFirebase));
            localStorage.setItem('solicitationItemRecords', JSON.stringify(itemRecordsFromFirebase));

            const mergedRecords = [...amountRecordsFromFirebase, ...itemRecordsFromFirebase].map((record, index) => ({
                ...record,
                id: index + 1
            }));
            localStorage.setItem('solicitationRecords', JSON.stringify(mergedRecords));

            loadRecords();
            applyFilters();
            showToast('Synced amount and quantity from Firebase', 'success');
        } catch (error) {
            console.error('Failed to sync Firebase amount/quantity:', error);
            showToast('Using local records (Firebase sync failed)', 'info');
        }
    }

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
        records = getRecordsFromCurrentStorage();
        const record = records.find(r => r.id === id);
        if (record) {
            const rawAmount = record.amount;
            const hasAmount = rawAmount !== null && rawAmount !== undefined && String(rawAmount).trim() !== '';
            const numericAmount = Number(rawAmount);
            const amountText = hasAmount && Number.isFinite(numericAmount)
                ? `₱${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : 'N/A';
            const details = `
Zone: ${record.zone}
Barangay: ${record.barangay}
Chairman: ${record.chairman}
Solicitor: ${record.solicitor}
Assistance: ${record.assistance}
Amount: ${amountText}
Date: ${formatDate(record.date)}
Status: ${capitalizeFirst(record.status)}`;
            alert(details);
        }
    };

    window.editRecord = function(id) {
        records = getRecordsFromCurrentStorage();
        const record = records.find(r => r.id === id);
        if (record) {
            const isItemType = getCurrentValueType() === 'item';
            syncEditValueFieldByType();

            // Populate form fields
            document.getElementById('editId').value = record.id;
            document.getElementById('editZone').value = normalizeZone(record.zone);
            document.getElementById('editBarangay').value = normalizeBarangay(record.barangay);
            document.getElementById('editChairman').value = record.chairman;
            document.getElementById('editSolicitor').value = record.solicitor;
            if (editAssistanceInput) {
                editAssistanceInput.value = String(record.assistance || '').trim();
            }
            document.getElementById('editAmount').value = isItemType
                ? String(record.item || '').trim()
                : String(record.amount ?? '').trim();
            document.getElementById('editDate').value = record.date;
            document.getElementById('editStatus').value = record.status;

            updateEditBarangayOptions(document.getElementById('editZone').value);
            
            // Show modal
            document.getElementById('editModal').style.display = 'flex';
        }
    };
    
    // Edit modal handlers
    const editModal = document.getElementById('editModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const cancelEdit = document.getElementById('cancelEdit');
    const editForm = document.getElementById('editForm');
    
    if (closeEditModal) {
        closeEditModal.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }
    
    if (cancelEdit) {
        cancelEdit.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }
    
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const zoneValue = String(document.getElementById('editZone').value || '').trim();
            const barangayValue = String(document.getElementById('editBarangay').value || '').trim();
            const valueInput = String(document.getElementById('editAmount').value || '').trim();
            const isItemType = getCurrentValueType() === 'item';
            const chairmanValue = String(document.getElementById('editChairman').value || '').trim();
            const solicitorValue = String(document.getElementById('editSolicitor').value || '').trim();
            const assistanceValue = String(document.getElementById('editAssistance').value || '').trim();

            if (zoneValue && !/^\d+$/.test(zoneValue)) {
                showToast('Zone can only contain numbers.', 'error');
                return;
            }

            if (barangayValue && !/^\d+$/.test(barangayValue)) {
                showToast('Barangay can only contain numbers.', 'error');
                return;
            }

            if (valueInput && !/^\d+(\.\d+)?$/.test(valueInput)) {
                showToast(isItemType ? 'Quantity can only contain numbers.' : 'Amount can only contain numbers.', 'error');
                return;
            }

            if (chairmanValue && !hasOnlyLetters(chairmanValue)) {
                showToast('Chairman can only contain letters.', 'error');
                return;
            }

            if (solicitorValue && !hasOnlyLetters(solicitorValue)) {
                showToast('Solicitor can only contain letters.', 'error');
                return;
            }

            if (assistanceValue && !hasOnlyLetters(assistanceValue, true)) {
                showToast('Assistance Type can only contain letters.', 'error');
                return;
            }
            
            const id = parseInt(document.getElementById('editId').value);
            records = getRecordsFromCurrentStorage();
            const recordIndex = records.findIndex(r => r.id === id);
            
            if (recordIndex !== -1) {
                // Update record
                records[recordIndex] = {
                    id: id,
                    zone: normalizeZone(document.getElementById('editZone').value),
                    barangay: normalizeBarangay(document.getElementById('editBarangay').value),
                    chairman: document.getElementById('editChairman').value,
                    solicitor: document.getElementById('editSolicitor').value,
                    assistance: String(document.getElementById('editAssistance').value || '').trim(),
                    amount: isItemType ? null : parseFloat(valueInput),
                    item: isItemType ? valueInput : null,
                    date: document.getElementById('editDate').value,
                    status: document.getElementById('editStatus').value
                };
                
                // Save to localStorage
                localStorage.setItem(getCurrentStorageKey(), JSON.stringify(records));
                
                // Close modal and reload
                editModal.style.display = 'none';
                loadRecords();
                showToast('Record updated successfully!', 'success');
            }
        });
    }
    
    // Close modal when clicking outside
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                editModal.style.display = 'none';
            }
        });
    };

    window.deleteRecord = function(id) {
        records = getRecordsFromCurrentStorage();
        const record = records.find(r => r.id === id);
        if (record && confirm(`Delete record for ${record.solicitor}?`)) {
            // Remove from array
            records = records.filter(r => r.id !== id);
            // Save back to localStorage
            localStorage.setItem(getCurrentStorageKey(), JSON.stringify(records));
            // Reload and render
            loadRecords();
            showToast('Record deleted successfully', 'success');
        }
    };

    function setupAutocomplete(inputId, dropdownId, getData, onSelect) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!input || !dropdown) return;

        const wrapper = input.closest('.autocomplete-wrapper');
        let selectedIndex = -1;
        let filteredData = [];

        // Mark this as an autocomplete input
        input.setAttribute('data-autocomplete', 'true');

        input.addEventListener('focus', function() {
            closeAllDropdowns(dropdownId);
            filteredData = getData();
            renderDropdown(filteredData, '');
            dropdown.classList.add('show');
            wrapper.classList.add('active');
        });

        input.addEventListener('input', function() {
            closeAllDropdowns(dropdownId);
            const value = this.value.toLowerCase();
            filteredData = getData().filter(item => item.toLowerCase().includes(value));
            selectedIndex = -1;
            renderDropdown(filteredData, value);
            dropdown.classList.add('show');
            wrapper.classList.add('active');
        });

        input.addEventListener('keydown', function(e) {
            const items = dropdown.querySelectorAll('.autocomplete-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                updateSelection(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && items[selectedIndex]) {
                    selectItem(items[selectedIndex].textContent);
                }
            } else if (e.key === 'Escape') {
                dropdown.classList.remove('show');
                wrapper.classList.remove('active');
            }
        });

        // Close dropdown when clicking outside (but NOT when clicking within any autocomplete-wrapper)
        document.addEventListener('click', function(e) {
            if (!wrapper.contains(e.target)) {
                // Check if the clicked element is within any autocomplete-wrapper
                const clickedWrapper = e.target.closest('.autocomplete-wrapper');
                // Only close if NOT clicking within any autocomplete-wrapper
                if (!clickedWrapper) {
                    dropdown.classList.remove('show');
                    wrapper.classList.remove('active');
                    selectedIndex = -1;
                }
            }
        });

        function renderDropdown(items, searchTerm) {
            if (items.length === 0) {
                dropdown.innerHTML = '<div class="autocomplete-empty">No matches found</div>';
                return;
            }

            dropdown.innerHTML = items.map(item => {
                let displayText = item;
                if (searchTerm) {
                    const regex = new RegExp(`(${searchTerm})`, 'gi');
                    displayText = item.replace(regex, '<mark>$1</mark>');
                }
                return `<div class="autocomplete-item">${displayText}</div>`;
            }).join('');

            dropdown.querySelectorAll('.autocomplete-item').forEach((item, index) => {
                item.addEventListener('click', function(e) {
                    e.stopPropagation();
                    selectItem(items[index]);
                });
            });
        }

        function updateSelection(items) {
            items.forEach((item, index) => {
                item.classList.toggle('selected', index === selectedIndex);
            });
            if (items[selectedIndex]) {
                items[selectedIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        function selectItem(value) {
            input.value = value;
            dropdown.classList.remove('show');
            wrapper.classList.remove('active');
            selectedIndex = -1;

             if (input.id === 'filterAssistance' && value === ITEM_FILTER_PREFIX) {
                setTimeout(function() {
                    input.focus();
                    input.setSelectionRange(ITEM_FILTER_PREFIX.length, ITEM_FILTER_PREFIX.length);
                }, 0);
            }

            if (typeof onSelect === 'function') {
                onSelect(value);
            }
        }
    }
});
