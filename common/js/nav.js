(function () {
    'use strict';

    function initSidebar() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        var brandLink = sidebar.querySelector('.sidebar-brand a');
        var brand = sidebar.querySelector('.sidebar-brand');

        // Wrap brand text in span
        if (brandLink && !brandLink.querySelector('.brand-text')) {
            var icon = brandLink.querySelector('.brand-icon');
            var textNode = icon ? icon.nextSibling : brandLink.firstChild;
            while (textNode) {
                if (textNode.nodeType === 3 && textNode.textContent.trim()) {
                    var span = document.createElement('span');
                    span.className = 'brand-text';
                    span.textContent = textNode.textContent.trim();
                    textNode.replaceWith(span);
                    break;
                }
                textNode = textNode.nextSibling;
            }
        }

        // Create floating toggle ball
        var floatBall = document.createElement('div');
        floatBall.className = 'sidebar-float-ball';
        floatBall.title = '展开导航栏';
        floatBall.innerHTML = '<span class="ball-icon">⚡</span><span class="ball-tooltip">展开导航</span>';
        document.body.appendChild(floatBall);

        // Add toggle button inside sidebar
        if (brand && !brand.querySelector('.sidebar-toggle-btn')) {
            var btn = document.createElement('button');
            btn.className = 'sidebar-toggle-btn';
            btn.title = '折叠导航栏';
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            brand.appendChild(btn);

            // Restore saved state
            var collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
            if (collapsed) {
                sidebar.classList.add('collapsed');
                floatBall.classList.add('visible');
            }

            // Sidebar button: collapse
            btn.addEventListener('click', function () {
                sidebar.classList.add('collapsed');
                floatBall.classList.add('visible');
                localStorage.setItem('sidebar-collapsed', 'true');
            });
        }

        // Float ball: expand
        floatBall.addEventListener('click', function () {
            sidebar.classList.remove('collapsed');
            floatBall.classList.remove('visible');
            localStorage.setItem('sidebar-collapsed', 'false');
        });

        // Mobile: close sidebar on link click
        sidebar.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    var overlay = document.getElementById('sidebarOverlay');
                    if (overlay) overlay.classList.remove('show');
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }


    // Mobile sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('show');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    toggle.addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    overlay.addEventListener('click', closeSidebar);

    // Close sidebar on link click (mobile)
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });
})();
