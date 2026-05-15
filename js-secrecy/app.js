/**
 * JS 混淆加密工具 - 浏览器端实现
 */

const $ = id => document.getElementById(id);
const inputCode = $('inputCode');
const outputCode = $('outputCode');
const progressBar = $('progressBar');
const obfuscateBtn = $('obfuscateBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    inputCode.addEventListener('input', updateCounts);
    $('fileInput').addEventListener('change', handleFileUpload);
    $('domainLock').addEventListener('change', e => {
        $('domainLockTargets').style.display = e.target.checked ? 'block' : 'none';
    });
});

function updateCounts() {
    const val = inputCode.value;
    $('inputCount').textContent = val.length + ' 字符';
    $('inputLines').textContent = (val ? val.split('\n').length : 0) + ' 行';
}

// 文件上传
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        inputCode.value = reader.result;
        updateCounts();
        showToast('文件已加载: ' + file.name, 'success');
    };
    reader.readAsText(file);
    // 重置 file input 以支持重复上传同名文件
    e.target.value = '';
}

// 清空输入
function clearInput() {
    inputCode.value = '';
    outputCode.value = '';
    updateCounts();
    $('outputCount').textContent = '0 字符';
    $('outputLines').textContent = '0 行';
}

// 粘贴
async function pasteCode() {
    try {
        const text = await navigator.clipboard.readText();
        inputCode.value = text;
        updateCounts();
        showToast('已粘贴', 'success');
    } catch {
        showToast('无法读取剪贴板', 'error');
    }
}

// 复制输出
function copyOutput() {
    const val = outputCode.value;
    if (!val) { showToast('没有可复制的内容', 'error'); return; }
    navigator.clipboard.writeText(val).then(() => showToast('已复制到剪贴板', 'success'));
}

