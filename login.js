// Login page renderer code
console.log('=== LOGIN.JS STARTING ===');

try {
    const Toastify = require('toastify-js');
    console.log('Toastify loaded');
} catch (e) {
    console.error('Failed to load Toastify:', e);
}

try {
    const { ipcRenderer } = require('electron');
    console.log('ipcRenderer loaded:', !!ipcRenderer);
} catch (e) {
    console.error('Failed to load ipcRenderer:', e);
}

const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');
const path = require('path');
const { pathToFileURL } = require('url');

const FIREBASE_PROJECT_ID = 'solicitation-record-management';
const FIREBASE_API_KEY = 'AIzaSyBKWo_Cwk0ZviijLJ5OU1a8Ym1r6e-6p8o';

console.log('login.js loaded, ipcRenderer available:', !!ipcRenderer);

function normalizeCredential(value) {
    return String(value || '').trim().toLowerCase();
}

function getFirestoreFieldString(fields, key) {
    const field = fields && fields[key];
    if (!field) return '';

    if (typeof field.stringValue === 'string') return field.stringValue;
    if (typeof field.integerValue === 'string') return field.integerValue;
    if (typeof field.doubleValue === 'number') return String(field.doubleValue);
    if (typeof field.booleanValue === 'boolean') return String(field.booleanValue);
    return '';
}

