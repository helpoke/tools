// DOM元素
const inputCode = document.getElementById('inputCode');
const outputCode = document.getElementById('outputCode');
const obfuscateBtn = document.getElementById('obfuscateBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const fileUpload = document.getElementById('fileUpload');
const notification = document.getElementById('notification');
const codeTabs = document.querySelectorAll('.code-tab');
const inputSizeEl = document.getElementById('inputSize');
const outputSizeEl = document.getElementById('outputSize');
const ratioEl = document.getElementById('ratio');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const loadExampleBtn = document.getElementById('loadExampleBtn');

// 预设按钮
const presetButtons = document.querySelectorAll('.preset-btn');

// 高级设置元素
const varNamesContainer = document.getElementById('varNamesContainer');
const stringsContainer = document.getElementById('stringsContainer');
const convertContainer = document.getElementById('convertContainer');
const domainLockContainer = document.getElementById('domainLockContainer');

// 存储配置数据
let config = {
    varNames: [],
    strings: [],
    convertStrings: [],
    domainLock: []
};

// 通知文本
const notificationTexts = {
    fileLoaded: "文件已加载",
    fileError: "文件读取错误",
    fileTypeError: "请上传JavaScript文件(.js)",
    fileSizeError: "文件大小超过10MB限制",
    obfuscationSuccess: "代码混淆成功！",
    obfuscationError: "混淆错误: ",
    codeCleared: "代码已清除",
    copySuccess: "代码已复制到剪贴板",
    copyError: "复制失败: ",
    downloadSuccess: "代码已下载",
    addVarSuccess: "已添加保留变量",
    addStringSuccess: "已添加保留字符串",
    addConvertSuccess: "已添加强制转换字符串",
    addDomainSuccess: "已添加域锁定",
    deleteItem: "已删除项目",
    invalidVar: "请输入有效的变量名 (只允许字母、数字、下划线和$，且不能以数字开头)",
    emptyCode: "请输入JavaScript代码",
    noOutput: "没有可复制的代码",
    noDownload: "没有可下载的代码",
    exampleLoaded: "示例代码已加载"
};

// 预设示例代码
const exampleCode = `function exampleFunction() {
  const apiKey = "12345-ABCDE-67890";
  const secret = "mySecretValue";

  // 重要函数
  function validateCredentials(user, password) {
    if (user === "admin" && password === "P@ssw0rd") {
      console.log("Access granted");
      return true;
    }
    console.log("Access denied");
    return false;
  }

  return {
    checkAccess: validateCredentials,
    apiKey: apiKey
  };
}`;

// 显示通知
function showNotification(message, isError = false) {
    notification.querySelector('i').className = isError ?
        'fas fa-exclamation-circle error' : 'fas fa-check-circle';
    notification.querySelector('span').textContent = message;
    notification.classList.add('show');

    if (isError) {
        notification.classList.add('error');
    } else {
        notification.classList.remove('error');
    }

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 更新统计信息
function updateStats() {
    const inputText = inputCode.value;
    const outputText = outputCode.value;

    const inputLen = inputText.length;
    const outputLen = outputText.length;

    inputSizeEl.textContent = inputLen;
    outputSizeEl.textContent = outputLen;

    if (inputLen > 0 && outputLen > 0) {
        const ratio = Math.round((outputLen - inputLen) / inputLen * 100);
        ratioEl.textContent = `${ratio > 0 ? '+' : ''}${ratio}%`;
        ratioEl.style.color = ratio > 0 ? '#ef4444' : '#10b981';
    } else {
        ratioEl.textContent = '0%';
        ratioEl.style.color = '';
    }
}

// 切换标签页
codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        codeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (tab.dataset.tab === 'input') {
            inputCode.style.display = 'block';
            outputCode.style.display = 'none';
        } else {
            inputCode.style.display = 'none';
            outputCode.style.display = 'block';
        }

        updateStats();
    });
});

