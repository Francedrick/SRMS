// Barangay Directory (List) functionality
const Toastify = require('toastify-js');
const { ipcRenderer } = require('electron');

const FIREBASE_PROJECT_ID = 'solicitation-record-management';
const FIREBASE_API_KEY = 'AIzaSyBKWo_Cwk0ZviijLJ5OU1a8Ym1r6e-6p8o';

document.addEventListener('DOMContentLoaded', () => {
    try {
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
        const searchInput = document.getElementById('searchInput');
        const tableBody = document.getElementById('tableBody');
        const tableWrapper = document.getElementById('tableWrapper');
        const emptyState = document.getElementById('emptyState');
        const recordCount = document.getElementById('recordCount');
        const contactsCount = document.getElementById('contactsCount');
        const addContactBtn = document.getElementById('addContactBtn');
        const addContactModal = document.getElementById('addContactModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const addContactForm = document.getElementById('addContactForm');
        const modalTitle = document.querySelector('.modal-title');
        const submitBtn = addContactForm ? addContactForm.querySelector('button[type="submit"]') : null;
        const yearFilter = document.getElementById('yearFilter');
        const yearInput = document.getElementById('yearInput');
        const zoneInput = document.getElementById('zoneInput');
        const barangayInput = document.getElementById('barangayInput');
        const currentChairmanInput = document.getElementById('currentChairmanInput');
        const phoneInput = document.getElementById('phoneInput');
        const BARANGAY_DROPDOWN_DELAY_MS = 300;

        // Function to close all dropdowns
        function closeAllDropdowns(exceptDropdownId) {
            document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
                if (dropdown.id !== exceptDropdownId) {
                    dropdown.classList.remove('show');
                    dropdown.closest('.autocomplete-wrapper')?.classList.remove('active');
                }
            });
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

        const chairmanSeedRaw = `Current Chairman,Former Chairman,Contact No. DIANA ESPINOSA,KRISTO E. HISPANO,9193241686 SALIK M. ARONGO,SALIK M. ARONGO,9951942098 AIDA O. LAVAPIE,AIDA O. LAVAPIE,9176242793 GUILLERMO CAASI,CELERINA N. CAASI,9083202914 SERELIETO C. VIOS,SERELIETO C. VIOS,— SALVADOR FUENTES,JUVY R. FUENTES,9394135388 PEDRITO M. YACUB JR.,PEDRITO M. YACUB JR.,— MA. LORENA P. ARAZA,EDELBERTO P. ARAZA JR.,9206268895 JOHN JIMENEA,GLADYS C. DE JESUS,9473978905 RICHARD GONZALES,JOSE V. CARANTO JR.,9274429965 CAROL S. MALABAG,NESTOR P. MALABAG,9976985858 ROBERT A. BUNDA,LIGAYA V. SANTOS,9293670865 ESCOLASTICA D. AVILA,ESCOLASTICA D. AVILA,9176347744 MANOLITO C. NIETO,MANOLITO C. NIETO,9999046555 EVANGELINA Q. LETE,EVANGELINA Q. LETE,9156249709 MARIA CAASI,TERESITA L. SIKAT,2418624 ERLINDA C. CONSTANTINO,ERLINDA C. CONSTANTINO,9757593833 TEODORO DE CASTRO,EDMUNDO E. FELICIA,9554968531 MA. RUCHELLE A. RELLON,MA. RUCHELLE A. RELLON,9274839592 CARMINA L. TORRES,CARMINA L. TORRES,9153862072 FELIX P. MACAPAGAL,FELIX P. MACAPAGAL,— MARGARITA MENDOZA CLEMENTE,MANUEL MENDOZA,— ROGELIO BAYAN,FLORDELIZA A. BAYAN,9475996880 CYNTHIA B. LLORENTE,CYNTHIA B. LLORENTE,9157242694 ROSENDO M. BARRAZA,ROSENDO M. BARRAZA,— FREIDRICK C. GATMAITAN,NORMA L. DESIDERIO,9290550488 MANUEL GARCIA,"DOMINGO V. ""INGGO"" AMARO",— ALEXANDER L. CUBILLAS,ALEXANDER L. CUBILLAS,— GERALDINE R. SIA,GERALDINE R. SIA,9182902292 ARIES DE LEON,LAZARO C. DE LEON,9176846044 "ESTELA ""EDNA"" REBENITO",ARNOLD B. CHAN,9186539418 ELMA P. RAGUNTON,ELMA P. RAGUNTON,9260458010 TOMAS VALLES,ERVINNE STEWART W. QUE,9178471970 BENIGNO M. ADDUN JR.,BENIGNO M. ADDUN JR.,— MA. ISABEL ALIVIO,ISABELITA C. ALIVIO,9778120986 MA. LUISA ANG,LEODY L. MANUEL,9193769888 DENNIS GO,DAVID Y. GO,9422242907 NELSON N. GINES,NELSON N. GINES,9173819631 CRISTINA ADRIANO,JERRY DACKEL,— APOLLO Q. QUIAMBAO,APOLLO Q. QUIAMBAO,— EDUARDO J. JOSON,EDUARDO J. JOSON,— ROLANDO C. CUSTODIO JR.,ROLANDO C. CUSTODIO JR.,— CATHERINE SY GOTOC,CATHERINE SY GOTOC,9171605718 "AUGUSTO F. ""TOTI"" ABANILLA","AUGUSTO F. ""TOTI"" ABANILLA",9198625010 RAYMOND MENDOZA,"JOSEFA V. ""JOJIE"" MENDOZA",9292030138 JOSUE JASON MAGBANUA,JOSUE JASON MAGBANUA,— EDWIN B. BERTULDES,EDWIN B. BERTULDES,— JAIME VINIEGAS,"GENELYN ""GINA"" RAGASA VENIEGAS",— MARGARET H. REYNA,VIVIAN S. LIQUIRAN,9151550667 LOIDA LATHROP,ELIZABETH L. CAPAPAS,9272342450 ERLINDA DIVINAGRACIA,ERLINDA DIVINAGRACIA,— GARPHIL ANDREY LEE,GARY M. LEE,9169683610 ROEL S. GRAJO,ROEL S. GRAJO,9173960481 EDWIN T. CHAN,EDWIN T. CHAN,917632005 MARC BRIAN S. CO,MARC BRIAN S. CO,9209270669 FELIBUS C. PAPA JR.,FELIBUS C. PAPA JR.,— CELIA S. NEPOMUCENO,CELIA S. NEPOMUCENO,9854216 LEOPOLDO C. URETA,LEOPOLDO C. URETA,927260903 JEFF FRIERA,VIRGINIA E. ELIZAN,9179195897 LARA TEVES,RODRIGO Y. CATAMORA SR.,9270296947 ANTHONY CLEMENTE,ANTHONY D. CLEMENTE,— ANITA D. ROMERO,ANITA D. ROMERO,9285513206 RHODERICK C. RELIVO,ARTHUR L. MURIEL,9194166823 MANUEL LUNA,MANOLITO S. CORPUZ,— ALBERTO C. CARIÑO JR.,ALBERTO C. CARIÑO JR.,9219928873 MARK ANTHONY TORCELINO,WALFRIDO CUSTODIO,9178748884 VICTOR ACIERTO,"NEMENCIO ""MACKY"" L. DOMINGO JR.",9958103231 PIPO BARBOSA,ILUMINADA D. URMENETA,9175867895 ARNEL PALO,MARILOU M. TABO,9209232156 ALLAN T. SALUD,ROLANDO T. SALUD,9213257798 ARMANDO GADDI,ALFREDO OCAMPO JR.,9777815623 VICTORINO BARBOSA,VICTORIANO V. BARBOSA,9394999231 ENG. MARK DELFIN,OSCAR A. ESPIRITU,9179553425 JAIME P. ADRIANO,JAIME P. ADRIANO,9163925500 ERIKA O. PLATON,ERIKA O. PLATON,— ARNEL Y. REBUCAN,EDGAR C. ZABARTE,9289987375 NELSON LELAND DELGADO,NELSON LELAND DELGADO,9268888900 FERDINAND RELLOSA,RENATO O. RELLOSA,9275581875 ADELINA R. GALLEPOSO,ADELINA R. GALLEPOSO,9265069334 RAYMUNDO YUPANGCO,RICO ROMEO VENERACION,— PEDDY SARGADO,FLORDELIZA ROCHA,9455420333 GABRIEL T. BASQUIÑA,ANGELITO DELOS REYES,9165894209 MARILOU LLANTINO,ESTELITA V. NIFAS,9266941343 NORMA B. DELA CRUZ,NORMA B. DELA CRUZ,9168313136 ANTONIO ABAD,MARICRIS VERSOZA,7142614 ARIEL L. DAKIS,ARIEL L. DAKIS,9198072128 ROBERTO C. REYES,VICTOR A. SUNGLAO,9083324656 "NOEL A. ""JIGS"" RAGA","NOEL A. ""JIGS"" RAGA",9368279092 ROSARIO GONZALES,ROSARIO S. GONZALES,9951958539 ALFREDO B. TAN SR.,ALFREDO B. TAN SR.,5266217 MARY ANNE BUENVIAJE,SONIA DUMDUM,9052800585 EDILYN R. DIMANLIG,DENNISE D. RACELIS,9066284705 ROMEL CARREON,DONATO F. ISIDORO,9174438163 MA. CORAZON A. TIBAY,ROSALINDA CAPARAS,9063667161 JOSEFINA SISCAR,GABRIEL J. SAMSON,9456238167 ALFREDO REYNO SR.,ALFREDO REYNO SR.,9276770840 ELVIRA S. SEBIO,ELVIRA S. SEBIO,9232422026 FELIMON G. TUTICA JR.,FELIMON G. TUTICA JR.,9176757033 ROBERT TAN,ANTONIO E. ROMILLO,9953292318 ROGELIO CASTAÑEDA,ROGELIO CASTAÑEDA,9973007438 ROLANDO TUBATO,ROLANDO TUBATO,9184659275 ROSAURO NONATO,MIGUEL Y. BADANDO,— LUZVIMINDA T. ADAME,LUZVIMINDA T. ADAME,9773297003 CHRISTOPHER PEÑA,JUSTINO C. MALABANAN,9064153171 JERRY MAGNAYE,EMMA PANTILO,9156038904 JESSIE AGATON,JESSIE AGATON,9953405303 ANTONIO QUIRANTE,FRANCIS V. VILLEGAS,9189060795 REYNALDO D. HABAYHABAY,REYNALDO D. HABAYHABAY,9423178119 SONNY A. SANTOS,SONNY A. SANTOS,9288442978 ALVIN B. ANGELES,REMIGIO A. ANGELES,9193671426 REYNALDO RESURRECCION,BERNARDO C. BERNARDO,— REYNALDO L. ROXAS,FLORDELIZ S. ROXAS,9081776189 LETICIA S. YANG,LETICIA S. YANG,2552047 ROWENA CHUA,JOSE S. AJERO JR.,9284064561 EDWARD C. RAMIREZ,EDWARD C. RAMIREZ,— RAMON R. GALANG,RAMON R. GALANG,9166165467 SANTIAGO JET M. FABIAN III,LEOGILDO O. ESTACIO,5238562 / 09179116888 EDISON JIMENO,CARLOS W. SAMANIEGO,91784557669 IMELDA C. DE GUZMAN,IMELDA C. DE GUZMAN,9975511699 MARNIE O. BULUAG,MARNIE O. BULUAG,9258859449 ARNOLFO P. LADINES,ARNOLFO P. LADINES,9478517617 HOSPICIO G. ABRITO,HOSPICIO G. ABRITO,— SERAFIN P. VILLALOBOS,SERAFIN P. VILLALOBOS,9053443462 ANSARY A. ALAWIYA,ANSARY A. ALAWIYA,9157425000 LOURDES M. DELGADO,LOURDES M. DELGADO,9493284819 ZENAIDA L. CASTAÑEDA,ZENAIDA L. CASTAÑEDA,9265726261 ORLANDO M. MACUHA,ORLANDO M. MACUHA,9288261213 ROMEO PALILEO,RICARDO R. PALILEO,9185669654 JOVAN ALONZO,ROGELIO D. REYNALDO,9056560052 ALLAN PACHECO,BERNARDITA A. ENALES,9120319299 JAIME CO,HANS U. ALONZO,9193821236 CECILIO T. SACORUM,FRANCO ESPIRITU,9085756809 "NOEL ""MONTI"" NICANOR",VIRGILIO P. DACARA,9279623093 RAFAEL G. PALISOC SR.,RAFAEL G. PALISOC SR.,— RODOLFO L. SADAC,VENER D. CALLAO,9423712754 ZENY DE GUZMAN,JASON SAN JUAN,9564920661 "RAMIL ""RARA"" LOPEZ",MARGARITA D. NABABLIT,9062429989 GLORIA I. HOFFMAN,EMILIO CAÑA,9193227131 ELMER VARGAS,FRANKLIN DEMONTEVERDE,9464129283 JIMMY FORTALEZA,ESMERALDO T. RONTALE,9395224647 MARWIN F. PAMING,LUIS C. BAUTISTA,9462239487 EDUARDO P. DUNGAO JR.,EDUARDO P. DUNGAO JR.,9107869414 JOSIE JIMENEZ,JUANITO S. VESTIL,— ADRIAN O. HUERTA,LORENZO B. TABORA,9083450248 AMADO SORIANO,HECTOR P. OCTAVO,9456798815 CARMELITA P.M. DUANAN,CARMELITA P.M. DUANAN,— ALJHON LUARCA,ASUNCION R. OQUIÑO,— FELIX R. BASAS,FELIX R. BASAS,9089621743 JOSEPH FAJARDO,HERNANDO B. BARROZO,9353362598 SUSAN CORREA,JEAN L. MERCADO,9396112326 ROGELIO JAVIER JR.,ROBERTO G. SANTIAGO,9951397896 BENJAMIN A. PRADA JR.,BENJAMIN A. PRADA JR.,9369543842 VON EDRALIN,ROMMEL R. SUAREZ,9273818281 RICARDO ESPINO,GEORGE B. PATACSIL,9063000090 NORBERTO L. SAMIANA,REYNALDO A. MARTINEZ,09773267725 / 5625019 FERMIN B. EDRA,FERMIN B. EDRA,9173547098 FARIDA LIZARDO,MELITO T. OCSAN,9155350019 GERMAN C. MARIANO,GERMAN C. MARIANO,9214130751 ANA AMOR S. ROJAS,ALDO B. OLLANO,9081733602 JOSE ANTONIO DIMAANO,JUVY F. DIMAANO,9176931925 ALFRED MONTEMAYOR,ALFRED MONTEMAYOR,— BASILIA B. BOLICHE,BASILIA B. BOLICHE,9178332770 ERLINDA S. ROSALES,ERLINDA S. ROSALES,5626698 GRACELI R. DE LEON,GRACELI R. DE LEON,3534905 RUTHCHIE ATIENZA,VENUS V. CALLANTA,9279031615 ROWENA P. CRUZ,ROWENA P. CRUZ,9193125235 LEVI D. MIGUEL,LEVI D. MIGUEL,9205400980 MA. ELIZABETH DIMAYA,YSMAEL C. MALIWAT,9453109673 ALFIE ALBAY,NICASIO S. AZNAR JR.,9206303783 RONALDO NAVARRO,EMMANUEL A. PEREZ,9985944893 IMELDA M. LANTIN,IMELDA M. LANTIN,9053317700 DENNIS DE GUZMAN,JASMIN A. ESTORIA,9458975464 ALLAN ANCHETA,ALLAN ANCHETA,9304348581 EDWIN CONRAD L. OCA JR.,EDWIN CONRAD L. OCA JR.,9192215182 SAMMY HILADO,RUFINO P. CASTRO,9269236163 NORMAN M. IBANEZ,REYNALDO S. RAMIREZ,9199772461 SUE SALAZAR,ARTEMIO B. SALAZAR,9435070415 RICHARD SALAZAR,RICHARD SALAZAR,9994782209 LORNA L. GUETA,LORNA L. GUETA,9217350738 ARMANDO A. TOLENTINO SR.,ARMANDO A. TOLENTINO SR.,9214220472 CLEMENTE ESTA JR.,CLEMENTE ESTA JR.,9192964296 NELLDAN BLAS,LYN BOO C. GERNALE,9158676460 JOEL B. JALOCON,JOEL B. JALOCON,9228716350 STRAUSSER V. TUGNAO,STRAUSSER V. TUGNAO,9202869822`;

        let chairmanDirectoryCache = null;
        let currentChairmanListCache = null;
        let contactListCache = null;

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

        const zoneList = Object.keys(zoneBarangayMap);
        const barangayList = Object.values(zoneBarangayMap).flat();
        const barangayToZone = barangayList.reduce((acc, barangay) => {
            const zone = zoneList.find(key => zoneBarangayMap[key].includes(barangay));
            if (zone) {
                acc[barangay] = zone;
            }
            return acc;
        }, {});

        let seededDirectoryByBarangayCache = null;

        function getCurrentYear() {
            return new Date().getFullYear();
        }

        function getYearOptions() {
            const currentYear = getCurrentYear();
            return Array.from({ length: 21 }, (_, index) => String(currentYear - index));
        }

        // Load data from localStorage with error handling
        let records = [];
        try {
            records = JSON.parse(localStorage.getItem('barangayContacts') || '[]');
            if (!Array.isArray(records)) records = [];
        } catch (e) {
            console.error('Error parsing barangayContacts:', e);
            records = [];
        }

        let editingId = null;
        let nextId = 1;
        try {
            const validIds = records.filter(r => r && typeof r.id === 'number').map(r => r.id);
            nextId = validIds.length ? Math.max(...validIds) + 1 : 1;
        } catch (e) {
            console.error('Error calculating nextId:', e);
            nextId = 1;
        }

    let filtered = [...records];

    // Save records to localStorage
    function saveRecords() {
        localStorage.setItem('barangayContacts', JSON.stringify(records));
    }

    render();

    // Warm up heavy chairman parsing after first paint to keep initial page open responsive.
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => {
            ensureChairmanDataLoaded();
        }, { timeout: 1500 });
    }

    refreshYearFilterOptions();
    syncRecordsFromFirebase();

    async function syncRecordsFromFirebase(showSuccessToast = true) {
        try {
            const remoteRecords = await fetchListCollectionFromFirebase();
            records = remoteRecords;
            filtered = [...records];
            const validIds = records.filter(r => typeof r.id === 'number').map(r => r.id);
            nextId = validIds.length ? Math.max(...validIds) + 1 : 1;

            saveRecords();
            refreshYearFilterOptions();
            applySearchFilter();
            if (showSuccessToast) {
                showToast('List loaded from Firebase', 'success');
            }
        } catch (error) {
            console.error('Failed to fetch Firebase list collection:', error);
            showToast('Unable to fetch Firebase list. Showing local data.', 'info');
        }
    }

    async function fetchListCollectionFromFirebase() {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/list?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) {
            const details = await response.text();
            throw new Error(`Firestore REST error (${response.status}): ${details}`);
        }

        const payload = await response.json();
        const documents = Array.isArray(payload.documents) ? payload.documents : [];
        return documents.map((doc, index) => mapFirebaseListDocument(doc, index));
    }

    function getFirestoreFieldString(fields, key) {
        const field = fields && fields[key];
        if (!field) return '';
        if (typeof field.stringValue === 'string') return field.stringValue;
        if (typeof field.integerValue === 'string') return field.integerValue;
        if (typeof field.doubleValue === 'number') return String(field.doubleValue);
        return '';
    }

    function mapFirebaseListDocument(doc, index) {
        const fields = doc?.fields || {};
        const firebaseDocId = String(doc?.name || '').split('/').pop() || '';
        const zoneRaw = getFirestoreFieldString(fields, 'zone');
        const barangayRaw = getFirestoreFieldString(fields, 'barangay');
        const currentRaw = getFirestoreFieldString(fields, 'chairman') || getFirestoreFieldString(fields, 'currentChairman');
        const phoneRaw = getFirestoreFieldString(fields, 'contactNumber');
        const yearRaw = getFirestoreFieldString(fields, 'year');

        const zone = normalizeZone(zoneRaw);
        const barangay = normalizeBarangay(barangayRaw);
        const current = String(currentRaw || '').trim();
        const phone = String(phoneRaw || '').trim();
        const year = String(yearRaw || '').trim();

        return {
            id: index + 1,
            firebaseDocId,
            year,
            zone,
            barangay,
            current,
            initials: buildInitialsFromName(current),
            phone
        };
    }

    function buildInitialsFromName(name) {
        return String(name || '')
            .split(/\s+/)
            .filter(Boolean)
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 3);
    }

    function formatZoneForFirebase(zone) {
        const normalized = normalizeZone(zone);
        return normalized ? `Zone ${normalized}` : '';
    }

    function formatBarangayForFirebase(barangay) {
        const normalized = normalizeBarangay(barangay);
        return normalized ? `Barangay ${normalized}` : '';
    }

    function buildFirebaseListFields(payload) {
        return {
            zone: { stringValue: formatZoneForFirebase(payload.zone) },
            barangay: { stringValue: formatBarangayForFirebase(payload.barangay) },
            chairman: { stringValue: String(payload.chairman || '').trim() },
            contactNumber: { stringValue: String(payload.phone || '').trim() },
            year: { stringValue: String(payload.year || '').trim() }
        };
    }

    async function createFirebaseListContact(payload) {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/list?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: buildFirebaseListFields(payload) })
        });

        if (!response.ok) {
            const details = await response.text();
            throw new Error(`Create list contact failed (${response.status}): ${details}`);
        }

        const created = await response.json();
        return String(created?.name || '').split('/').pop() || '';
    }

    async function updateFirebaseListContact(firebaseDocId, payload) {
        const fieldPaths = [
            'zone',
            'barangay',
            'chairman',
            'contactNumber',
            'year'
        ].map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&');

        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/list/${encodeURIComponent(firebaseDocId)}?key=${FIREBASE_API_KEY}&${fieldPaths}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: buildFirebaseListFields(payload) })
        });

        if (!response.ok) {
            const details = await response.text();
            throw new Error(`Update list contact failed (${response.status}): ${details}`);
        }
    }

    async function deleteFirebaseListContact(firebaseDocId) {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/list/${encodeURIComponent(firebaseDocId)}?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) {
            const details = await response.text();
            throw new Error(`Delete list contact failed (${response.status}): ${details}`);
        }
    }

    function populateYearInputOptions() {
        if (!yearInput) return;

        const yearOptions = getYearOptions();
        yearInput.innerHTML = yearOptions
            .map(year => `<option value="${year}">${year}</option>`)
            .join('');
        yearInput.value = String(getCurrentYear());
    }

    populateYearInputOptions();

    if (yearFilter) {
        yearFilter.addEventListener('change', () => {
            applySearchFilter();
        });
    }

    if (zoneInput && barangayInput) {
        setupAutocomplete('zoneInput', 'zoneDropdown', () => zoneList, (value) => {
            const normalizedZone = normalizeZone(value);
            zoneInput.value = normalizedZone;
            updateBarangayOptions(normalizedZone);
            focusAndOpenBarangayDropdown();
        });
        setupAutocomplete('barangayInput', 'barangayDropdown', () => getBarangayOptions(), (value) => {
            const normalizedBarangay = normalizeBarangay(value);
            barangayInput.value = normalizedBarangay;
            const mappedZone = barangayToZone[normalizedBarangay];
            if (mappedZone) {
                zoneInput.value = mappedZone;
                updateBarangayOptions(mappedZone);
            }
            currentChairmanInput.value = '';
        });

        zoneInput.addEventListener('blur', () => {
            const normalizedZone = normalizeZone(zoneInput.value);
            if (zoneBarangayMap[normalizedZone]) {
                zoneInput.value = normalizedZone;
                updateBarangayOptions(normalizedZone);
            }
        });

        barangayInput.addEventListener('blur', () => {
            const normalizedBarangay = normalizeBarangay(barangayInput.value);
            if (barangayToZone[normalizedBarangay]) {
                barangayInput.value = normalizedBarangay;
                zoneInput.value = barangayToZone[normalizedBarangay];
                updateBarangayOptions(zoneInput.value);
            }
        });
    }

    // Chairman and contact are manual input fields (no autocomplete behavior).

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (!page) return;

            // If already on this page, just update active state
            if (page === 'list') {
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

    // Search
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            applySearchFilter();
        });
    }

    if (addContactBtn) {
        addContactBtn.addEventListener('click', () => {
            openModal('add');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            closeModal();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            closeModal();
        });
    }

    // Close modal when clicking outside
    if (addContactModal) {
        addContactModal.addEventListener('click', (e) => {
            if (e.target === addContactModal) {
                closeModal();
            }
        });
    }

    // Handle edit/delete actions
    if (tableBody) {
        tableBody.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('.btn-action');
        if (!actionBtn) return;

        e.preventDefault();
        const action = actionBtn.dataset.action;
        const recordId = Number(actionBtn.dataset.id);
        const record = records.find(r => r.id === recordId);

        if (!record) return;

        if (action === 'edit') {
            openModal('edit', record);
            return;
        }

        if (action === 'delete') {
            if (confirm('Delete this contact? This action cannot be undone.')) {
                try {
                    if (record.firebaseDocId) {
                        await deleteFirebaseListContact(record.firebaseDocId);
                    }
                    records = records.filter(r => r.id !== recordId);
                    saveRecords();
                    refreshYearFilterOptions();
                    applySearchFilter();
                    await syncRecordsFromFirebase(false);
                    showToast('Contact deleted', 'success');
                } catch (error) {
                    console.error('Delete failed:', error);
                    showToast('Failed to delete contact in Firebase', 'error');
                }
            }
        }
        });
    }

    // Handle form submission
    if (addContactForm) {
        addContactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const zone = normalizeZone(document.getElementById('zoneInput').value.trim());
        const year = String(yearInput?.value || '').trim();
        const barangay = normalizeBarangay(document.getElementById('barangayInput').value.trim());
        const chairman = document.getElementById('currentChairmanInput').value.trim();
        const phone = document.getElementById('phoneInput').value.trim();

        if (!/^\d{4}$/.test(year)) {
            showToast('Please enter a valid 4-digit year.', 'error');
            return;
        }

        // Generate initials from the current chairman's name
        const initials = chairman
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 3);

        const payload = {
            year,
            zone,
            barangay,
            chairman,
            phone
        };

        try {
            if (editingId) {
                const existing = records.find(r => r.id === editingId);
                if (!existing) {
                    showToast('Unable to find record to update', 'error');
                    return;
                }

                if (existing.firebaseDocId) {
                    await updateFirebaseListContact(existing.firebaseDocId, payload);
                } else {
                    existing.firebaseDocId = await createFirebaseListContact(payload);
                }

                existing.year = year;
                existing.zone = zone;
                existing.barangay = barangay;
                existing.current = chairman;
                existing.initials = initials;
                existing.phone = phone;

                saveRecords();
                await syncRecordsFromFirebase(false);
                showToast('Contact updated successfully!', 'success');
            } else {
                const firebaseDocId = await createFirebaseListContact(payload);
                const newContact = {
                    id: nextId++,
                    firebaseDocId,
                    year: year,
                    zone: zone,
                    barangay: barangay,
                    current: chairman,
                    initials: initials,
                    phone: phone
                };
                records.push(newContact);
                saveRecords();
                await syncRecordsFromFirebase(false);
                showToast('Contact added successfully!', 'success');
            }

            refreshYearFilterOptions();
            applySearchFilter();
            closeModal();
        } catch (error) {
            console.error('Save failed:', error);
            showToast('Failed to save contact to Firebase', 'error');
        }
        });
    }

    function openModal(mode, record = null) {
        if (!addContactForm || !modalTitle || !submitBtn || !addContactModal) return;
        
        addContactForm.reset();
        if (mode === 'edit' && record) {
            editingId = record.id;
            modalTitle.textContent = 'Edit Contact';
            submitBtn.textContent = 'Save Changes';
            if (yearInput) {
                populateYearInputOptions();
                yearInput.value = String(record.year || getCurrentYear());
            }
            document.getElementById('zoneInput').value = normalizeZone(record.zone);
            document.getElementById('barangayInput').value = normalizeBarangay(record.barangay);
            document.getElementById('currentChairmanInput').value = record.current;
            document.getElementById('phoneInput').value = record.phone;
            updateBarangayOptions(document.getElementById('zoneInput').value);
        } else {
            editingId = null;
            modalTitle.textContent = 'Add New Contact';
            submitBtn.textContent = 'Add Contact';
            if (yearInput) {
                populateYearInputOptions();
            }
            updateBarangayOptions('');
        }
        addContactModal.classList.add('show');
    }

    function closeModal() {
        if (!addContactModal || !addContactForm) return;
        
        addContactModal.classList.remove('show');
        editingId = null;
        addContactForm.reset();
        if (yearInput) {
            yearInput.value = String(getCurrentYear());
        }
    }

    function applySearchFilter() {
        const term = String(searchInput?.value || '').toLowerCase();
        const selectedYear = String(yearFilter?.value || '').trim();
        filtered = records.filter(r =>
            (!selectedYear || selectedYear === 'all' || String(r.year || '') === selectedYear) &&
            (
                String(r.year || '').toLowerCase().includes(term) ||
                r.zone.toLowerCase().includes(term) ||
                r.barangay.toLowerCase().includes(term) ||
                r.current.toLowerCase().includes(term) ||
                r.phone.toLowerCase().includes(term)
            )
        );
        render();
    }

    function refreshYearFilterOptions() {
        if (!yearFilter) {
            return;
        }

        const previousValue = String(yearFilter.value || 'all');
        const yearOptions = getYearOptions();
        const recordYears = Array.from(new Set(records.map(r => String(r.year || '').trim()).filter(Boolean)))
            .sort((a, b) => Number(b) - Number(a));

        const allYears = Array.from(new Set([...recordYears, ...yearOptions]))
            .sort((a, b) => Number(b) - Number(a));

        yearFilter.innerHTML = `<option value="all">All Years</option>${allYears
            .map(year => `<option value="${year}">${year}</option>`)
            .join('')}`;

        yearFilter.value = allYears.includes(previousValue) ? previousValue : 'all';
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

    function getBarangayOptions() {
        if (!zoneInput) return barangayList;
        const zone = normalizeZone(zoneInput.value);
        if (zone && zoneBarangayMap[zone]) {
            return zoneBarangayMap[zone];
        }
        return barangayList;
    }

    function updateBarangayOptions(zone) {
        if (!barangayInput) return;
        const normalizedZone = normalizeZone(zone);
        const allowedBarangays = zoneBarangayMap[normalizedZone] || barangayList;
        const currentBarangay = normalizeBarangay(barangayInput.value);
        if (currentBarangay && !allowedBarangays.includes(currentBarangay)) {
            barangayInput.value = '';
        }
    }

    function focusAndOpenBarangayDropdown() {
        if (!barangayInput) return;
        setTimeout(() => {
            barangayInput.focus();
            barangayInput.dispatchEvent(new Event('input', { bubbles: true }));
        }, BARANGAY_DROPDOWN_DELAY_MS);
    }

    function ensureChairmanDataLoaded() {
        if (chairmanDirectoryCache) {
            return;
        }

        chairmanDirectoryCache = buildChairmanDirectory(chairmanSeedRaw);
        currentChairmanListCache = uniqueSorted(chairmanDirectoryCache.map(row => row.current).filter(Boolean));
        contactListCache = uniqueSorted(chairmanDirectoryCache.map(row => row.contact).filter(Boolean));
    }

    function getChairmanDirectory() {
        ensureChairmanDataLoaded();
        return chairmanDirectoryCache;
    }

    function getSeededDirectoryByBarangay() {
        if (!seededDirectoryByBarangayCache) {
            seededDirectoryByBarangayCache = buildSeededDirectoryByBarangay();
        }
        return seededDirectoryByBarangayCache;
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

    function autoFillByBarangay(barangayValue) {
        if (!currentChairmanInput || !phoneInput) return;

        const normalizedBarangay = normalizeBarangay(barangayValue);
        if (!normalizedBarangay) {
            return;
        }

        const matchedRecord = records.find(record =>
            normalizeBarangay(record.barangay) === normalizedBarangay
        );

        const fallbackRecord = getSeededDirectoryByBarangay()[normalizedBarangay];
        const sourceRecord = matchedRecord || fallbackRecord;

        if (!sourceRecord) {
            return;
        }

        currentChairmanInput.value = sourceRecord.current || '';
        phoneInput.value = sourceRecord.phone || sourceRecord.contact || '';
    }

    function buildSeededDirectoryByBarangay() {
        const map = {};
        const chairmanDirectory = getChairmanDirectory();
        const limit = Math.min(barangayList.length, chairmanDirectory.length);

        for (let index = 0; index < limit; index += 1) {
            const barangayKey = normalizeBarangay(barangayList[index]);
            if (!barangayKey || map[barangayKey]) {
                continue;
            }
            map[barangayKey] = chairmanDirectory[index];
        }

        return map;
    }

    function setupAutocomplete(inputId, dropdownId, getData, onSelect) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!input || !dropdown) return;

        const wrapper = input.closest('.autocomplete-wrapper');
        let selectedIndex = -1;
        let filteredData = [];

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

        input.setAttribute('data-autocomplete', 'true');

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
            if (typeof onSelect === 'function') {
                onSelect(value);
            }
        }
    }

    function render() {
        if (!tableBody || !tableWrapper || !emptyState || !recordCount || !contactsCount) {
            console.error('Required DOM elements not found');
            return;
        }

        recordCount.textContent = `Showing ${filtered.length} barangay records`;
        contactsCount.textContent = `Total contacts: ${filtered.length}`;

        if (!filtered.length) {
            tableWrapper.classList.add('hidden');
            emptyState.classList.add('show');
        } else {
            tableWrapper.classList.remove('hidden');
            emptyState.classList.remove('show');
        }

        tableBody.innerHTML = filtered.map(r => `
            <tr>
                <td>${r.zone}</td>
                <td>${r.barangay}</td>
                <td>
                    <div class="name-pill">
                        <span class="avatar">${r.initials}</span>
                        <span>${r.current}</span>
                    </div>
                </td>
                <td><a class="contact-link" href="tel:${r.phone.replace(/[^0-9+]/g,'')}">${r.phone}</a></td>
                <td>${r.year || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" data-action="edit" data-id="${r.id}" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-action btn-delete" data-action="delete" data-id="${r.id}" title="Delete">
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

    // Header buttons
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('user');
                ipcRenderer.send('navigate', 'login.html');
            }
        });
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

    function buildChairmanDirectory(raw) {
        const normalizedRaw = String(raw || '')
            .replace(/\u00A0/g, ' ')
            .replace(/Contact No\.(?!,)/, 'Contact No.,')
            .replace(/([0-9+][0-9+\s/]*[0-9])\s+(?=["A-Z\p{Lu}])/gu, '$1,')
            .replace(/([—–-])\s+(?=["A-Z\p{Lu}])/gu, '$1,');

        const tokens = parseCsvTokens(normalizedRaw).filter(Boolean);
        if (tokens.length >= 3 && tokens[0].toLowerCase().includes('current chairman')) {
            tokens.splice(0, 3);
        }

        const rows = [];
        for (let i = 0; i + 2 < tokens.length; i += 3) {
            const current = sanitizeName(tokens[i]);
            const former = sanitizeName(tokens[i + 1]);
            const contact = sanitizeContact(tokens[i + 2]);

            if (!current && !former && !contact) {
                continue;
            }
            rows.push({ current, former, contact });
        }

        return rows;
    }

    function parseCsvTokens(raw) {
        const tokens = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < raw.length; i += 1) {
            const char = raw[i];
            if (char === '"') {
                if (inQuotes && raw[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === ',' && !inQuotes) {
                tokens.push(current.trim());
                current = '';
                continue;
            }

            current += char;
        }

        if (current.trim()) {
            tokens.push(current.trim());
        }

        return tokens;
    }

    function sanitizeName(value) {
        const normalized = String(value || '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!normalized || normalized === '-' || normalized === '—' || normalized === '–') {
            return '';
        }

        return normalized;
    }

    function sanitizeContact(value) {
        const normalized = String(value || '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!normalized || normalized === '-' || normalized === '—' || normalized === '–') {
            return '';
        }

        return normalized;
    }

    function uniqueSorted(list) {
        const map = new Map();
        list.forEach(item => {
            const key = item.toUpperCase();
            if (!map.has(key)) {
                map.set(key, item);
            }
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    }

    function normalizeName(value) {
        return String(value || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
    }
    } catch (error) {
        console.error('Critical error in list.js:', error);
        document.body.innerHTML = '<div style=\"padding: 20px; color: red;\">Error loading page. Please check console for details.</div>';
    }
});
