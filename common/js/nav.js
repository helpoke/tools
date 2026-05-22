(function () {
    'use strict';

    // 工具数据（全局共享，用于导航栏、搜索、最近使用记录）
    window.toolsData = [
        { name: '图片压缩', icon: '📦', url: 'image/compressor', category: '图片工具' },
        { name: '图片转换', icon: '🔄', url: 'image/convert', category: '图片工具' },
        { name: '图片水印', icon: '💧', url: 'image/watermark', category: '图片工具' },
        { name: '图片裁剪', icon: '✂️', url: 'image/cropping', category: '图片工具' },
        { name: '视频裁剪', icon: '✂️', url: 'video/cropping', category: '视频工具' },
        { name: '视频水印', icon: '🎥', url: 'video/watermark', category: '视频工具' },
        { name: '视频转换', icon: '🔄', url: 'video/convert', category: '视频工具' },
        { name: '视频转GIF', icon: '🖼️', url: 'video/gif', category: '视频工具' },
        { name: 'JSON格式化', icon: '{ }', url: 'json', category: '数据开发工具' },
        { name: 'YAML格式化', icon: '⚙️', url: 'yaml', category: '数据开发工具' },
        { name: 'Pug格式化', icon: '🌿', url: 'pug', category: '数据开发工具' },
        { name: 'XML格式化', icon: '📐', url: 'xml', category: '数据开发工具' },
        { name: 'SQL格式化', icon: '🗃️', url: 'sql', category: '数据开发工具' },
        { name: '密码生成', icon: '🔑', url: 'pwd', category: '实用工具' },
        { name: 'UUID生成', icon: '🆔', url: 'uuid', category: '实用工具' },
        { name: 'Mermaid图表', icon: '📊', url: 'mermaid', category: '实用工具' },
        { name: 'MD5加密', icon: '🔐', url: 'md5', category: '加密安全工具' },
        { name: 'SHA加密', icon: '🔏', url: 'sha', category: '加密安全工具' },
        { name: 'Token工具', icon: '🎫', url: 'token', category: '加密安全工具' },
        { name: 'JS混淆加密', icon: '🛡️', url: 'js-secrecy', category: '加密安全工具' },
        { name: '中文大写数字', icon: '🔢', url: 'num-to-chinese', category: '实用工具' },
        { name: '二维码', icon: '📱', url: 'qrcode', category: '实用工具' },
        { name: '内容对比', icon: '📋', url: 'diff', category: '实用工具' },
        { name: 'Cron解析', icon: '⏰', url: 'cron', category: '实用工具' },
        { name: '时间戳转换', icon: '🕐', url: 'timestamp', category: '实用工具' },
        { name: 'URL编解码', icon: '🔗', url: 'urlcode', category: '实用工具' },
        { name: '进制转换', icon: '🧮', url: 'base-convert', category: '实用工具' },
        { name: '取色器', icon: '🎨', url: 'color-picker', category: '实用工具' },
        { name: '正则表达式', icon: '🔍', url: 'regex', category: '实用工具' },
        { name: '文档签名', icon: '✍️', url: 'docu/signature', category: '文档与下载工具' },
        { name: '文档水印', icon: '🛡️', url: 'docu/watermark', category: '文档与下载工具' },
        { name: '视频图片下载', icon: '⬇️', url: 'download/media', category: '文档与下载工具' },
        { name: '资源文件下载', icon: '📦', url: 'download/resource', category: '文档与下载工具' }
    ];

    // 获取相对于根目录的路径前缀
    function getBasePath() {
        var path = window.location.pathname;
        var parts = path.split('/').filter(function (p) { return p && p !== 'index.html'; });
        // 如果是一级目录（如 /yaml/），返回 '../'
        // 如果是二级目录（如 /image/compressor/），返回 '../../'
        if (parts.length >= 1) {
            return '../'.repeat(parts.length);
        }
        return '';
    }

    // 动态加载导航组件
    function loadNavComponent(callback) {
        var basePath = getBasePath();
        var navUrl = basePath + 'common/nav.html';

        console.log('Loading nav from:', navUrl, 'basePath:', basePath);

        fetch(navUrl)
            .then(function (response) {
                console.log('Nav response status:', response.status);
                if (!response.ok) {
                    throw new Error('Failed to load nav component: ' + response.status + ' ' + response.statusText);
                }
                return response.text();
            })
            .then(function (html) {
                // 创建临时元素来解析HTML
                var temp = document.createElement('div');
                temp.innerHTML = html;

                // 获取模板内容
                var template = temp.querySelector('#nav-template');
                if (template) {
                    var navContent = template.innerHTML;

                    // 修复相对路径
                    var fixedContent = navContent.replace(
                        /src="common\//g,
                        'src="' + basePath + 'common/'
                    ).replace(
                        /href="(image|video|json|yaml|pug|xml|sql|pwd|uuid|mermaid|md5|sha|token|num-to-chinese|qrcode|diff|cron|timestamp|urlcode|base-convert|color-picker|regex|js-secrecy|docu|download)/g,
                        'href="' + basePath + '$1'
                    );

                    // 找到导航容器并插入
                    var navContainer = document.getElementById('nav-container');
                    if (navContainer) {
                        navContainer.innerHTML = fixedContent;
                    } else {
                        // 如果没有容器，直接在body开头插入
                        document.body.insertAdjacentHTML('afterbegin', fixedContent);
                    }

                    // 高亮当前页面
                    highlightCurrentPage();

                    if (callback) callback();
                } else {
                    console.error('Nav template not found');
                    if (callback) callback();
                }
            })
            .catch(function (error) {
                console.error('Failed to load nav:', error);
                if (callback) callback();
            });
    }

    // 加载 Footer 组件
    function loadFooterComponent(callback) {
        var basePath = getBasePath();
        var footerUrl = basePath + 'common/footer.html';

        fetch(footerUrl)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to load footer component: ' + response.status + ' ' + response.statusText);
                }
                return response.text();
            })
            .then(function (html) {
                var temp = document.createElement('div');
                temp.innerHTML = html;

                var template = temp.querySelector('#footer-template');
                if (template) {
                    var footerContent = template.innerHTML;

                    // 修复相对路径
                    var fixedContent = footerContent.replace(
                        /src="common\//g,
                        'src="' + basePath + 'common/'
                    );

                    var footerContainer = document.getElementById('footer-container');
                    if (footerContainer) {
                        footerContainer.innerHTML = fixedContent;
                    }
                } else {
                    console.error('Footer template not found');
                }

                if (callback) callback();
            })
            .catch(function (error) {
                console.error('Failed to load footer:', error);
                if (callback) callback();
            });
    }

    // 高亮当前页面的导航项
    function highlightCurrentPage() {
        var path = window.location.pathname;
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        var links = sidebar.querySelectorAll('a');
        links.forEach(function (link) {
            var href = link.getAttribute('href');
            if (href) {
                // 移除 ../ 和 ./
                var cleanHref = href.replace(/^\.\.\//, '').replace(/^\.\//, '').replace(/\/$/, '');
                var cleanPath = path.replace(/\/$/, '').replace(/\/index\.html$/, '');

                if (cleanPath.endsWith('/' + cleanHref) || cleanPath === '/' + cleanHref) {
                    link.classList.add('active');
                }
            }
        });
    }

    var MAX_RECENT = 5;
    var STORAGE_KEY = 'helpoke_recent_tools';

    function getRecentTools() {
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveRecentTool(url) {
        var recent = getRecentTools();
        var filtered = recent.filter(function (item) {
            return item.url !== url;
        });
        var tool = null;
        for (var i = 0; i < window.toolsData.length; i++) {
            if (window.toolsData[i].url === url) {
                tool = window.toolsData[i];
                break;
            }
        }
        if (tool) {
            filtered.unshift({
                name: tool.name,
                icon: tool.icon,
                url: tool.url
            });
        }
        var trimmed = filtered.slice(0, MAX_RECENT);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } catch (e) {
            console.warn('Failed to save recent tools:', e);
        }
    }

    // 记录当前页面访问
    (function recordCurrentVisit() {
        var path = window.location.pathname;
        var toolUrl = null;
        for (var i = 0; i < window.toolsData.length; i++) {
            var t = window.toolsData[i];
            var urlWithSlash = '/' + t.url + '/';
            var urlEnd = '/' + t.url;
            if (path.indexOf(urlWithSlash) !== -1 || path.indexOf(urlWithSlash + 'index.html') !== -1 || path.endsWith(urlEnd) || path.endsWith(urlEnd + '/') || path.indexOf(t.url + '/index.html') !== -1) {
                toolUrl = t.url;
                break;
            }
        }
        if (toolUrl) {
            saveRecentTool(toolUrl);
        }
    })();

    // 监听侧边栏链接点击
    function initRecentTracking() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        sidebar.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                var href = link.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('#')) {
                    // 转换为相对路径
                    var url = href.replace(/^\.\//, '').replace(/^\//, '');
                    saveRecentTool(url);
                }
            });
        });
    }

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
                document.body.classList.add('sidebar-collapsed');
            }

            // Sidebar button: collapse
            btn.addEventListener('click', function () {
                sidebar.classList.add('collapsed');
                floatBall.classList.add('visible');
                document.body.classList.add('sidebar-collapsed');
                localStorage.setItem('sidebar-collapsed', 'true');
            });
        }

        // Float ball: expand
        floatBall.addEventListener('click', function () {
            sidebar.classList.remove('collapsed');
            floatBall.classList.remove('visible');
            document.body.classList.remove('sidebar-collapsed');
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

        // 初始化最近使用跟踪
        initRecentTracking();
    }

    // Mobile sidebar toggle
    var sidebar, toggle, overlay;

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('show');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    // 绑定移动端侧边栏切换事件
    function bindMobileEvents() {
        if (toggle) {
            toggle.addEventListener('click', function () {
                if (sidebar.classList.contains('open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            });
        }

        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }

        // Close sidebar on link click (mobile)
        if (sidebar) {
            sidebar.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    if (window.innerWidth <= 768) closeSidebar();
                });
            });
        }
    }

    // DOM加载完成后先加载导航组件，再初始化侧边栏
    function onDOMReady() {
        loadNavComponent(function () {
            // 导航组件加载完成后获取元素引用
            sidebar = document.getElementById('sidebar');
            toggle = document.getElementById('sidebarToggle');
            overlay = document.getElementById('sidebarOverlay');

            // 初始化侧边栏功能
            initSidebar();

            // 绑定移动端事件
            bindMobileEvents();
        });

        // 加载 Footer 组件
        loadFooterComponent();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
        onDOMReady();
    }
})();