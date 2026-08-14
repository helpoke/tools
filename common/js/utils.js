/**
 * 通用工具函数
 */

/**
 * 多语言：动态文本翻译统一入口
 * 优先使用 i18n 的 window.t（i18n.js 已加载时）；i18n 未加载时兜底返回 key 原文，避免报错。
 * 各工具脚本无需再各自定义翻译辅助函数。
 */
if (typeof window !== 'undefined') {
    window.t = window.t || function (key, params) {
        return key;
    };
}

/**
 * 显示右下角弹框
 * @param {string} message - 弹框消息
 * @param {string} type - 弹框类型：success, error, info, warning
 * @param {number} duration - 弹框显示时间（毫秒），默认3000
 */
function showToast(message, type = 'info', duration = 3000) {
    // 创建弹框元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        }
        
        .toast-success {
            background-color: #27ae60;
        }
        
        .toast-error {
            background-color: #e74c3c;
        }
        
        .toast-info {
            background-color: #3498db;
        }
        
        .toast-warning {
            background-color: #f39c12;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 自动消失
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(toast);
            // 如果没有其他弹框，移除样式
            if (document.querySelectorAll('.toast').length === 0) {
                document.head.removeChild(style);
            }
        }, 300);
    }, duration);
}

/**
 * 显示成功弹框
 * @param {string} message - 弹框消息
 * @param {number} duration - 弹框显示时间（毫秒），默认3000
 */
function showSuccess(message, duration = 3000) {
    showToast(message, 'success', duration);
}

/**
 * 显示错误弹框
 * @param {string} message - 弹框消息
 * @param {number} duration - 弹框显示时间（毫秒），默认3000
 */
function showError(message, duration = 3000) {
    showToast(message, 'error', duration);
}

/**
 * 显示信息弹框
 * @param {string} message - 弹框消息
 * @param {number} duration - 弹框显示时间（毫秒），默认3000
 */
function showInfo(message, duration = 3000) {
    showToast(message, 'info', duration);
}

/**
 * 显示警告弹框
 * @param {string} message - 弹框消息
 * @param {number} duration - 弹框显示时间（毫秒），默认3000
 */
function showWarning(message, duration = 3000) {
    showToast(message, 'warning', duration);
}

/**
 * 验证输入值
 * @param {HTMLInputElement} inputElement - 输入元素
 * @returns {boolean} - 验证是否通过
 */
function validateInput(inputElement) {
    const value = parseInt(inputElement.value);
    const min = parseInt(inputElement.min);
    const max = parseInt(inputElement.max);
    const name = inputElement.dataset.name || inputElement.name || inputElement.id;
    
    if (isNaN(value) || value < min || value > max) {
        showError(`【${name}】必须在${min}-${max}之间`);
        inputElement.value = inputElement.defaultValue;
        return false;
    }
    return true;
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        validateInput
    };
} else if (typeof window !== 'undefined') {
    window.utils = {
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        validateInput
    };
}

// ================= 工具函数 =================
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}


function showFileSizeToast(file, maxFileSize) {
    showError(`文件大小超过限制（最大 ${formatSize(maxFileSize)}）。当前：${formatSize(file.size)}`);
}

// ================= info-section 折叠功能 =================
/**
 * info-section 中的 article 支持点击 header 折叠/展开，默认折叠
 */
(function initInfoSectionToggle() {
    function setup() {
        document.querySelectorAll('.info-details > header').forEach(function (header) {
            header.setAttribute('role', 'button');
            // true表示默认折叠，false表示默认展开
            header.setAttribute('aria-expanded', 'false');
            header.parentElement.classList.add('collapsed');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }

    document.addEventListener('click', function (e) {
        const header = e.target.closest('.info-details > header');
        if (!header) return;
        const details = header.parentElement;
        const collapsed = details.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
})();