// 预设选择
presetButtons.forEach(button => {
    button.addEventListener('click', () => {
        presetButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // 根据预设应用不同设置
        const preset = button.dataset.preset;
        applyPresetSettings(preset);
    });
});

// 应用预设设置
function applyPresetSettings(preset) {
    // 重置所有设置
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // 设置滑块值
    document.getElementById('deadCodeSlider').value = 1;
    document.getElementById('deadCodeValue').textContent = '1';
    document.getElementById('controlFlowSlider').value = 1;
    document.getElementById('controlFlowValue').textContent = '1';
    document.getElementById('stringArrayThresholdSlider').value = 1;
    document.getElementById('stringArrayThresholdValue').textContent = '1';

    // 设置下拉框值
    document.getElementById('identifierNamesGenerator').value = 'hexadecimal';
    document.getElementById('stringArrayEncoding').value = 'rc4';
    document.getElementById('stringArrayIndexType').value = 'hexadecimal-number';
    document.getElementById('stringArrayWrappersType').value = 'function';

    // 设置数字输入值
    document.getElementById('stringArrayWrappersCount').value = 2;
    document.getElementById('stringArrayWrappersParametersMaxCount').value = 2;
    document.getElementById('debugProtectionInterval').value = 0;

    // 设置域锁定重定向URL
    document.getElementById('domainLockRedirectUrl').value = 'about:blank';

    // 清空高级设置
    config = { varNames: [], strings: [], convertStrings: [], domainLock: [] };
    updateItemsDisplay();

    // 根据预设应用特定设置
    switch(preset) {
        case 'default':
            // 默认配置
            document.getElementById('compactCode').checked = true;
            document.getElementById('disableFormatting').checked = false;
            document.getElementById('disableConsoleOutput').checked = false;
            document.getElementById('numberConversion').checked = true;
            document.getElementById('optimizeCode').checked = true;
            document.getElementById('splitStrings').checked = true;
            document.getElementById('unicodeEscape').checked = true;
            document.getElementById('renameGlobals').checked = true;
            document.getElementById('renameMethods').checked = true;
            document.getElementById('transformObjectKeys').checked = true;
            document.getElementById('stringArray').checked = true;
            document.getElementById('stringArrayRotate').checked = true;
            document.getElementById('stringArrayShuffle').checked = true;
            document.getElementById('stringArrayIndexShift').checked = false;
            document.getElementById('stringArrayWrappersChainedCalls').checked = false;
            document.getElementById('deadCodeInjection').checked = true;
            document.getElementById('controlFlowFlattening').checked = true;
            document.getElementById('ignoreImports').checked = true;
            break;

        case 'low':
            // 低混淆，高性能
            document.getElementById('compactCode').checked = true;
            document.getElementById('disableFormatting').checked = true;
            document.getElementById('optimizeCode').checked = true;
            document.getElementById('unicodeEscape').checked = true;
            document.getElementById('deadCodeInjection').checked = false;
            document.getElementById('controlFlowFlattening').checked = false;
            document.getElementById('stringArrayRotate').checked = false;
            document.getElementById('stringArrayShuffle').checked = false;
            document.getElementById('stringArrayIndexShift').checked = false;
            document.getElementById('stringArrayWrappersChainedCalls').checked = false;
            break;

        case 'medium':
            // 中等混淆，性能均衡
            document.getElementById('compactCode').checked = true;
            document.getElementById('disableFormatting').checked = true;
            document.getElementById('disableConsoleOutput').checked = true;
            document.getElementById('optimizeCode').checked = true;
            document.getElementById('splitStrings').checked = true;
            document.getElementById('unicodeEscape').checked = true;
            document.getElementById('renameGlobals').checked = true;
            document.getElementById('stringArrayRotate').checked = true;
            document.getElementById('stringArrayShuffle').checked = true;
            document.getElementById('stringArrayIndexShift').checked = true;
            document.getElementById('deadCodeInjection').checked = true;
            document.getElementById('deadCodeSlider').value = 0.4;
            document.getElementById('deadCodeValue').textContent = '0.4';
            document.getElementById('controlFlowFlattening').checked = true;
            document.getElementById('controlFlowSlider').value = 0.75;
            document.getElementById('controlFlowValue').textContent = '0.75';
            break;

        case 'high':
            // 高混淆，低性能
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            document.getElementById('deadCodeSlider').value = 1;
            document.getElementById('deadCodeValue').textContent = '1';
            document.getElementById('controlFlowSlider').value = 1;
            document.getElementById('controlFlowValue').textContent = '1';
            break;
    }
}

