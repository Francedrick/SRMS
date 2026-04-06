(function () {
    function applyShellLayoutParity() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarHeader = document.querySelector('.sidebar-header');
        const sidebarTitle = document.querySelector('.sidebar-title');
        const previewImage = document.querySelector('.preview-image-small');
        const navLabels = document.querySelectorAll('.nav-item span');
        const navArrows = document.querySelectorAll('.nav-arrow');
        const logoutLabel = document.querySelector('.logout-btn span');
        const topHeader = document.querySelector('.top-header');
        const headerTitle = document.querySelector('.header-title');
        const headerRight = document.querySelector('.header-right');
        const userInfo = document.querySelector('.user-info');

        const width = window.innerWidth;

        if (sidebar) {
            if (width <= 768) {
                sidebar.style.width = '100%';
                sidebar.style.padding = '10px';
            } else if (width <= 1024) {
                sidebar.style.width = '84px';
                sidebar.style.padding = '14px 0';
            } else {
                sidebar.style.width = '248px';
                sidebar.style.padding = '14px 0';
            }
        }

        if (sidebarHeader) {
            if (width <= 1024 && width > 768) {
                sidebarHeader.style.padding = '0 8px 18px';
                sidebarHeader.style.justifyContent = 'center';
            } else {
                sidebarHeader.style.padding = '';
                sidebarHeader.style.justifyContent = '';
            }
        }

        if (previewImage) {
            if (width <= 1024 && width > 768) {
                previewImage.style.width = '52px';
                previewImage.style.height = '52px';
            } else {
                previewImage.style.width = '88px';
                previewImage.style.height = '88px';
            }
        }

        const compactSidebar = width <= 1024 && width > 768;
        if (sidebarTitle) sidebarTitle.style.display = compactSidebar ? 'none' : '';
        navLabels.forEach((el) => { el.style.display = compactSidebar ? 'none' : ''; });
        navArrows.forEach((el) => { el.style.display = compactSidebar ? 'none' : ''; });
        if (logoutLabel) logoutLabel.style.display = compactSidebar ? 'none' : '';

        if (topHeader) {
            topHeader.style.padding = width <= 1366 ? '14px 18px' : '18px 32px';

            if (width <= 768) {
                topHeader.style.flexDirection = 'column';
                topHeader.style.alignItems = 'flex-start';
                topHeader.style.gap = '10px';
            } else {
                topHeader.style.flexDirection = '';
                topHeader.style.alignItems = '';
                topHeader.style.gap = '';
            }
        }

        if (headerTitle) headerTitle.style.fontSize = width <= 1366 ? '17px' : '';
        if (headerRight) headerRight.style.gap = width <= 1024 ? '8px' : '';
        if (userInfo) userInfo.style.display = width <= 1024 ? 'none' : '';
    }

    window.applyShellLayoutParity = applyShellLayoutParity;
    document.addEventListener('DOMContentLoaded', applyShellLayoutParity);
    window.addEventListener('resize', applyShellLayoutParity);
})();
