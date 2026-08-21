// Google AdSense 加载器：仅在正式生产域名下加载 adsbygoogle.js，
// 本地开发/其他环境直接跳过，避免连接 Google 广告服务器失败产生控制台报错
(function () {
    'use strict';
    // 生产域名白名单（含 www 子域）
    if (!/^(www\.)?helpoke\.com$/i.test(window.location.hostname)) return;

    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2048978820706528';
    // 网络不可达时静默失败，不影响页面其他功能
    s.onerror = function () {};
    document.head.appendChild(s);
})();
