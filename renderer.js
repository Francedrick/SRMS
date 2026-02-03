// Renderer process code
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const getStartedBtn = document.querySelector('.get-started-btn');
    const cards = document.querySelectorAll('.card');
    const helpIcon = document.querySelector('.help-icon');

    // Get Started button click - Navigate to login
    getStartedBtn.addEventListener('click', () => {
        ipcRenderer.send('navigate', 'login.html');
    });

    // Card click handlers - Navigate to login
    cards.forEach((card, index) => {
        card.addEventListener('click', () => {
            ipcRenderer.send('navigate', 'login.html');
        });
    });

    // Help icon click
    helpIcon.addEventListener('click', () => {
        alert('Need help? Contact IT support at support@manila.gov.ph');
    });
});