// 下载输出
function downloadOutput() {
    const val = outputCode.value;
    if (!val) { showToast('没有可下载的内容', 'error'); return; }
    const blob = new Blob([val], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'obfuscated.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('已开始下载', 'success');
}

// 预设
function applyPreset() {
    const preset = $('preset').value;
    const defaults = {
        low:       { compact: true, stringArray: false, renameGlobals: true, controlFlowFlattening: false, deadCodeInjection: false, selfDefending: false, debugProtection: false, disableConsoleOutput: false, domainLock: false, stringArrayEncoding: 'none', renameMode: 'mangled' },
        medium:    { compact: true, stringArray: true, renameGlobals: true, controlFlowFlattening: false, deadCodeInjection: false, selfDefending: false, debugProtection: false, disableConsoleOutput: false, domainLock: false, stringArrayEncoding: 'base64', renameMode: 'mangled' },
        high:      { compact: true, stringArray: true, renameGlobals: true, controlFlowFlattening: true, deadCodeInjection: true, selfDefending: true, debugProtection: false, disableConsoleOutput: true, domainLock: false, stringArrayEncoding: 'rc4', renameMode: 'hexadecimal' },
        maximum:   { compact: true, stringArray: true, renameGlobals: true, controlFlowFlattening: true, deadCodeInjection: true, selfDefending: true, debugProtection: true, disableConsoleOutput: true, domainLock: false, stringArrayEncoding: 'rc4', renameMode: 'hexadecimal' }
    };
    const d = defaults[preset];
    if (!d) return;
    Object.keys(d).forEach(k => {
        const el = $(k);
        if (el) {
            if (el.type === 'checkbox') el.checked = d[k];
            else if (el.tagName === 'SELECT') el.value = d[k];
        }
    });
}

// ===== 混淆引擎 =====
function obfuscate() {
    const code = inputCode.value.trim();
    if (!code) { showToast('请输入 JavaScript 代码', 'error'); return; }

    progressBar.classList.add('active');
    obfuscateBtn.disabled = true;
    obfuscateBtn.textContent = '混淆中...';

    // 使用 setTimeout 让 UI 先渲染进度条
    setTimeout(() => {
        try {
            const result = processObfuscation(code);
            outputCode.value = result;
            const lines = result.split('\n');
            $('outputCount').textContent = result.length + ' 字符';
            $('outputLines').textContent = lines.length + ' 行';
            showToast('混淆完成！', 'success');
        } catch (e) {
            showToast('混淆失败: ' + e.message, 'error');
            console.error(e);
        } finally {
            progressBar.classList.remove('active');
            obfuscateBtn.disabled = false;
            obfuscateBtn.textContent = '🔒 开始混淆';
        }
    }, 100);
}

function processObfuscation(code) {
    const opts = getOptions();
    let result = code;

    // 步骤 1: 变量和函数名重命名
    if (opts.renameGlobals) {
        result = renameIdentifiers(result, opts);
    }

    // 步骤 2: 字符串数组编码
    if (opts.stringArray) {
        result = stringArrayObfuscation(result, opts);
    }

    // 步骤 3: 控制流平坦化
    if (opts.controlFlowFlattening) {
        result = controlFlowFlatten(result, opts);
    }

    // 步骤 4: 死代码注入
    if (opts.deadCodeInjection) {
        result = injectDeadCode(result, opts);
    }

    // 步骤 5: 自我保护/调试保护
    if (opts.selfDefending || opts.debugProtection) {
        result = addSelfDefense(result, opts);
    }

    // 步骤 6: 禁用控制台
    if (opts.disableConsoleOutput) {
        result = disableConsole(result);
    }

    // 步骤 7: 域名锁定
    if (opts.domainLock && opts.domainLockTargets) {
        result = addDomainLock(result, opts);
    }

    // 步骤 8: 压缩
    if (opts.compact) {
        result = minify(result);
    }

    return result;
}

function getOptions() {
    return {
        compact: $('compact').checked,
        stringArray: $('stringArray').checked,
        stringArrayThreshold: parseFloat($('stringArrayThreshold').value) || 5,
        renameGlobals: $('renameGlobals').checked,
        identifierPrefix: $('identifierPrefix').value || '',
        renameMode: $('renameMode').value,
        stringArrayEncoding: $('stringArrayEncoding').value,
        encodingRatio: parseFloat($('encodingRatio').value) || 0.8,
        controlFlowFlattening: $('controlFlowFlattening').checked,
        controlFlowFlatteningThreshold: parseFloat($('controlFlowFlatteningThreshold').value) || 0.75,
        deadCodeInjection: $('deadCodeInjection').checked,
        deadCodeInjectionThreshold: parseFloat($('deadCodeInjectionThreshold').value) || 0.4,
        selfDefending: $('selfDefending').checked,
        debugProtection: $('debugProtection').checked,
        disableConsoleOutput: $('disableConsoleOutput').checked,
        domainLock: $('domainLock').checked,
        domainLockTargets: $('domainLockTargets').value
    };
}

// 生成混淆变量名
function generateVarName(index, mode, prefix) {
    if (mode === 'hexadecimal') {
        const hex = '0x' + (index + 100).toString(16);
        return (prefix || '_') + hex;
    }
    // mangled: a, b, c... z, aa, ab...
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let name = '';
    let n = index;
    do {
        name = chars[n % 26] + name;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return (prefix || '_') + name;
}

// 标识符重命名
function renameIdentifiers(code, opts) {
    // 收集所有需要重命名的标识符
    const identifiers = new Set();

    // 匹配 const/let/var 声明
    const varRegex = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let m;
    while ((m = varRegex.exec(code)) !== null) {
        // 跳过关键字
        if (!['console', 'document', 'window', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'setTimeout', 'setInterval', 'parseInt', 'parseFloat', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'yield', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void'].includes(m[1])) {
            identifiers.add(m[1]);
        }
    }

    // 匹配函数声明
    const funcRegex = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    while ((m = funcRegex.exec(code)) !== null) {
        if (!['function'].includes(m[1])) {
            identifiers.add(m[1]);
        }
    }

    // 匹配箭头函数和对象属性中的函数赋值 (const fn = () =>)
    const arrowRegex = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(/g;
    while ((m = arrowRegex.exec(code)) !== null) {
        identifiers.add(m[1]);
    }

    // 匹配类声明
    const classRegex = /\bclass\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((m = classRegex.exec(code)) !== null) {
        identifiers.add(m[1]);
    }

    // 过滤掉对象属性的键（冒号左边的不算变量声明）
    const idList = Array.from(identifiers);
    const renameMap = new Map();
    let counter = 0;
    idList.forEach(id => {
        renameMap.set(id, generateVarName(counter++, opts.renameMode, opts.identifierPrefix));
    });

    // 按名称长度降序替换，避免短名称覆盖长名称
    const sorted = [...renameMap.entries()].sort((a, b) => b[0].length - a[0].length);
    let result = code;
    sorted.forEach(([oldName, newName]) => {
        const regex = new RegExp('\\b' + escapeRegExp(oldName) + '\\b', 'g');
        result = result.replace(regex, newName);
    });

    return result;
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 字符串数组混淆
function stringArrayObfuscation(code, opts) {
    const strings = [];
    // 提取所有字符串字面量
    const stringRegex = /(['"`])(?:(?!\1|\\).|\\.)*\1/g;
    let m;
    const positions = [];
    while ((m = stringRegex.exec(code)) !== null) {
        // 跳过空字符串和短字符串
        const val = m[0].slice(1, -1);
        if (val.length > 0 && Math.random() < opts.encodingRatio) {
            positions.push({ index: m.index, length: m[0].length, value: m[0] });
            strings.push(val);
        }
    }

    if (strings.length === 0) return code;

    // 对字符串进行编码
    let encodedArray;
    switch (opts.stringArrayEncoding) {
        case 'base64':
            encodedArray = strings.map(s => {
                const bytes = new TextEncoder().encode(s);
                let bin = '';
                for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
                return btoa(bin);
            });
            break;
        case 'rc4':
            // 简化版：使用 base64 + 位移
            encodedArray = strings.map(s => {
                const bytes = new TextEncoder().encode(s);
                const xored = new Uint8Array(bytes.length);
                for (let i = 0; i < bytes.length; i++) xored[i] = bytes[i] ^ (i % 7);
                let bin = '';
                for (let i = 0; i < xored.length; i++) bin += String.fromCharCode(xored[i]);
                return btoa(bin);
            });
            break;
        default:
            encodedArray = strings.map(s => s);
    }

    // 构建数组变量名
    const arrName = generateVarName(0, 'hexadecimal', '_a');
    const decName = generateVarName(1, 'hexadecimal', '_b');

    // 生成解码函数
    let decodeFunc = '';
    switch (opts.stringArrayEncoding) {
        case 'base64':
            decodeFunc = `function ${decName}(i){var b=atob(${arrName}[i]),a=new Uint8Array(b.length);for(var j=0;j<b.length;j++)a[j]=b.charCodeAt(j);return new TextDecoder().decode(a)}`;
            break;
        case 'rc4':
            decodeFunc = `function ${decName}(i){var b=atob(${arrName}[i]),a=new Uint8Array(b.length);for(var j=0;j<b.length;j++)a[j]=b.charCodeAt(j)^(j%7);return new TextDecoder().decode(a)}`;
            break;
        default:
            decodeFunc = `function ${decName}(i){return ${arrName}[i]}`;
    }

    // 从后向前替换字符串（避免索引偏移）
    let result = code;
    for (let i = positions.length - 1; i >= 0; i--) {
        const pos = positions[i];
        result = result.slice(0, pos.index) + `${decName}(${i})` + result.slice(pos.index + pos.length);
    }

    // 在最前面插入数组和解码函数
    const arrayStr = JSON.stringify(encodedArray);
    return `(function(){var ${arrName}=${arrayStr};${decodeFunc};${result}})()`;
}

// 控制流平坦化（简化版：用状态机包装代码块）
function controlFlowFlatten(code, opts) {
    // 检测是否超过阈值
    const stmts = code.split(';').filter(s => s.trim().length > 0);
    if (stmts.length < 3) return code;

    // 将代码包装在立即执行函数中，使用 switch 状态机
    const wrapperName = generateVarName(0, 'hexadecimal', '_s');
    const stateName = generateVarName(1, 'hexadecimal', '_t');

    // 将代码按语句分割
    const blocks = [];
    let current = '';
    let depth = 0;
    for (const ch of code) {
        if (ch === '{' || ch === '(' || ch === '[') depth++;
        if (ch === '}' || ch === ')' || ch === ']') depth--;
        if (ch === ';' && depth <= 0) {
            if (current.trim()) blocks.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) blocks.push(current.trim());

    if (blocks.length < 2) return code;

    // 打乱顺序
    const indices = Array.from({ length: blocks.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // 构建状态机
    const cases = blocks.map((block, i) => {
        const originalIndex = indices.indexOf(i);
        const nextIndex = i < blocks.length - 1 ? indices[i + 1] : -1;
        return `case ${originalIndex}:${block};${stateName}=${nextIndex};break;`;
    }).join('');

    return `(function(){var ${stateName}=${indices[0]};while(${stateName}!==-1){switch(${stateName}){${cases}default:${stateName}=-1}}})()`;
}

// 死代码注入
function injectDeadCode(code, opts) {
    const deadCodeSnippets = [
        `if(typeof ${generateVarName(Math.floor(Math.random()*100),'hexadecimal')}==='undefined'){var ${generateVarName(Math.floor(Math.random()*100),'hexadecimal')}=Math.random()>0.5}`,
        `try{if(undefined){console.log('${Math.random().toString(36).slice(2)}')}}catch(e){}`,
        `while(false){var ${generateVarName(Math.floor(Math.random()*100),'hexadecimal')}=${Math.floor(Math.random()*10000)}}`,
        `if(!![]===![]){throw new Error('${Math.random().toString(36).slice(2)}')}`,
    ];

    const lines = code.split('\n');
    const injectCount = Math.floor(lines.length * opts.deadCodeInjectionThreshold);
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        result.push(lines[i]);
        if (Math.random() < opts.deadCodeInjectionThreshold && result.length < injectCount) {
            const snippet = deadCodeSnippets[Math.floor(Math.random() * deadCodeSnippets.length)];
            result.push(snippet + ';');
        }
    }

    return result.join('\n');
}

// 自我保护
function addSelfDefense(code, opts) {
    let result = code;
    const fnName = generateVarName(0, 'hexadecimal', '_d');

    if (opts.selfDefending) {
        // 添加反格式化和反美化代码
        const selfDefense = `function ${fnName}(){try{var s=${fnName}.toString();if(s.indexOf('\\n')!==-1||s.indexOf('  ')!==-1){throw new Error('非法调用')}}catch(e){throw e}}`;
        result = selfDefense + result;
    }

    if (opts.debugProtection) {
        // 添加反调试代码
        const debugProtect = `!function(){var d=function(){try{debugger}catch(e){}};setInterval(d,100)}();`;
        result += debugProtect;
    }

    return result;
}

// 禁用控制台
function disableConsole(code) {
    const disableCode = `(function(){var methods=['log','debug','info','warn','error','trace','dir','table','assert','count','countReset','group','groupEnd','time','timeEnd','timeLog','clear','profile','profileEnd'];var noop=function(){};methods.forEach(function(m){try{console[m]=noop}catch(e){}})})();`;
    return disableCode + code;
}

// 域名锁定
function addDomainLock(code, opts) {
    const targets = opts.domainLockTargets.split(',').map(d => d.trim()).filter(Boolean);
    if (targets.length === 0) return code;

    const check = targets.map(d => {
        const pattern = d.replace(/\./g, '\\.').replace(/\*/g, '.*');
        return `/${pattern}/.test(location.hostname)`;
    }).join('||');

    const lockCode = `(function(){if(!(${check})){throw new Error('Domain not authorized')}})();`;
    return lockCode + code;
}

// 压缩代码
function minify(code) {
    // 移除单行注释（但保留 URL 中的 //）
    code = code.replace(/(?<![:\/\w])\/\/[^\n]*/g, '');

    // 移除多行注释
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');

    // 移除 console 语句
    code = code.replace(/console\.(log|debug|info|warn|error|trace|dir|time|timeEnd|table|group|groupEnd|count|countReset|assert|profile|profileEnd|clear)\s*\([^)]*\)\s*;?/g, '');

    // 压缩空格
    code = code.replace(/\r\n/g, '\n');
    code = code.replace(/\n\s*\n/g, '\n');

    // 移除行首行尾空格
    code = code.split('\n').map(line => line.trim()).join('\n');

    return code;
}

// Toast 提示
function showToast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast-msg ' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s';
        setTimeout(() => el.remove(), 300);
    }, 2000);
}