// 更新滑块值显示
document.getElementById('deadCodeSlider').addEventListener('input', function() {
    document.getElementById('deadCodeValue').textContent = this.value;
});

document.getElementById('controlFlowSlider').addEventListener('input', function() {
    document.getElementById('controlFlowValue').textContent = this.value;
});

document.getElementById('stringArrayThresholdSlider').addEventListener('input', function() {
    document.getElementById('stringArrayThresholdValue').textContent = this.value;
});

// 更新项目显示
function updateItemsDisplay() {
    // 更新变量名显示
    varNamesContainer.innerHTML = '';
    if (config.varNames.length > 0) {
        config.varNames.forEach((varName, index) => {
            const tag = document.createElement('div');
            tag.className = 'item-tag';
            tag.innerHTML = `
                <span>${varName}</span>
                <button class="delete-btn" data-type="varNames" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            varNamesContainer.appendChild(tag);
        });
    } else {
        varNamesContainer.innerHTML = `<div class="empty-message">未添加保留变量名</div>`;
    }

    // 更新字符串显示
    stringsContainer.innerHTML = '';
    if (config.strings.length > 0) {
        config.strings.forEach((str, index) => {
            const tag = document.createElement('div');
            tag.className = 'item-tag';
            tag.innerHTML = `
                <span>${str}</span>
                <button class="delete-btn" data-type="strings" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            stringsContainer.appendChild(tag);
        });
    } else {
        stringsContainer.innerHTML = `<div class="empty-message">未添加保留字符串</div>`;
    }

    // 更新强制转换字符串显示
    convertContainer.innerHTML = '';
    if (config.convertStrings.length > 0) {
        config.convertStrings.forEach((str, index) => {
            const tag = document.createElement('div');
            tag.className = 'item-tag';
            tag.innerHTML = `
                <span>${str}</span>
                <button class="delete-btn" data-type="convertStrings" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            convertContainer.appendChild(tag);
        });
    } else {
        convertContainer.innerHTML = `<div class="empty-message">未添加强制转换字符串</div>`;
    }

    // 更新域锁定显示
    domainLockContainer.innerHTML = '';
    if (config.domainLock.length > 0) {
        config.domainLock.forEach((domain, index) => {
            const tag = document.createElement('div');
            tag.className = 'item-tag';
            tag.innerHTML = `
                <span>${domain}</span>
                <button class="delete-btn" data-type="domainLock" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            domainLockContainer.appendChild(tag);
        });
    } else {
        domainLockContainer.innerHTML = `<div class="empty-message">未添加域锁定</div>`;
    }

    // 添加删除事件监听器
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const type = this.dataset.type;
            const index = parseInt(this.dataset.index);

            // 从数组中删除指定项
            if (config[type] && config[type][index]) {
                // 显示删除的项名
                const deletedItem = config[type][index];

                // 从数组中删除
                config[type].splice(index, 1);

                // 更新显示
                updateItemsDisplay();

                // 显示删除通知
                showNotification(`已删除: ${deletedItem}`);
            }
        });
    });
}

