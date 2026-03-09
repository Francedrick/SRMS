// New Solicitation Form functionality
const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');

console.log('=== NEW SOLICITATION JS LOADED ===');
console.log('ipcRenderer available:', !!ipcRenderer);

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== NEW SOLICITATION PAGE LOADED ===');
    
    const solicitationForm = document.getElementById('solicitationForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const helpBtn = document.getElementById('helpBtn');
    const navItems = document.querySelectorAll('.nav-item');
    
    console.log('Found nav items:', navItems.length);
    // Zone-to-barangay mapping for dependent dropdowns
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

    const zoneData = Object.keys(zoneBarangayMap);
    const barangayData = Object.values(zoneBarangayMap).flat();
    const barangayToZone = barangayData.reduce((acc, barangay) => {
        const zone = Object.keys(zoneBarangayMap).find(key => zoneBarangayMap[key].includes(barangay));
        if (zone) {
            acc[barangay] = zone;
        }
        return acc;
    }, {});

    const chairmanData = [
        'Juan Dela Cruz', 'Maria Santos', 'Pedro Reyes', 'Ana Garcia',
        'Carlos Lopez', 'Rosa Martinez', 'Jose Ramos', 'Cynthia Cruz',
        'Miguel Hernandez', 'Josefina Diaz', 'Luis Gonzales', 'Andrea Dizon',
        'Roberto Fernandez', 'Elena Morales', 'Francisco Ramirez', 'Carmen Flores',
        'Antonio Gutierrez', 'Teresa Alvarez', 'Ricardo Torres', 'Patricia Castillo'
    ];

    const zoneInput = document.getElementById('zone');
    const barangayInput = document.getElementById('barangay');
    const chairmanInput = document.getElementById('chairman');
    const assistanceTypeInput = document.getElementById('assistanceType');
    const assistanceTypeDropdown = document.getElementById('assistanceTypeDropdown');
    const assistanceTypeWrapper = document.getElementById('assistanceTypeWrapper');
    const amountInput = document.getElementById('amount');
    const itemNameInput = document.getElementById('itemName');
    const BARANGAY_DROPDOWN_DELAY_MS = 250;

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
        },
        {
            category: 'Item',
            children: []
        }
    ];

    const expandedAssistanceCategories = new Set();
    let isCustomAssistanceType = false;

    const ItemAmountMode = {
        AMOUNT_ONLY: 'amount-only',
        ITEM_ONLY: 'item-only',
        ITEM_OR_AMOUNT: 'item-or-amount',
        ITEM_AND_AMOUNT: 'item-and-amount'
    };

    const assistanceItemAmountRules = {
        'Event - Wedding': ItemAmountMode.AMOUNT_ONLY,
        'Event - Christening': ItemAmountMode.AMOUNT_ONLY,
        'Event - Birthday': ItemAmountMode.AMOUNT_ONLY,
        'Sport Materials - Volley Ball': ItemAmountMode.ITEM_ONLY,
        'Sport Materials - Basket Ball': ItemAmountMode.ITEM_ONLY,
        'Sport Materials - Badminton': ItemAmountMode.ITEM_ONLY,
        'Sport Materials - Chess': ItemAmountMode.ITEM_ONLY,
        'Sport Materials - Dart': ItemAmountMode.ITEM_ONLY,
        'Medical Items - Wheel Chair': ItemAmountMode.ITEM_OR_AMOUNT,
        'Medical Items - Saklay': ItemAmountMode.ITEM_OR_AMOUNT,
        'Medical Items - BP': ItemAmountMode.ITEM_OR_AMOUNT,
        'Medical Items - Nebulizer': ItemAmountMode.ITEM_OR_AMOUNT,
        'Medical Items - Baby Kit': ItemAmountMode.ITEM_OR_AMOUNT,
        'Optical - Reading Glasses': ItemAmountMode.ITEM_AND_AMOUNT,
        'Optical - Cataract Patient': ItemAmountMode.ITEM_AND_AMOUNT,
        'Animal Assistance - Anti Rabies': ItemAmountMode.AMOUNT_ONLY,
        'Medical Assistance': ItemAmountMode.AMOUNT_ONLY,
        'Financial Assistance': ItemAmountMode.AMOUNT_ONLY,
        'Burial Assistance': ItemAmountMode.AMOUNT_ONLY
    };

    // Function to close all dropdowns
    function closeAllDropdowns(exceptDropdownId) {
        document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
            if (dropdown.id !== exceptDropdownId) {
                dropdown.classList.remove('show');
                dropdown.closest('.autocomplete-wrapper')?.classList.remove('active');
            }
        });

        if (exceptDropdownId !== 'assistanceTypeDropdown') {
            assistanceTypeDropdown?.classList.remove('show');
            assistanceTypeWrapper?.classList.remove('active');
        }
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

    function renderAssistanceTypeTree() {
        if (!assistanceTypeDropdown) {
            return;
        }

        assistanceTypeDropdown.innerHTML = assistanceTypeTree.map(node => {
            const hasChildren = Array.isArray(node.children) && node.children.length > 0;
            const isExpanded = expandedAssistanceCategories.has(node.category);

            if (!hasChildren) {
                return `
                    <button type="button" class="assistance-parent assistance-leaf" data-leaf="${escapeHtml(node.category)}">
                        <span>${escapeHtml(node.category)}</span>
                    </button>
                `;
            }

            const childrenMarkup = node.children.map(child => `
                <button type="button" class="assistance-child" data-child="${escapeHtml(child)}">
                    ${escapeHtml(child)}
                </button>
            `).join('');

            return `
                <button type="button" class="assistance-parent" data-parent="${escapeHtml(node.category)}">
                    <span>${escapeHtml(node.category)}</span>
                    <span class="assistance-parent-arrow ${isExpanded ? 'expanded' : ''}">▸</span>
                </button>
                <div class="assistance-children ${isExpanded ? 'show' : ''}" data-children="${escapeHtml(node.category)}">
                    ${childrenMarkup}
                </div>
            `;
        }).join('');
    }

    function setAssistanceTypeEditable(isEditable) {
        isCustomAssistanceType = isEditable;
        assistanceTypeInput.readOnly = !isEditable;
        assistanceTypeInput.placeholder = isEditable
            ? 'Type Assistance Type'
            : 'Select Assistance Type';

        if (isEditable) {
            assistanceTypeInput.value = String(assistanceTypeInput.value || '').replace(/[^A-Za-z\s]/g, '');
        }
    }

    function getCurrentItemAmountMode(selectedAssistanceType) {
        if (isCustomAssistanceType) {
            return ItemAmountMode.ITEM_OR_AMOUNT;
        }

        const key = String(selectedAssistanceType || '').trim();
        if (!key) {
            return ItemAmountMode.AMOUNT_ONLY;
        }
        return assistanceItemAmountRules[key] || ItemAmountMode.AMOUNT_ONLY;
    }

    function applyItemAmountMode(selectedAssistanceType) {
        if (!amountInput || !itemNameInput) {
            return;
        }

        const mode = getCurrentItemAmountMode(selectedAssistanceType);

        amountInput.disabled = false;
        itemNameInput.disabled = false;
        amountInput.required = false;
        itemNameInput.required = false;

        if (mode === ItemAmountMode.AMOUNT_ONLY) {
            amountInput.required = true;
            itemNameInput.disabled = true;
            itemNameInput.value = '';
            return;
        }

        if (mode === ItemAmountMode.ITEM_ONLY) {
            itemNameInput.required = true;
            amountInput.disabled = true;
            amountInput.value = '';
            return;
        }

        if (mode === ItemAmountMode.ITEM_AND_AMOUNT) {
            amountInput.required = true;
            itemNameInput.required = true;
            return;
        }

        if (mode === ItemAmountMode.ITEM_OR_AMOUNT) {
            return;
        }
    }

    function selectAssistanceType(value, category = '') {
        if (!category && (value === 'Item' || value === 'Quantity')) {
            setAssistanceTypeEditable(true);
            assistanceTypeInput.value = '';
            assistanceTypeDropdown.classList.remove('show');
            assistanceTypeWrapper.classList.remove('active');
            applyItemAmountMode('');
            setTimeout(() => assistanceTypeInput.focus(), 0);
            return;
        }

        setAssistanceTypeEditable(false);
        const selectedValue = category ? `${category} - ${value}` : value;
        assistanceTypeInput.value = selectedValue;
        assistanceTypeDropdown.classList.remove('show');
        assistanceTypeWrapper.classList.remove('active');
        applyItemAmountMode(selectedValue);
    }

    if (assistanceTypeInput && assistanceTypeDropdown && assistanceTypeWrapper) {
        setAssistanceTypeEditable(false);
        renderAssistanceTypeTree();
        applyItemAmountMode(assistanceTypeInput.value);

        assistanceTypeInput.addEventListener('click', (event) => {
            if (isCustomAssistanceType) {
                return;
            }
            event.stopPropagation();
            closeAllDropdowns('assistanceTypeDropdown');
            assistanceTypeDropdown.classList.toggle('show');
            assistanceTypeWrapper.classList.toggle('active', assistanceTypeDropdown.classList.contains('show'));
        });

        assistanceTypeInput.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (isCustomAssistanceType) {
                    setAssistanceTypeEditable(false);
                }
                closeAllDropdowns('assistanceTypeDropdown');
                assistanceTypeDropdown.classList.add('show');
                assistanceTypeWrapper.classList.add('active');
            }
            if (!isCustomAssistanceType && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                closeAllDropdowns('assistanceTypeDropdown');
                assistanceTypeDropdown.classList.toggle('show');
                assistanceTypeWrapper.classList.toggle('active', assistanceTypeDropdown.classList.contains('show'));
            }
            if (event.key === 'Escape') {
                assistanceTypeDropdown.classList.remove('show');
                assistanceTypeWrapper.classList.remove('active');
            }
        });

        assistanceTypeInput.addEventListener('blur', () => {
            if (isCustomAssistanceType && !assistanceTypeInput.value.trim()) {
                setAssistanceTypeEditable(false);
            }
            applyItemAmountMode(assistanceTypeInput.value);
        });

        assistanceTypeInput.addEventListener('input', () => {
            applyItemAmountMode(assistanceTypeInput.value);
        });

        assistanceTypeDropdown.addEventListener('click', (event) => {
            event.stopPropagation();

            const parentButton = event.target.closest('[data-parent]');
            const childButton = event.target.closest('[data-child]');
            const leafButton = event.target.closest('[data-leaf]');

            if (parentButton) {
                const category = parentButton.getAttribute('data-parent');
                const isAlreadyExpanded = expandedAssistanceCategories.has(category);
                expandedAssistanceCategories.clear();
                if (!isAlreadyExpanded) {
                    expandedAssistanceCategories.add(category);
                }
                renderAssistanceTypeTree();
                return;
            }

            if (childButton) {
                const child = childButton.getAttribute('data-child');
                const parentContainer = childButton.closest('[data-children]');
                const category = parentContainer?.getAttribute('data-children') || '';
                selectAssistanceType(child, category);
                return;
            }

            if (leafButton) {
                const leaf = leafButton.getAttribute('data-leaf');
                selectAssistanceType(leaf);
            }
        });

        document.addEventListener('click', (event) => {
            if (!assistanceTypeWrapper.contains(event.target)) {
                assistanceTypeDropdown.classList.remove('show');
                assistanceTypeWrapper.classList.remove('active');
            }
        });
    }

    // Initialize autocomplete for each field
    setupAutocomplete('zone', 'zoneDropdown', () => zoneData, (value) => {
        const normalizedZone = normalizeZone(value);
        zoneInput.value = normalizedZone;
        updateBarangayOptions(normalizedZone);
        openBarangayDropdown();
    });
    setupAutocomplete('barangay', 'barangayDropdown', () => getBarangayOptions(), (value) => {
        const normalizedBarangay = normalizeBarangay(value);
        barangayInput.value = normalizedBarangay;
        const mappedZone = barangayToZone[normalizedBarangay];
        if (mappedZone) {
            zoneInput.value = mappedZone;
            updateBarangayOptions(mappedZone);
        }
        // Clear chairman immediately when barangay changes
        chairmanInput.value = '';
        syncChairmanFromBarangay(true);
    });
    setupAutocomplete('chairman', 'chairmanDropdown', () => getChairmanOptions());

    function normalizeZone(value) {
        return String(value || '')
            .replace(/zone\s*/i, '')
            .replace(/[^0-9]/g, '')
            .trim();
    }

    function normalizeBarangay(value) {
        return String(value || '')
            .replace(/barangay\s*/i, '')
            .replace(/[^0-9]/g, '')
            .trim()
            .toUpperCase();
    }

    function sanitizeLettersOnly(value) {
        return String(value || '').replace(/[^A-Za-z\s]/g, '');
    }

    function sanitizeNumericOnly(value) {
        return String(value || '').replace(/[^0-9]/g, '');
    }

    function sanitizeDecimal(value) {
        const sanitized = String(value || '').replace(/[^0-9.]/g, '');
        const parts = sanitized.split('.');
        if (parts.length <= 1) {
            return sanitized;
        }
        return `${parts[0]}.${parts.slice(1).join('')}`;
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
            const value = String(item || '').trim();
            if (!value) return;
            const key = value.toUpperCase();
            if (!map.has(key)) {
                map.set(key, value);
            }
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    }

    function getChairmanOptions() {
        const contacts = loadBarangayContacts();
        const selectedBarangay = normalizeBarangay(barangayInput.value);
        const fromList = contacts
            .filter(record => {
                if (!selectedBarangay) {
                    return true;
                }
                return normalizeBarangay(record.barangay) === selectedBarangay;
            })
            .map(record => record.current)
            .filter(Boolean);

        const fallback = selectedBarangay
            ? []
            : chairmanData;

        return uniqueSorted([...fromList, ...fallback]);
    }

    function syncChairmanFromBarangay(shouldOpenDropdown = false) {
        const chairmanOptions = getChairmanOptions();
        const currentChairmanValue = String(chairmanInput.value || '').trim();
        const hasMatch = chairmanOptions.some(name => name.toUpperCase() === currentChairmanValue.toUpperCase());

        if (currentChairmanValue && !hasMatch) {
            chairmanInput.value = '';
        }

        if (shouldOpenDropdown) {
            setTimeout(() => {
                chairmanInput.focus();
                chairmanInput.dispatchEvent(new Event('input', { bubbles: true }));
            }, 150);
        }
    }

    function getBarangayOptions() {
        const zone = normalizeZone(zoneInput.value);
        if (zone && zoneBarangayMap[zone]) {
            return zoneBarangayMap[zone];
        }
        return barangayData;
    }

    function updateBarangayOptions(zone) {
        const normalizedZone = normalizeZone(zone);
        const allowedBarangays = zoneBarangayMap[normalizedZone] || barangayData;
        const currentBarangay = normalizeBarangay(barangayInput.value);
        if (currentBarangay && !allowedBarangays.includes(currentBarangay)) {
            barangayInput.value = '';
            syncChairmanFromBarangay(false);
        }
    }

    function openBarangayDropdown() {
        setTimeout(() => {
            barangayInput.focus();
            barangayInput.dispatchEvent(new Event('input', { bubbles: true }));
        }, BARANGAY_DROPDOWN_DELAY_MS);
    }

    zoneInput.addEventListener('blur', () => {
        const normalizedZone = normalizeZone(zoneInput.value);
        if (zoneBarangayMap[normalizedZone]) {
            zoneInput.value = normalizedZone;
            updateBarangayOptions(normalizedZone);
        }
    });

    zoneInput.addEventListener('input', () => {
        zoneInput.value = sanitizeNumericOnly(zoneInput.value);
    });

    barangayInput.addEventListener('blur', () => {
        const normalizedBarangay = normalizeBarangay(barangayInput.value);
        if (barangayToZone[normalizedBarangay]) {
            barangayInput.value = normalizedBarangay;
            zoneInput.value = barangayToZone[normalizedBarangay];
            updateBarangayOptions(zoneInput.value);
        }
        syncChairmanFromBarangay(false);
    });

    barangayInput.addEventListener('input', () => {
        barangayInput.value = sanitizeNumericOnly(barangayInput.value);
        syncChairmanFromBarangay(false);
    });

    chairmanInput.addEventListener('input', () => {
        chairmanInput.value = sanitizeLettersOnly(chairmanInput.value);
    });

    const solicitorInput = document.getElementById('solicitor');
    solicitorInput.addEventListener('input', () => {
        solicitorInput.value = sanitizeLettersOnly(solicitorInput.value);
    });

    itemNameInput.addEventListener('input', () => {
        itemNameInput.value = sanitizeDecimal(itemNameInput.value);
    });

    amountInput.addEventListener('input', () => {
        amountInput.value = sanitizeDecimal(amountInput.value);
    });

    assistanceTypeInput.addEventListener('input', () => {
        if (isCustomAssistanceType) {
            assistanceTypeInput.value = sanitizeLettersOnly(assistanceTypeInput.value);
        }
    });

    // Autocomplete function
    function setupAutocomplete(inputId, dropdownId, getData, onSelect) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        const wrapper = input.closest('.autocomplete-wrapper');
        let selectedIndex = -1;
        let filteredData = [];

        // Mark this as an autocomplete input
        input.setAttribute('data-autocomplete', 'true');

        // Show dropdown on focus
        input.addEventListener('focus', function() {
            closeAllDropdowns(dropdownId);
            filteredData = getData();
            renderDropdown(filteredData, '');
            dropdown.classList.add('show');
            wrapper.classList.add('active');
        });

        // Filter on input
        input.addEventListener('input', function() {
            closeAllDropdowns(dropdownId);
            const value = this.value.toLowerCase();
            filteredData = getData().filter(item => item.toLowerCase().includes(value));
            selectedIndex = -1;
            renderDropdown(filteredData, value);
            dropdown.classList.add('show');
            wrapper.classList.add('active');
        });

        // Handle keyboard navigation
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

            // Add click handlers
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
            if (typeof onSelect === 'function') {
                onSelect(value);
            }
        }
    }


    // Page map for navigation
    const pageMap = {
        'dashboard': 'dashboard.html',
        'new-solicitation': 'new-solicitation.html',
        'records': 'records.html',
        'reports': 'reports.html',
        'summary': 'summary.html',
        'list': 'list.html'
    };

    // Set today's date as default
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // Navigation items click
    navItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('=== NAV ITEM CLICKED ===');
            
            const page = item.dataset.page;
            console.log('Page clicked:', page);
            
            if (!page) {
                console.log('No page data found');
                return;
            }
            
            // If already on this page, just update active state
            if (page === 'new-solicitation') {
                console.log('Already on new-solicitation page');
                navItems.forEach(function(nav) {
                    nav.classList.remove('active');
                });
                item.classList.add('active');
                return;
            }
            
            // Navigate to the page
            const targetPage = pageMap[page];
            console.log('Target page:', targetPage);
            
            if (targetPage) {
                console.log('Sending navigate command to:', targetPage);
                ipcRenderer.send('navigate', targetPage);
            } else {
                console.log('No target page found in pageMap');
                showToast(page + ' page coming soon', 'info');
            }
        });
    });

    // Form submission flag to prevent double submission
    let isSubmitting = false;
    
    // Add click handler to submit button for extra debugging
    const submitButton = document.querySelector('.btn-submit');
    if (submitButton) {
        submitButton.addEventListener('click', function(e) {
            console.log('=== Submit button clicked! ===');
            console.log('isSubmitting:', isSubmitting);
            console.log('Button disabled:', this.disabled);
            console.log('Form checkValidity():', solicitationForm.checkValidity());
            
            // Check each required field
            const requiredFields = solicitationForm.querySelectorAll('[required]');
            console.log('Required fields count:', requiredFields.length);
            requiredFields.forEach(field => {
                if (field.offsetParent !== null) { // Only check visible fields
                    console.log(`Field ${field.id || field.name}: value="${field.value}", valid=${field.validity.valid}`);
                }
            });
        });
    }

    // Form submission
    solicitationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Form submit event triggered');
        console.log('Form validity:', solicitationForm.checkValidity());
        
        // Log all form field values
        const formElements = solicitationForm.elements;
        for (let i = 0; i < formElements.length; i++) {
            const element = formElements[i];
            if (element.name) {
                console.log(`${element.name}: ${element.value}, valid: ${element.validity.valid}`);
            }
        }
        
        // Close any open autocomplete dropdowns
        document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
        document.querySelectorAll('.autocomplete-wrapper').forEach(wrapper => {
            wrapper.classList.remove('active');
        });
        
        const submitBtn = solicitationForm.querySelector('.btn-submit');
        
        // Prevent double submission
        if (isSubmitting) {
            return;
        }
        isSubmitting = true;
        
        // Disable submit button during processing
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
        }
        
        const formData = {
            zone: normalizeZone(document.getElementById('zone').value),
            assistanceType: assistanceTypeInput.value,
            barangay: normalizeBarangay(document.getElementById('barangay').value),
            amount: amountInput.value,
            itemName: document.getElementById('itemName').value,
            chairman: document.getElementById('chairman').value,
            date: document.getElementById('date').value,
            solicitor: document.getElementById('solicitor').value,
            status: document.getElementById('status').value
        };

        const hasAmount = String(formData.amount || '').trim() !== '';
        const hasItem = String(formData.itemName || '').trim() !== '';
        const trimmedItemName = String(formData.itemName || '').trim();
        const parsedAmount = Number(formData.amount);
        const itemAmountMode = getCurrentItemAmountMode(formData.assistanceType);

        // Validate required fields
        if (!formData.zone || !formData.assistanceType || !formData.barangay ||
            !formData.chairman || !formData.date || !formData.solicitor || !formData.status) {
            showToast('Please fill in all required fields', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (!/^\d+$/.test(formData.zone) || !/^\d+$/.test(formData.barangay)) {
            showToast('Zone and Barangay must contain numbers only', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (!/^[A-Za-z\s]+$/.test(String(formData.chairman || '').trim()) ||
            !/^[A-Za-z\s]+$/.test(String(formData.solicitor || '').trim())) {
            showToast('Chairman and Solicitor must contain letters only', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (isCustomAssistanceType && !/^[A-Za-z\s]+$/.test(String(formData.assistanceType || '').trim())) {
            showToast('Assistance Type must contain letters only', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (itemAmountMode === ItemAmountMode.AMOUNT_ONLY && !hasAmount) {
            showToast('Please enter Amount for this assistance type', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (itemAmountMode === ItemAmountMode.ITEM_ONLY && !hasItem) {
            showToast('Please enter Quantity for this assistance type', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (itemAmountMode === ItemAmountMode.ITEM_AND_AMOUNT && (!hasItem || !hasAmount)) {
            showToast('Please enter both Quantity and Amount for this assistance type', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (itemAmountMode === ItemAmountMode.ITEM_OR_AMOUNT && !hasItem && !hasAmount) {
            showToast('Please enter either Quantity or Amount for this assistance type', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (itemAmountMode === ItemAmountMode.ITEM_OR_AMOUNT && hasItem && hasAmount && !isCustomAssistanceType) {
            showToast('Please enter only one: Quantity or Amount for this assistance type', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        if (hasAmount && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
            showToast('Please enter a valid Amount', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            return;
        }

        try {
            // Save the record to localStorage
            console.log('Submitting solicitation record:', formData);
            
            // Get existing records from localStorage
            let records = JSON.parse(localStorage.getItem('solicitationRecords') || '[]');
            let amountRecords = JSON.parse(localStorage.getItem('solicitationAmountRecords') || '[]');
            let itemRecords = JSON.parse(localStorage.getItem('solicitationItemRecords') || '[]');

            const getNextId = (list) => {
                if (!Array.isArray(list) || list.length === 0) {
                    return 1;
                }
                return Math.max(...list.map(entry => Number(entry.id) || 0)) + 1;
            };
            
            // Generate new ID for master records
            const newId = getNextId(records);
            
            // Create new record
            let storedAmount = null;
            let storedItem = null;

            if (itemAmountMode === ItemAmountMode.AMOUNT_ONLY) {
                storedAmount = parsedAmount;
            } else if (itemAmountMode === ItemAmountMode.ITEM_ONLY) {
                storedItem = trimmedItemName;
            } else if (itemAmountMode === ItemAmountMode.ITEM_AND_AMOUNT) {
                storedAmount = parsedAmount;
                storedItem = trimmedItemName;
            } else if (itemAmountMode === ItemAmountMode.ITEM_OR_AMOUNT) {
                if (hasAmount) {
                    storedAmount = parsedAmount;
                }
                if (hasItem) {
                    storedItem = trimmedItemName;
                }
            }

            const newRecord = {
                id: newId,
                zone: formData.zone,
                barangay: formData.barangay,
                chairman: formData.chairman || 'N/A',
                solicitor: formData.solicitor || 'N/A',
                assistance: formData.assistanceType,
                item: storedItem,
                amount: storedAmount,
                date: formData.date,
                status: formData.status
            };

            const baseRecord = {
                zone: formData.zone,
                barangay: formData.barangay,
                chairman: formData.chairman || 'N/A',
                solicitor: formData.solicitor || 'N/A',
                assistance: formData.assistanceType,
                date: formData.date,
                status: formData.status,
                sourceRecordId: newId
            };

            const shouldStoreAmount = storedAmount !== null;
            const shouldStoreItem = storedItem !== null;

            if (shouldStoreAmount) {
                amountRecords.push({
                    id: getNextId(amountRecords),
                    ...baseRecord,
                    amount: storedAmount,
                    item: null
                });
            }

            if (shouldStoreItem) {
                itemRecords.push({
                    id: getNextId(itemRecords),
                    ...baseRecord,
                    amount: null,
                    item: storedItem
                });
            }
            
            // Add to records array
            records.push(newRecord);
            
            // Save back to localStorage
            localStorage.setItem('solicitationRecords', JSON.stringify(records));
            localStorage.setItem('solicitationAmountRecords', JSON.stringify(amountRecords));
            localStorage.setItem('solicitationItemRecords', JSON.stringify(itemRecords));
            
            showToast('Solicitation record saved successfully!', 'success');
            
            // Reset form after short delay
            setTimeout(() => {
                solicitationForm.reset();
                dateInput.value = today;
                assistanceTypeInput.value = '';
                setAssistanceTypeEditable(false);
                expandedAssistanceCategories.clear();
                renderAssistanceTypeTree();
                applyItemAmountMode('');
                assistanceTypeDropdown.classList.remove('show');
                assistanceTypeWrapper.classList.remove('active');
                
                // Hide all autocomplete dropdowns
                document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
                document.querySelectorAll('.autocomplete-wrapper').forEach(wrapper => {
                    wrapper.classList.remove('active');
                });
                
                // Re-enable all form inputs to ensure they're clickable
                document.querySelectorAll('#solicitationForm input, #solicitationForm select').forEach(input => {
                    input.disabled = false;
                    input.style.pointerEvents = 'auto';
                });
                
                // Re-enable submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                }
                
                // Reset submission flag
                isSubmitting = false;
            }, 1500);
        } catch (error) {
            console.error('Error submitting form:', error);
            showToast('Error saving record. Please try again.', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
        }
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel? All unsaved data will be lost.')) {
            solicitationForm.reset();
            dateInput.value = today;
            assistanceTypeInput.value = '';
            setAssistanceTypeEditable(false);
            expandedAssistanceCategories.clear();
            renderAssistanceTypeTree();
            applyItemAmountMode('');
            assistanceTypeDropdown.classList.remove('show');
            assistanceTypeWrapper.classList.remove('active');
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
    amountInput.addEventListener('blur', function() {
        if (this.value) {
            this.value = parseFloat(this.value).toFixed(2);
        }
    });
});