async function fetchUserDocuments() {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/user?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Firestore REST error (${response.status}): ${details}`);
    }
    const payload = await response.json();
    return Array.isArray(payload.documents) ? payload.documents : [];
}

async function updateUserPassword(firebaseDocId, newPassword) {
    const encodedDocId = encodeURIComponent(String(firebaseDocId || '').trim());
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/user/${encodedDocId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=password`;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                password: { stringValue: String(newPassword || '') }
            }
        })
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Password update failed (${response.status}): ${details}`);
    }
}

function navigateToDashboard() {
    try {
        ipcRenderer.send('navigate', 'dashboard.html');
        console.log('Navigate event sent');
    } catch (navError) {
        console.error('IPC navigation failed, using fallback:', navError);
    }

    // Absolute fallback to avoid relative-path issues.
    setTimeout(() => {
        try {
            const dashboardPath = path.join(__dirname, '..', 'pages', 'dashboard.html');
            window.location.href = pathToFileURL(dashboardPath).toString();
        } catch (fallbackError) {
            console.error('Fallback dashboard navigation failed:', fallbackError);
        }
    }, 250);
}

// Create floating particles
function createParticles() {
    const particlesContainer = document.getElementById('particlesContainer');
    if (!particlesContainer) return;

    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const startX = Math.random() * window.innerWidth;
        const duration = Math.random() * 10 + 10;
        const delay = Math.random() * 5;
        
        particle.style.left = startX + 'px';
        particle.style.animationDuration = duration + 's';
        particle.style.animationDelay = delay + 's';
        
        particlesContainer.appendChild(particle);
    }
}

// Initialize particles on load
createParticles();

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const forgotPassword = document.getElementById('forgotPassword');
    const rememberMe = document.getElementById('rememberMe');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const forgotModalClose = document.getElementById('forgotModalClose');
    const forgotCancelBtn = document.getElementById('forgotCancelBtn');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotStepVerify = document.getElementById('forgotStepVerify');
    const forgotStepReset = document.getElementById('forgotStepReset');
    const forgotUsernameInput = document.getElementById('forgotUsername');
    const forgotCurrentPasswordInput = document.getElementById('forgotCurrentPassword');
    const forgotVerifyBtn = document.getElementById('forgotVerifyBtn');
    const forgotVerifiedUsername = document.getElementById('forgotVerifiedUsername');
    const forgotNewPasswordInput = document.getElementById('forgotNewPassword');
    const forgotConfirmPasswordInput = document.getElementById('forgotConfirmPassword');

    let forgotMatchedDocId = '';
    let forgotMatchedUsername = '';

    if (forgotPasswordModal) {
        forgotPasswordModal.classList.remove('show');
        forgotPasswordModal.setAttribute('aria-hidden', 'true');
    }

    console.log('Form elements found:', {
        loginForm: !!loginForm,
        togglePassword: !!togglePassword,
        passwordInput: !!passwordInput,
        forgotPassword: !!forgotPassword,
        rememberMe: !!rememberMe
    });

    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }

    // Add hover effect to login card
    const loginCard = document.querySelector('.login-card');
    const loginSection = document.querySelector('.login-section');
    
    if (loginSection) {
        loginSection.addEventListener('mouseenter', () => {
            loginCard?.classList.add('hovered');
        });
        
        loginSection.addEventListener('mouseleave', () => {
            loginCard?.classList.remove('hovered');
        });
    }

    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.classList.toggle('active');
        });
    }

    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Login form submitted');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        console.log('Username:', username, 'Password length:', password.length);

        // Basic validation
        if (!username || !password) {
            console.log('Validation failed - empty fields');
            showToast('Please enter both username and password', 'error');
            return;
        }

        try {
            const userInput = String(username || '').trim();
            const passInput = String(password || '').trim();
            const normalizedUserInput = normalizeCredential(userInput);
            const normalizedPassInput = String(passInput);

            const documents = await fetchUserDocuments();
            console.log('Fetched user docs count:', documents.length);

            if (documents.length === 0) {
                console.log('No matching user found');
                showToast('Invalid username or password', 'error');
                return;
            }

            const matchedDoc = documents.find((docSnap) => {
                const fields = docSnap.fields || {};
                const storedUser = normalizeCredential(
                    getFirestoreFieldString(fields, 'user') || getFirestoreFieldString(fields, 'username')
                );
                const storedPassword = String(getFirestoreFieldString(fields, 'password'));
                return storedUser === normalizedUserInput && storedPassword === normalizedPassInput;
            });

            const isValidPassword = Boolean(matchedDoc);

            if (!isValidPassword) {
                console.log('Password mismatch for user:', userInput);
                showToast('Invalid username or password', 'error');
                return;
            }

            localStorage.setItem('user', JSON.stringify({ username: userInput, loggedIn: true }));
            navigateToDashboard();
        } catch (error) {
            console.error('Firebase login error:', error);
            showToast(`Login failed: ${error.code || 'unknown error'}`, 'error');
        }
    });

    function resetForgotModalState() {
        forgotMatchedDocId = '';
        forgotMatchedUsername = '';

        if (forgotPasswordForm) {
            forgotPasswordForm.reset();
        }
        if (forgotStepVerify) {
            forgotStepVerify.classList.remove('forgot-hidden');
        }
        if (forgotStepReset) {
            forgotStepReset.classList.add('forgot-hidden');
        }
        if (forgotVerifiedUsername) {
            forgotVerifiedUsername.textContent = '-';
        }
    }

    function openForgotModal() {
        if (!forgotPasswordModal) return;

        resetForgotModalState();
        const loginUsername = String(document.getElementById('username')?.value || '').trim();
        if (forgotUsernameInput && loginUsername) {
            forgotUsernameInput.value = loginUsername;
        }

        forgotPasswordModal.classList.add('show');
        forgotPasswordModal.setAttribute('aria-hidden', 'false');
    }

    function closeForgotModal() {
        if (!forgotPasswordModal) return;

        forgotPasswordModal.classList.remove('show');
        forgotPasswordModal.setAttribute('aria-hidden', 'true');
        resetForgotModalState();
    }

    if (forgotPassword) {
        forgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            openForgotModal();
        });
    }

    if (forgotModalClose) {
        forgotModalClose.addEventListener('click', closeForgotModal);
    }

    if (forgotCancelBtn) {
        forgotCancelBtn.addEventListener('click', closeForgotModal);
    }

    if (forgotPasswordModal) {
        forgotPasswordModal.addEventListener('click', (e) => {
            if (e.target === forgotPasswordModal) {
                closeForgotModal();
            }
        });
    }

    if (forgotVerifyBtn) {
        forgotVerifyBtn.addEventListener('click', async () => {
            const usernameInput = String(forgotUsernameInput?.value || '').trim();
            const currentPasswordInput = String(forgotCurrentPasswordInput?.value || '').trim();
            const normalizedUserInput = normalizeCredential(usernameInput);

            if (!normalizedUserInput || !currentPasswordInput) {
                showToast('Username and current password are required', 'error');
                return;
            }

            try {
                const documents = await fetchUserDocuments();
                const matchedDoc = documents.find((docSnap) => {
                    const fields = docSnap.fields || {};
                    const storedUser = normalizeCredential(
                        getFirestoreFieldString(fields, 'user') || getFirestoreFieldString(fields, 'username')
                    );
                    const storedPassword = String(getFirestoreFieldString(fields, 'password'));
                    return storedUser === normalizedUserInput && storedPassword === currentPasswordInput;
                });

                if (!matchedDoc) {
                    showToast('Invalid username or current password', 'error');
                    return;
                }

                forgotMatchedDocId = String(matchedDoc?.name || '').split('/').pop();
                forgotMatchedUsername = String(
                    getFirestoreFieldString(matchedDoc.fields || {}, 'user') ||
                    getFirestoreFieldString(matchedDoc.fields || {}, 'username') ||
                    usernameInput
                ).trim();

                if (!forgotMatchedDocId) {
                    showToast('Unable to identify user record', 'error');
                    return;
                }

                if (forgotVerifiedUsername) {
                    forgotVerifiedUsername.textContent = forgotMatchedUsername || usernameInput;
                }
                if (forgotStepVerify) {
                    forgotStepVerify.classList.add('forgot-hidden');
                }
                if (forgotStepReset) {
                    forgotStepReset.classList.remove('forgot-hidden');
                }
                if (forgotNewPasswordInput) {
                    forgotNewPasswordInput.focus();
                }

                showToast('User verified. Set your new password.', 'success');
            } catch (error) {
                console.error('User verification error:', error);
                showToast('Failed to verify user', 'error');
            }
        });
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!forgotMatchedDocId) {
                showToast('Please verify user first', 'error');
                return;
            }

            const newPassword = String(forgotNewPasswordInput?.value || '').trim();
            const confirmPassword = String(forgotConfirmPasswordInput?.value || '').trim();

            if (newPassword.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }

            try {
                await updateUserPassword(forgotMatchedDocId, newPassword);
                showToast('Password updated successfully', 'success');
                closeForgotModal();
            } catch (error) {
                console.error('Forgot password error:', error);
                showToast('Failed to reset password', 'error');
            }
        });
    }

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
});
