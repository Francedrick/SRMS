// Login page renderer code
console.log('=== LOGIN.JS STARTING ===');

try {
    const Toastify = require('toastify-js');
    console.log('Toastify loaded');
} catch (e) {
    console.error('Failed to load Toastify:', e);
}

try {
    require('toastify-js/src/toastify.css');
    console.log('Toastify CSS loaded');
} catch (e) {
    console.error('Failed to load Toastify CSS:', e);
}

try {
    const { ipcRenderer } = require('electron');
    console.log('ipcRenderer loaded:', !!ipcRenderer);
} catch (e) {
    console.error('Failed to load ipcRenderer:', e);
}

const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');

console.log('login.js loaded, ipcRenderer available:', !!ipcRenderer);

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
    loginForm.addEventListener('submit', (e) => {
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

        // Temporary demo login (replace with actual authentication)
        const isValidUser = (username === 'user1' && password === 'user123') || (username === 'admin' && password === 'admin');
        console.log('Is valid user:', isValidUser);

        if (isValidUser) {
            // Store user session
            localStorage.setItem('user', JSON.stringify({ username, loggedIn: true }));
            
            console.log('Valid user - navigating immediately to dashboard');
            
            // Try immediate navigation without toast
            try {
                ipcRenderer.send('navigate', 'dashboard.html');
                console.log('Navigate event sent');
            } catch (error) {
                console.error('Error sending navigate event:', error);
            }
        } else {
            console.log('Invalid credentials');
            showToast('Invalid username or password', 'error');
        }
    });

    // Forgot password link
    if (forgotPassword) {
        forgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Password reset feature coming soon', 'info');
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