// 添加变量名
document.getElementById('addVarNameBtn').addEventListener('click', function() {
    const varNameInput = document.getElementById('varNameInput');
    const varName = varNameInput.value.trim();

    if (varName) {
        // 变量名验证
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(varName)) {
            showNotification(notificationTexts.invalidVar, true);
            return;
        }

        config.varNames.push(varName);
        varNameInput.value = '';
        updateItemsDisplay();
        showNotification(`${notificationTexts.addVarSuccess}: ${varName}`);
    }
});

// 添加字符串
document.getElementById('addStringBtn').addEventListener('click', function() {
    const stringInput = document.getElementById('stringInput');
    const str = stringInput.value.trim();

    if (str) {
        config.strings.push(str);
        stringInput.value = '';
        updateItemsDisplay();
        showNotification(`${notificationTexts.addStringSuccess}: ${str}`);
    }
});

// 添加强制转换字符串
document.getElementById('addConvertBtn').addEventListener('click', function() {
    const convertInput = document.getElementById('convertInput');
    const str = convertInput.value.trim();

    if (str) {
        config.convertStrings.push(str);
        convertInput.value = '';
        updateItemsDisplay();
        showNotification(`${notificationTexts.addConvertSuccess}: ${str}`);
    }
});

// 添加域锁定
document.getElementById('addDomainLockBtn').addEventListener('click', function() {
    const domainLockInput = document.getElementById('domainLockInput');
    const domain = domainLockInput.value.trim();

    if (domain) {
        config.domainLock.push(domain);
        domainLockInput.value = '';
        updateItemsDisplay();
        showNotification(`${notificationTexts.addDomainSuccess}: ${domain}`);
    }
});

// 支持按Enter键添加
document.querySelectorAll('.input-wrapper input').forEach(input => {
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const btnId = this.id.replace('Input', 'Btn');
            document.getElementById(btnId).click();
        }
    });
});

// 文件上传处理
fileUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.js')) {
        showNotification(notificationTexts.fileTypeError, true);
        return;
    }

    // 检查文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
        showNotification(notificationTexts.fileSizeError, true);
        return;
    }

    // 显示文件信息
    fileName.textContent = file.name;
    fileSize.textContent = (file.size / 1024).toFixed(2);
    fileInfo.style.display = 'flex';

    // 读取文件内容
    const reader = new FileReader();
    reader.onload = function(event) {
        inputCode.value = event.target.result;
        updateStats();
        showNotification(`${notificationTexts.fileLoaded}: ${file.name}`);
    };
    reader.onerror = function() {
        showNotification(notificationTexts.fileError, true);
    };
    reader.readAsText(file);
});

// 加载示例代码
loadExampleBtn.addEventListener('click', function() {
    inputCode.value = exampleCode;
    updateStats();
    showNotification(notificationTexts.exampleLoaded);
});

// 混淆代码
obfuscateBtn.addEventListener('click', function() {
    const code = inputCode.value.trim();

    if (!code) {
        showNotification(notificationTexts.emptyCode, true);
        return;
    }

    // 获取当前配置
    const options = {
        compact: document.getElementById('compactCode').checked,
        controlFlowFlattening: document.getElementById('controlFlowFlattening').checked,
        controlFlowFlatteningThreshold: parseFloat(document.getElementById('controlFlowSlider').value),
        deadCodeInjection: document.getElementById('deadCodeInjection').checked,
        deadCodeInjectionThreshold: parseFloat(document.getElementById('deadCodeSlider').value),
        debugProtection: document.getElementById('disableConsoleDebug').checked,
        debugProtectionInterval: parseInt(document.getElementById('debugProtectionInterval').value),
        disableConsoleOutput: document.getElementById('disableConsoleOutput').checked,
        domainLock: config.domainLock.length > 0 ? [...new Set(config.domainLock)] : [],
        domainLockRedirectUrl: document.getElementById('domainLockRedirectUrl').value,
        ignoreImports: document.getElementById('ignoreImports').checked,
        log: false,
        numbersToExpressions: document.getElementById('numberConversion').checked,
        renameGlobals: document.getElementById('renameGlobals').checked,
        renameProperties: document.getElementById('renameMethods').checked,
        selfDefending: true,
        simplify: true,
        splitStrings: document.getElementById('splitStrings').checked,
        splitStringsChunkLength: 10,
        stringArray: document.getElementById('stringArray').checked,
        stringArrayCallsTransform: true,
        stringArrayEncoding: [document.getElementById('stringArrayEncoding').value],
        stringArrayIndexShift: document.getElementById('stringArrayIndexShift').checked,
        stringArrayIndexType: document.getElementById('stringArrayIndexType').value,
        stringArrayRotate: document.getElementById('stringArrayRotate').checked,
        stringArrayShuffle: document.getElementById('stringArrayShuffle').checked,
        stringArrayThreshold: parseFloat(document.getElementById('stringArrayThresholdSlider').value),
        stringArrayWrappersCount: parseInt(document.getElementById('stringArrayWrappersCount').value),
        stringArrayWrappersChainedCalls: document.getElementById('stringArrayWrappersChainedCalls').checked,
        stringArrayWrappersParametersMaxCount: parseInt(document.getElementById('stringArrayWrappersParametersMaxCount').value),
        stringArrayWrappersType: document.getElementById('stringArrayWrappersType').value,
        transformObjectKeys: document.getElementById('transformObjectKeys').checked,
        unicodeEscapeSequence: document.getElementById('unicodeEscape').checked,
        identifierNamesGenerator: document.getElementById('identifierNamesGenerator').value,

        // 修复问题：当数组为空时传递空数组而不是undefined
        reservedNames: config.varNames.length > 0 ? [...new Set(config.varNames)] : [],
        reservedStrings: config.strings.length > 0 ? [...new Set(config.strings)] : []
    };

    try {
        const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, options);
        outputCode.value = obfuscatedResult.getObfuscatedCode();

        // 切换到输出标签
        document.querySelector('[data-tab="output"]').click();
        showNotification(notificationTexts.obfuscationSuccess);
        updateStats();
    } catch (error) {
        outputCode.value = `// 混淆过程中发生错误\n// ${error.message}`;
        showNotification(`${notificationTexts.obfuscationError}${error.message}`, true);
        updateStats();
    }
});

// 清除代码
clearBtn.addEventListener('click', function() {
    inputCode.value = '';
    outputCode.value = '';
    fileInfo.style.display = 'none';
    fileUpload.value = '';
    showNotification(notificationTexts.codeCleared);
    updateStats();

    // 切换到输入标签页
    document.querySelector('[data-tab="input"]').click();
});

// 复制混淆代码
copyBtn.addEventListener('click', function() {
    if (!outputCode.value.trim()) {
        showNotification(notificationTexts.noOutput, true);
        return;
    }

    navigator.clipboard.writeText(outputCode.value)
        .then(() => showNotification(notificationTexts.copySuccess))
        .catch(err => showNotification(`${notificationTexts.copyError}${err}`, true));
});

// 下载混淆代码
downloadBtn.addEventListener('click', function() {
    const code = outputCode.value;

    if (!code.trim()) {
        showNotification(notificationTexts.noDownload, true);
        return;
    }

    // 使用上传的文件名作为默认文件名（如果存在）
    let downloadName = '混淆后代码.js';
    if (fileName.textContent && fileName.textContent !== '未选择文件') {
        downloadName = fileName.textContent.replace('.js', '-混淆后.js');
    }

    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification(notificationTexts.downloadSuccess);
});

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 默认显示输入标签页
    document.querySelector('[data-tab="input"]').click();

    // 应用默认预设
    applyPresetSettings('default');

    // 初始化统计信息
    updateStats();

    // 添加文件上传按钮事件
    document.querySelector('.file-upload-wrapper button').addEventListener('click', function() {
        fileUpload.click();
    });

    // 初始化保留列表为空
    updateItemsDisplay();
});

// 监听输入变化更新统计
inputCode.addEventListener('input', updateStats);
