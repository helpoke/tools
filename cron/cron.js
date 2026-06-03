
// ===== Tab 切换 =====
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(function (btn) { btn.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function (panel) { panel.classList.remove('active'); });
    document.getElementById('tab-' + tab).classList.add('active');
    // 找到对应的 tab 按钮
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
        if (btn.textContent.indexOf(tab === 'parse' ? '解析' : '生成') !== -1) {
            btn.classList.add('active');
        }
    });
}

// ===== Cron 解析器 =====
const FIELD_NAMES = ['秒', '分', '时', '日', '月', '星期'];
const FIELD_RANGES = [[0, 59], [0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
const FIELD_CLASSES = ['second', 'minute', 'hour', 'day', 'month', 'weekday'];
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MONTH_NAMES = ['', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

function parseField(expr, min, max) {
    const values = new Set();
    if (expr === '?') { for (let i = min; i <= max; i++) values.add(i); return Array.from(values).sort((a, b) => a - b); }
    if (expr === 'L') {
        if (min === 1) return ['L'];
        else { values.add(6); }
        return Array.from(values).sort((a, b) => a - b);
    }
    if (expr.includes('#')) {
        const parts = expr.split('#');
        const dow = parseInt(parts[0]); const n = parseInt(parts[1]);
        if (!isNaN(dow) && !isNaN(n) && dow >= min && dow <= max && n >= 1 && n <= 5) return [n * 100 + dow];
        throw new Error(`无效的 '#' 表达式: ${expr}`);
    }
    if (expr.endsWith('W')) {
        const day = parseInt(expr.slice(0, -1));
        if (!isNaN(day) && day >= min && day <= max) return [day * 1000 + 1];
        throw new Error(`无效的 'W' 表达式: ${expr}`);
    }

    const parts = expr.split(',');
    for (const part of parts) {
        if (part.includes('/')) {
            const [range, stepStr] = part.split('/');
            const step = parseInt(stepStr);
            if (isNaN(step) || step < 1) throw new Error(`无效的步长: ${part}`);
            let start, end;
            if (range === '*') { start = min; end = max; }
            else if (range.includes('-')) { [start, end] = range.split('-').map(Number); }
            else { start = parseInt(range); end = max; }
            if (isNaN(start) || isNaN(end)) throw new Error(`无效的范围: ${part}`);
            for (let i = start; i <= end; i += step) { if (i >= min && i <= max) values.add(i); }
        } else if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (isNaN(start) || isNaN(end)) throw new Error(`无效的范围: ${part}`);
            for (let i = start; i <= end; i++) { if (i >= min && i <= max) values.add(i); }
        } else if (part === '*') {
            for (let i = min; i <= max; i++) values.add(i);
        } else {
            const v = parseInt(part);
            if (isNaN(v)) throw new Error(`无效的值: ${part}`);
            if (v >= min && v <= max) values.add(v);
            else throw new Error(`值 ${v} 超出范围 ${min}-${max}`);
        }
    }
    return Array.from(values).sort((a, b) => a - b);
}

function parseCronExpression(expr) {
    expr = expr.trim();
    const parts = expr.split(/\s+/);
    if (parts.length !== 5 && parts.length !== 6) {
        throw new Error(`Cron 表达式必须是 5 或 6 个字段，当前有 ${parts.length} 个字段。格式：${parts.length === 6 ? '秒 分 时 日 月 星期' : '分 时 日 月 星期'}`);
    }
    let fields = [];
    let fieldIndex = 0;
    if (parts.length === 6) {
        try {
            const values = parseField(parts[0], 0, 59);
            fields.push({ name: '秒', expr: parts[0], values, min: 0, max: 59, cls: 'second' });
        } catch (e) { throw new Error(`第 1 个字段（秒）解析错误: ${e.message}`); }
        fieldIndex = 1;
    }
    for (let i = 0; i < 5; i++) {
        try {
            const values = parseField(parts[fieldIndex], FIELD_RANGES[i + (parts.length === 5 ? 1 : 0)][0], FIELD_RANGES[i + (parts.length === 5 ? 1 : 0)][1]);
            fields.push({ name: FIELD_NAMES[i + (parts.length === 5 ? 1 : 0)], expr: parts[fieldIndex], values, min: FIELD_RANGES[i + (parts.length === 5 ? 1 : 0)][0], max: FIELD_RANGES[i + (parts.length === 5 ? 1 : 0)][1], cls: FIELD_CLASSES[i + (parts.length === 5 ? 1 : 0)] });
        } catch (e) { throw new Error(`第 ${i + 1} 个字段（${FIELD_NAMES[i + (parts.length === 5 ? 1 : 0)]}）解析错误: ${e.message}`); }
        fieldIndex++;
    }
    return fields;
}

function generateDescription(fields) {
    const hasSecond = fields.length === 6;
    const second = hasSecond ? fields[0] : null;
    const minute = hasSecond ? fields[1] : fields[0];
    const hour = hasSecond ? fields[2] : fields[1];
    const day = hasSecond ? fields[3] : fields[2];
    const month = hasSecond ? fields[4] : fields[3];
    const weekday = hasSecond ? fields[5] : fields[4];
    const isSecondEvery = !second || second.expr === '*';
    const isMinuteEvery = minute.expr === '*';
    const isHourEvery = hour.expr === '*';
    const isDayEvery = day.expr === '*' || day.expr === '?';
    const isMonthEvery = month.expr === '*';
    const isWeekdayEvery = weekday.expr === '*' || weekday.expr === '?';

    if (hasSecond && isSecondEvery && isMinuteEvery && isHourEvery && isDayEvery && isMonthEvery && isWeekdayEvery) return '每秒执行一次';
    if (!hasSecond && isMinuteEvery && isHourEvery && isDayEvery && isMonthEvery && isWeekdayEvery) return '每分钟执行一次';
    if (hasSecond && !isSecondEvery && isMinuteEvery && isHourEvery && isDayEvery && isMonthEvery && isWeekdayEvery) return '每分钟的第 ' + second.values[0] + ' 秒执行一次';
    if (isSecondEvery && minute.expr.startsWith('*/') && isHourEvery && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const step = parseInt(minute.expr.split('/')[1]);
        return `每隔 <strong>${step}</strong> 分钟执行一次`;
    }
    if (isSecondEvery && isMinuteEvery && hour.expr.startsWith('*/') && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const step = parseInt(hour.expr.split('/')[1]);
        return `每隔 <strong>${step}</strong> 小时执行一次`;
    }
    if (hasSecond && !isSecondEvery && minute.values.length === 1 && hour.expr.startsWith('*/') && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const step = parseInt(hour.expr.split('/')[1]);
        return `每隔 <strong>${step}</strong> 小时的第 <strong>${minute.values[0]}</strong> 分钟的第 <strong>${second.values[0]}</strong> 秒执行一次`;
    }
    if (hasSecond && !isSecondEvery && minute.values.length === 1 && hour.values.length === 1 && isDayEvery && isMonthEvery && isWeekdayEvery) {
        return `每天 <strong>${formatTime(hour.values[0], minute.values[0])}</strong> 的第 <strong>${second.values[0]}</strong> 秒执行一次`;
    }
    if (isSecondEvery && minute.values.length === 1 && hour.values.length === 1 && isDayEvery && isMonthEvery && isWeekdayEvery) {
        return `每天 <strong>${formatTime(hour.values[0], minute.values[0])}</strong> 执行一次`;
    }
    if (hasSecond && !isSecondEvery && minute.values.length === 1 && !isHourEvery && isDayEvery && isMonthEvery && isWeekdayEvery) {
        return `每天的 ${formatHourList(hour.values)} 的第 <strong>${minute.values[0]}</strong> 分钟的第 <strong>${second.values[0]}</strong> 秒各执行一次`;
    }
    if (hour.expr.startsWith('*/') && !isMinuteEvery && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每隔 <strong>${hourStep}</strong> 小时的第 <strong>${minute.values.join('、')}</strong> 分钟执行一次`;
    }
    if (isSecondEvery && minute.values.length === 1 && !isHourEvery && isDayEvery && isMonthEvery && isWeekdayEvery) {
        return `每天的 ${formatHourList(hour.values)} 的第 <strong>${minute.values[0]}</strong> 分钟各执行一次`;
    }
    if (minute.values.length === 1 && (hour.values.length === 1 || hour.expr === '*') && isDayEvery && isMonthEvery && !isWeekdayEvery) {
        const timeStr = hour.values.length === 1 ? formatTime(hour.values[0], minute.values[0]) : `每小时的第 ${minute.values[0]} 分钟`;
        return `每周的 ${formatWeekdayList(weekday.values)} ${timeStr} 执行一次`;
    }
    if (minute.values.length === 1 && (hour.values.length === 1 || hour.expr === '*') && !isDayEvery && isMonthEvery && isWeekdayEvery) {
        const timeStr = hour.values.length === 1 ? formatTime(hour.values[0], minute.values[0]) : `每小时的第 ${minute.values[0]} 分钟`;
        return `每月的 ${formatDayList(day.values)} ${timeStr} 执行一次`;
    }
    if (minute.values.length === 1 && (hour.values.length === 1 || hour.expr === '*') && isDayEvery && !isMonthEvery && isWeekdayEvery) {
        const timeStr = hour.values.length === 1 ? formatTime(hour.values[0], minute.values[0]) : `每小时的第 ${minute.values[0]} 分钟`;
        return `每年的 ${formatMonthList(month.values)} ${timeStr} 执行一次`;
    }
    if (minute.expr.startsWith('*/') && hour.expr.startsWith('*/') && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每隔 <strong>${hourStep}</strong> 小时的每 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (minute.expr.startsWith('*/') && !isHourEvery && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        return `在 ${formatHourList(hour.values)} 的每 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (minute.expr.startsWith('*/') && hour.expr.startsWith('*/') && !isDayEvery && isMonthEvery && isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每月的 ${formatDayList(day.values)} 每隔 <strong>${hourStep}</strong> 小时的每 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (minute.expr.startsWith('*/') && hour.expr.startsWith('*/') && isDayEvery && !isMonthEvery && isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每年的 ${formatMonthList(month.values)} 每隔 <strong>${hourStep}</strong> 小时的每 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (minute.expr.startsWith('*/') && hour.expr.startsWith('*/') && !isDayEvery && !isMonthEvery && isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每年的 ${formatMonthList(month.values)} 的 ${formatDayList(day.values)} 每隔 <strong>${hourStep}</strong> 小时的每 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (hasSecond && !isSecondEvery && minute.expr.startsWith('*/') && isHourEvery && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const secondStep = parseInt(second.expr.split('/')[1]);
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        return `每隔 <strong>${minuteStep}</strong> 分钟的每 <strong>${secondStep}</strong> 秒执行一次`;
    }
    if (hasSecond && !isSecondEvery && minute.expr.startsWith('*/') && hour.expr.startsWith('*/') && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const secondStep = parseInt(second.expr.split('/')[1]);
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每隔 <strong>${hourStep}</strong> 小时的每 <strong>${minuteStep}</strong> 分钟的每 <strong>${secondStep}</strong> 秒执行一次`;
    }
    if (hasSecond && second.expr.startsWith('*/') && isMinuteEvery && hour.expr.startsWith('*/') && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const secondStep = parseInt(second.expr.split('/')[1]);
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每隔 <strong>${hourStep}</strong> 小时的每秒的第 <strong>${secondStep}</strong> 秒执行一次`;
    }
    if (minute.expr.startsWith('*/') && hour.expr.startsWith('*/') && isDayEvery && isMonthEvery && !isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每周的 ${formatWeekdayList(weekday.values)} 每隔 <strong>${hourStep}</strong> 小时的每 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (minute.expr.startsWith('*/') && hour.expr.startsWith('*/') && !isDayEvery && !isMonthEvery && !isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每年的 ${formatMonthList(month.values)} 的 ${formatDayList(day.values)} 且每周的 ${formatWeekdayList(weekday.values)} 每隔 <strong>${hourStep}</strong> 小时的每 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (hasSecond && second.expr.startsWith('*/') && isMinuteEvery && isHourEvery && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const secondStep = parseInt(second.expr.split('/')[1]);
        return `每隔 <strong>${secondStep}</strong> 秒执行一次`;
    }
    if (minute.expr.startsWith('*/') && isHourEvery && isDayEvery && isMonthEvery && !isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        return `每周的 ${formatWeekdayList(weekday.values)} 每隔 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (hour.expr.startsWith('*/') && !isMinuteEvery && !isDayEvery && isMonthEvery && isWeekdayEvery) {
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每月的 ${formatDayList(day.values)} 每隔 <strong>${hourStep}</strong> 小时的第 <strong>${minute.values.join('、')}</strong> 分钟执行一次`;
    }
    if (hour.expr.startsWith('*/') && !isMinuteEvery && isDayEvery && !isMonthEvery && isWeekdayEvery) {
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每年的 ${formatMonthList(month.values)} 每隔 <strong>${hourStep}</strong> 小时的第 <strong>${minute.values.join('、')}</strong> 分钟执行一次`;
    }
    if (hasSecond && !isSecondEvery && minute.values.length === 1 && hour.expr.startsWith('*/') && !isDayEvery && isMonthEvery && isWeekdayEvery) {
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每月的 ${formatDayList(day.values)} 每隔 <strong>${hourStep}</strong> 小时的第 <strong>${minute.values[0]}</strong> 分钟的第 <strong>${second.values[0]}</strong> 秒执行一次`;
    }
    if (hasSecond && second.expr.startsWith('*/') && minute.values.length === 1 && hour.expr.startsWith('*/') && isDayEvery && isMonthEvery && isWeekdayEvery) {
        const secondStep = parseInt(second.expr.split('/')[1]);
        const hourStep = parseInt(hour.expr.split('/')[1]);
        return `每隔 <strong>${hourStep}</strong> 小时的第 <strong>${minute.values[0]}</strong> 分钟的每 <strong>${secondStep}</strong> 秒执行一次`;
    }
    if (minute.expr.startsWith('*/') && !isHourEvery && isDayEvery && !isMonthEvery && !isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        return `每年的 ${formatMonthList(month.values)} 的 ${formatWeekdayList(weekday.values)} 的 ${formatHourList(hour.values)} 每隔 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (minute.expr.startsWith('*/') && !isHourEvery && isDayEvery && !isMonthEvery && isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        return `每年的 ${formatMonthList(month.values)} 的 ${formatHourList(hour.values)} 每隔 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (minute.expr.startsWith('*/') && !isHourEvery && !isDayEvery && isMonthEvery && !isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        return `每月的 ${formatDayList(day.values)} 的 ${formatWeekdayList(weekday.values)} 的 ${formatHourList(hour.values)} 每隔 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (minute.expr.startsWith('*/') && !isHourEvery && isDayEvery && isMonthEvery && !isWeekdayEvery) {
        const minuteStep = parseInt(minute.expr.split('/')[1]);
        return `每周的 ${formatWeekdayList(weekday.values)} 的 ${formatHourList(hour.values)} 每隔 <strong>${minuteStep}</strong> 分钟执行一次`;
    }
    if (!isMinuteEvery && !isHourEvery && !isDayEvery && isMonthEvery && isWeekdayEvery) {
        return `每月的 ${formatDayList(day.values)} 的 ${formatHourList(hour.values)} 的第 <strong>${minute.values.join('、')}</strong> 分钟各执行一次`;
    }
    if (!isMinuteEvery && !isHourEvery && isDayEvery && !isMonthEvery && isWeekdayEvery) {
        return `每年的 ${formatMonthList(month.values)} 的 ${formatHourList(hour.values)} 的第 <strong>${minute.values.join('、')}</strong> 分钟各执行一次`;
    }
    if (!isMinuteEvery && !isHourEvery && isDayEvery && isMonthEvery && !isWeekdayEvery) {
        return `每周的 ${formatWeekdayList(weekday.values)} 的 ${formatHourList(hour.values)} 的第 <strong>${minute.values.join('、')}</strong> 分钟各执行一次`;
    }
    if (!isMinuteEvery && !isHourEvery && !isDayEvery && !isMonthEvery && isWeekdayEvery) {
        return `每年的 ${formatMonthList(month.values)} 的 ${formatDayList(day.values)} 的 ${formatHourList(hour.values)} 的第 <strong>${minute.values.join('、')}</strong> 分钟各执行一次`;
    }
    if (!isMinuteEvery && !isHourEvery && !isDayEvery && isMonthEvery && !isWeekdayEvery) {
        return `每月的 ${formatDayList(day.values)} 的 ${formatWeekdayList(weekday.values)} 的 ${formatHourList(hour.values)} 的第 <strong>${minute.values.join('、')}</strong> 分钟各执行一次`;
    }
    if (!isMinuteEvery && !isHourEvery && isDayEvery && !isMonthEvery && !isWeekdayEvery) {
        return `每年的 ${formatMonthList(month.values)} 的 ${formatWeekdayList(weekday.values)} 的 ${formatHourList(hour.values)} 的第 <strong>${minute.values.join('、')}</strong> 分钟各执行一次`;
    }
    if (!isMinuteEvery && !isHourEvery && !isDayEvery && !isMonthEvery && !isWeekdayEvery) {
        return `每年的 ${formatMonthList(month.values)} 的 ${formatDayList(day.values)} 且每周的 ${formatWeekdayList(weekday.values)} 的 ${formatHourList(hour.values)} 的第 <strong>${minute.values.join('、')}</strong> 分钟各执行一次`;
    }
    function getFriendlyDescription(fields) {
        const minute = fields[0], hour = fields[1], day = fields[2], month = fields[3], weekday = fields[4];
        const minuteExpr = minute.expr, hourExpr = hour.expr, dayExpr = day.expr, monthExpr = month.expr, weekdayExpr = weekday.expr;
        const isMinuteWildcard = minuteExpr === '*' || minuteExpr === '?';
        const isHourWildcard = hourExpr === '*' || hourExpr === '?';
        const isDayWildcard = dayExpr === '*' || dayExpr === '?';
        const isMonthWildcard = monthExpr === '*';
        const isWeekdayWildcard = weekdayExpr === '*' || weekdayExpr === '?';
        const minuteHasRange = minuteExpr.includes('-') && !minuteExpr.startsWith('*/');
        const hourHasRange = hourExpr.includes('-') && !hourExpr.startsWith('*/');

        if (!isMonthWildcard && isWeekdayWildcard && isDayWildcard && hourExpr.startsWith('*/') && isMinuteWildcard) {
            const hourStep = parseInt(hourExpr.split('/')[1]);
            return `每年的 ${formatMonthList(month.values)}，每隔 <strong>${hourStep}</strong> 小时执行一次`;
        }
        if (!isMonthWildcard && !isWeekdayWildcard && isDayWildcard && isHourWildcard && isMinuteWildcard) {
            return `每年的 ${formatMonthList(month.values)} 的 ${formatWeekdayList(weekday.values)} 执行一次`;
        }
        if (isMinuteWildcard && isHourWildcard && !isDayWildcard && isMonthWildcard && !isWeekdayWildcard) {
            return `每月的 ${formatDayList(day.values)} 或每周的 ${formatWeekdayList(weekday.values)} 每分钟执行一次`;
        }
        if (!isMinuteWildcard && isHourWildcard && !isDayWildcard && isMonthWildcard && isWeekdayWildcard && minuteExpr.startsWith('*/')) {
            const minuteStep = parseInt(minuteExpr.split('/')[1]);
            return `每月的 ${formatDayList(day.values)}，每隔 <strong>${minuteStep}</strong> 分钟执行一次`;
        }
        if (isMinuteWildcard && isHourWildcard && !isDayWildcard && !isMonthWildcard && isWeekdayWildcard) {
            return `每年的 ${formatMonthList(month.values)} 的 ${formatDayList(day.values)} 每分钟执行一次`;
        }
        if (isMinuteWildcard && !isHourWildcard && !isDayWildcard && isMonthWildcard && isWeekdayWildcard && hourHasRange) {
            return `每月的 ${formatDayList(day.values)} 的 <strong>${hourExpr}</strong> 点每分钟执行一次`;
        }
        if (isMinuteWildcard && !isHourWildcard && !isDayWildcard && isMonthWildcard && isWeekdayWildcard && !hourHasRange && hourExpr.startsWith('*/')) {
            const hourStep = parseInt(hourExpr.split('/')[1]);
            return `每月的 ${formatDayList(day.values)}，每隔 <strong>${hourStep}</strong> 小时每分钟执行一次`;
        }
        if (!isMinuteWildcard && !isHourWildcard && minuteHasRange && hourHasRange) {
            return `每天 <strong>${hourExpr}</strong> 点，每小时的 <strong>${minuteExpr}</strong> 分钟执行一次`;
        }
        if (!isMinuteWildcard && isHourWildcard && minuteHasRange && !isDayWildcard && isMonthWildcard && isWeekdayWildcard) {
            return `每月的 <strong>${dayExpr}</strong> 日，每小时的 <strong>${minuteExpr}</strong> 分钟执行一次`;
        }
        if (!isMinuteWildcard && !isHourWildcard && minuteHasRange) {
            return `每天 <strong>${hourExpr}</strong> 点，每小时的 <strong>${minuteExpr}</strong> 分钟执行一次`;
        }
        if (!isMinuteWildcard && isHourWildcard && minuteHasRange) {
            return `每小时的 <strong>${minuteExpr}</strong> 分钟执行一次`;
        }
        if (!isMinuteWildcard && !isHourWildcard && hourHasRange) {
            return `每天 <strong>${hourExpr}</strong> 点执行一次`;
        }
        return null;
    }
    const descParts = [];
    for (const field of fields) { if (field.expr !== '*' && field.expr !== '?') descParts.push(`${field.name}: ${field.expr}`); }
    if (descParts.length > 0) {
        const friendly = getFriendlyDescription(fields);
        if (friendly) return friendly;
        return `自定义调度: ${descParts.join(', ')}`;
    }
    return '每分钟执行一次';
}

function formatTime(h, m) { return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
function formatHourList(values) {
    if (values.length >= 3) {
        const step = values[1] - values[0];
        let isStepPattern = step > 0;
        for (let i = 2; i < values.length && isStepPattern; i++) {
            if (values[i] - values[i - 1] !== step) isStepPattern = false;
        }
        if (isStepPattern) {
            return `每隔 <strong>${step}</strong> 小时`;
        }
    }
    if (values.length <= 4) return values.map(v => `<strong>${v}</strong> 点`).join('、');
    return `<strong>${values[0]}-${values[values.length - 1]}</strong> 点`;
}
function formatWeekdayList(values) { return values.map(v => `<strong>${WEEKDAY_NAMES[v]}</strong>`).join('、'); }
function formatDayList(values) {
    if (values.length <= 5) return values.map(v => `<strong>${v}</strong> 号`).join('、');
    return `<strong>${values[0]}-${values[values.length - 1]}</strong> 号`;
}
function formatMonthList(values) {
    if (values.length <= 4) return values.map(v => `<strong>${MONTH_NAMES[v]}</strong>`).join('、');
    return `<strong>${values[0]}-${values[values.length - 1]}</strong> 月`;
}

function getNextOccurrences(fields, count = 10, baseTime = null) {
    const hasSecond = fields.length === 6;
    const secondVals = hasSecond ? fields[0].values : [0];
    const minuteVals = hasSecond ? fields[1].values : fields[0].values;
    const hourVals = hasSecond ? fields[2].values : fields[1].values;
    const dayVals = hasSecond ? fields[3].values : fields[2].values;
    const monthVals = hasSecond ? fields[4].values : fields[3].values;
    const weekdayVals = hasSecond ? fields[5].values : fields[4].values;
    const secondField = hasSecond ? fields[0] : null;
    const minuteField = hasSecond ? fields[1] : fields[0];
    const hourField = hasSecond ? fields[2] : fields[1];
    const dayField = hasSecond ? fields[3] : fields[2];
    const weekdayField = hasSecond ? fields[5] : fields[4];

    const results = [];
    const now = baseTime || new Date();

    const secondIsWildcard = !hasSecond || secondVals.length === 60;
    const minuteIsWildcard = minuteVals.length === 60;
    const hourIsWildcard = hourVals.length === 24;

    let startMinute = now.getMinutes();
    let startSecond = now.getSeconds();
    let startHour = now.getHours();
    let needCheckPast = false;
    let dayOffset = 0;
    let minuteOverflowHandled = false;

    if (!minuteIsWildcard && !minuteField.expr.startsWith('*/')) {
        const targetMinute = minuteVals.find(m => m >= startMinute);
        if (targetMinute !== undefined) {
            startMinute = targetMinute;
            startSecond = 0;
        } else {
            startMinute = minuteVals[0];
            startHour = startHour + 1;
            startSecond = 0;
            if (startHour > 23) {
                startHour = startHour % 24;
                dayOffset = 1;
            }
            minuteOverflowHandled = true;
        }
        needCheckPast = true;
    } else if (minuteField.expr.startsWith('*/')) {
        const step = parseInt(minuteField.expr.split('/')[1]) || 1;
        const remainder = startMinute % step;
        if (remainder !== 0) {
            startMinute = startMinute + (step - remainder);
        }
        if (startMinute >= 60) {
            startMinute = startMinute - 60;
            startHour = startHour + 1;
            if (startHour > 23) {
                startHour = startHour % 24;
                dayOffset = 1;
            }
        }
        needCheckPast = true;
    }

    if (!hourIsWildcard && !hourField.expr.startsWith('*/')) {
        let targetHour = hourVals.find(h => h >= startHour);
        if (targetHour === undefined) {
            targetHour = hourVals[0];
            const hourChanged = startHour !== targetHour;
            startHour = targetHour;
            if (!minuteIsWildcard && !minuteField.expr.startsWith('*/')) {
                startMinute = minuteVals[0] || 0;
            } else if (minuteField.expr.startsWith('*/')) {
                startMinute = minuteVals[0] || 0;
            }
            dayOffset = 1;
            if (hourChanged) {
                startSecond = 0;
            }
        } else {
            if (targetHour !== startHour) {
                startHour = targetHour;
                if (!minuteIsWildcard && !minuteField.expr.startsWith('*/')) {
                    startMinute = minuteVals[0] || 0;
                } else if (minuteField.expr.startsWith('*/')) {
                    startMinute = minuteVals[0] || 0;
                }
            }
        }
        needCheckPast = true;
    } else if (hourField.expr.startsWith('*/') && !minuteOverflowHandled) {
        const step = parseInt(hourField.expr.split('/')[1]) || 1;
        startHour = startHour + step;
        needCheckPast = true;
    } else if (hourIsWildcard && minuteIsWildcard) {
        if (secondIsWildcard) {
            startSecond = startSecond + 1;
            if (startSecond >= 60) {
                startSecond = 0;
                startMinute = startMinute + 1;
                if (startMinute >= 60) {
                    startMinute = 0;
                    startHour = startHour + 1;
                }
            }
        }
    }

    const dayIsWildcard = dayField.expr === '*' || dayField.expr === '?';
    if (!dayIsWildcard) {
        const today = now.getDate();
        const targetDay = dayVals.find(d => d >= today);
        if (targetDay !== undefined) {
            if (targetDay !== today) {
                dayOffset = targetDay - today;
                startHour = hourIsWildcard ? (hourVals[0] || 0) : startHour;
                startMinute = minuteIsWildcard ? (minuteVals[0] || 0) : startMinute;
                startSecond = 0;
            }
        } else {
            const nextMonthDay = dayVals[0];
            const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const remainingDays = daysInCurrentMonth - today;
            dayOffset = remainingDays + nextMonthDay;
            startHour = hourIsWildcard ? (hourVals[0] || 0) : startHour;
            startMinute = minuteIsWildcard ? (minuteVals[0] || 0) : startMinute;
            startSecond = 0;
        }
    }

    if (secondField && secondField.expr.startsWith('*/')) {
        const step = parseInt(secondField.expr.split('/')[1]) || 1;
        const remainder = startSecond % step;
        if (remainder !== 0) {
            startSecond = startSecond + (step - remainder);
        }
    }

    if (needCheckPast) {
        const tempDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute, startSecond);
        if (tempDate <= now) {
            if (hourField.expr.startsWith('*/')) {
                const step = parseInt(hourField.expr.split('/')[1]) || 1;
                startHour = startHour + step;
            } else if (minuteField.expr.startsWith('*/')) {
                const step = parseInt(minuteField.expr.split('/')[1]) || 1;
                startMinute = startMinute + step;
                if (startMinute >= 60) {
                    startMinute = startMinute - 60;
                    startHour = startHour + 1;
                }
            }
        }
    }

    let current = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, startHour, startMinute, startSecond, 0);
    let maxIterations = 366 * 24 * 60 * 60 * 2;
    let iterations = 0;

    let minuteStep = 1;
    let secondStep = 1;
    if (minuteField.expr.includes('/')) {
        const parts = minuteField.expr.split('/');
        if (parts.length === 2) {
            minuteStep = parseInt(parts[1]) || 1;
        }
    }
    if (secondField && secondField.expr.includes('/')) {
        const parts = secondField.expr.split('/');
        if (parts.length === 2) {
            secondStep = parseInt(parts[1]) || 1;
        }
    }

    while (results.length < count && iterations < maxIterations) {
        iterations++;
        const month = current.getMonth() + 1;
        const day = current.getDate();
        const hour = current.getHours();
        const minute = current.getMinutes();
        const second = current.getSeconds();
        const weekday = current.getDay();

        if (monthVals[0] < 100 && !monthVals.includes(month)) {
            current.setMonth(current.getMonth() + 1); current.setDate(1); current.setHours(0); current.setMinutes(0); current.setSeconds(0); continue;
        }

        let dayMatch = false;
        const dayIsSpecial = dayVals.some(v => v >= 100);
        const weekdayIsSpecial = weekdayVals.some(v => v >= 100);
        if (dayIsSpecial || weekdayIsSpecial) { dayMatch = true; }
        else if ((dayField.expr === '*' || dayField.expr === '?') && (weekdayField.expr === '*' || weekdayField.expr === '?')) { dayMatch = true; }
        else if (dayField.expr !== '*' && dayField.expr !== '?' && (weekdayField.expr === '*' || weekdayField.expr === '?')) { dayMatch = dayVals.includes(day); }
        else if ((dayField.expr === '*' || dayField.expr === '?') && weekdayField.expr !== '*' && weekdayField.expr !== '?') { dayMatch = weekdayVals.includes(weekday); }
        else { dayMatch = dayVals.includes(day) || weekdayVals.includes(weekday); }

        if (!dayMatch) { current.setDate(current.getDate() + 1); continue; }
        if (!hourVals.includes(hour)) {
            if (hourField.expr.startsWith('*/')) {
                const step = parseInt(hourField.expr.split('/')[1]) || 1;
                const remainder = hour % step;
                const addHour = remainder === 0 ? step : step - remainder;
                current.setHours(current.getHours() + addHour);
            } else {
                current.setHours(current.getHours() + 1);
            }
            continue;
        }
        if (!minuteField.expr.startsWith('*/') && !minuteVals.includes(minute)) {
            const nextMinute = minuteVals.find(m => m >= minute);
            if (nextMinute !== undefined) {
                current.setMinutes(nextMinute);
            } else {
                current.setMinutes(minuteVals[0]);
                if (hourField.expr.startsWith('*/')) {
                    const hourStep = parseInt(hourField.expr.split('/')[1]) || 1;
                    let nextHour = current.getHours() + 1;
                    if (nextHour > 23) {
                        nextHour = 0;
                        current.setDate(current.getDate() + 1);
                    }
                    const remainder = nextHour % hourStep;
                    if (remainder !== 0) {
                        nextHour = nextHour + (hourStep - remainder);
                    }
                    if (nextHour > 23) {
                        nextHour = nextHour % 24;
                        current.setDate(current.getDate() + 1);
                    }
                    current.setHours(nextHour);
                } else {
                    current.setHours(current.getHours() + 1);
                }
            }
            current.setSeconds(0);
            continue;
        }
        if (hasSecond && !secondVals.includes(second)) {
            current.setSeconds(current.getSeconds() + 1);
            continue;
        }

        const resultDate = new Date(current);
        if (resultDate - now >= 1000) {
            results.push(resultDate);
        }
        if (!minuteIsWildcard && minuteField.expr.startsWith('*/')) {
            current.setMinutes(current.getMinutes() + minuteStep);
            if (current.getMinutes() >= 60) {
                current.setHours(current.getHours() + 1);
                current.setMinutes(current.getMinutes() - 60);
            }
        } else if (minuteIsWildcard && !hourIsWildcard) {
            current.setMinutes(current.getMinutes() + 1);
            if (current.getMinutes() >= 60) {
                current.setHours(current.getHours() + 1);
                current.setMinutes(0);
            }
        } else if (!minuteIsWildcard && hourField.expr.startsWith('*/')) {
            const hourStep = parseInt(hourField.expr.split('/')[1]) || 1;
            const currentMinute = current.getMinutes();
            const currentHour = current.getHours();
            const nextMinute = minuteVals.find(m => m > currentMinute);
            if (nextMinute !== undefined) {
                current.setMinutes(nextMinute);
            } else {
                let nextHour = currentHour + hourStep;
                if (nextHour > 23) {
                    nextHour = nextHour % 24;
                    current.setDate(current.getDate() + 1);
                }
                const matchHour = (nextHour % (hourStep * 2)) === 0 || (hourStep === 1);
                if (!matchHour) {
                    nextHour = nextHour + (hourStep - nextHour % hourStep) % hourStep;
                }
                current.setHours(nextHour);
                current.setMinutes(minuteVals[0]);
                current.setSeconds(0);
            }
        } else if (hourField.expr.startsWith('*/')) {
            const step = parseInt(hourField.expr.split('/')[1]) || 1;
            current.setHours(current.getHours() + step);
        } else if (secondIsWildcard && !minuteIsWildcard) {
            current.setMinutes(current.getMinutes() + 1);
        } else if (secondIsWildcard && !hasSecond) {
            current.setMinutes(current.getMinutes() + 1);
            if (current.getMinutes() >= 60) {
                current.setHours(current.getHours() + 1);
                current.setMinutes(0);
            }
        } else if (secondIsWildcard) {
            current.setSeconds(current.getSeconds() + 1);
        } else {
            current.setSeconds(current.getSeconds() + secondStep);
        }
    }
    return results;
}

function formatDistance(date, baseTime) {
    const now = baseTime || new Date();
    const diff = date - now;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} 天 ${hours % 24} 小时 ${minutes % 60} 分钟 ${seconds % 60} 秒后`;
    if (hours > 0) return `${hours} 小时 ${minutes % 60} 分钟 ${seconds % 60} 秒后`;
    if (minutes > 0) return `${minutes} 分钟 ${seconds % 60} 秒后`;
    return `${seconds} 秒后`;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s} ${WEEKDAY_NAMES[date.getDay()]}`;
}

function parseCron() {
    const input = document.getElementById('cron-input');
    const expr = input.value.trim();
    document.getElementById('error-box').style.display = 'none';
    input.classList.remove('error');
    if (!expr) { showError('请输入 Cron 表达式'); return; }
    try {
        const fields = parseCronExpression(expr);
        updateFieldVisual(fields);
        document.getElementById('description-box').innerHTML = generateDescription(fields);
        document.getElementById('description-box').style.display = 'block';
        const now = new Date();
        const occurrences = getNextOccurrences(fields, 10, now);
        renderScheduleTable(occurrences, now);
    } catch (e) { showError(e.message); }
}

function updateFieldVisual(fields) {
    document.getElementById('field-visual').innerHTML = fields.map(f =>
        `<div class="field-chip ${f.cls}"><div class="field-label">${f.name}</div><div class="field-value">${escapeHtml(f.expr)}</div><div class="field-desc">${f.min}-${f.max}</div></div>`
    ).join('');
}

function renderScheduleTable(occurrences, baseTime) {
    const tbody = document.getElementById('schedule-body');
    if (occurrences.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;">无法计算执行时间（请检查表达式）</td></tr>';
        return;
    }
    tbody.innerHTML = occurrences.map((date, i) =>
        `<tr><td>${i + 1}</td><td>${formatDate(date)}</td><td>${formatDistance(date, baseTime)}</td></tr>`
    ).join('');
}

function showError(message) {
    document.getElementById('error-box').textContent = '错误: ' + message;
    document.getElementById('error-box').style.display = 'block';
    document.getElementById('cron-input').classList.add('error');
    document.getElementById('description-box').style.display = 'none';
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function usePreset(expr) {
    document.getElementById('cron-input').value = expr;
    parseCron();
}

function copyCron() {
    const expr = document.getElementById('cron-input').value;
    if (!expr) { utils.showError('请先生成 Cron 表达式'); return; }
    navigator.clipboard.writeText(expr).then(function () {
        const btn = document.querySelector('#tab-parse .copy-btn');
        const orig = btn.textContent; btn.textContent = '已复制'; btn.classList.add('copied');
        setTimeout(function () { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
        utils.showSuccess('已复制到剪贴板！');
    }).catch(function () { utils.showError('复制失败，请手动复制'); });
}

function toggleCollapsible(header) {
    header.classList.toggle('open');
    header.nextElementSibling.classList.toggle('open');
}

// ===== 生成 Cron =====
const GEN_FIELDS = [
    { key: 'minute', label: '分钟', min: 0, max: 59, count: 60, cols: 'cols-24' },
    { key: 'hour', label: '小时', min: 0, max: 23, count: 24, cols: 'cols-24' },
    { key: 'day', label: '日', min: 1, max: 31, count: 31, cols: 'cols-12' },
    { key: 'month', label: '月', min: 1, max: 12, count: 12, cols: 'cols-12' },
    { key: 'weekday', label: '星期', min: 0, max: 6, count: 7, cols: 'cols-7', labels: WEEKDAY_NAMES }
];

// 初始化生成器复选框
function initGenerator() {
    GEN_FIELDS.forEach(function (f) {
        const container = document.getElementById(f.key + '-checkboxes');
        if (!container) return;
        let html = '';
        for (let i = f.min; i <= f.max; i++) {
            const label = f.labels ? f.labels[i] : i;
            html += `<div class="gen-check-item" data-field="${f.key}" data-value="${i}">
                <input type="checkbox" name="${f.key}" value="${i}">${label}
            </div>`;
        }
        container.innerHTML = html;
    });
    updateGenResult();
}

function toggleGenCheck(el) {
    el.classList.toggle('selected');
    const cb = el.querySelector('input[type="checkbox"]');
    cb.checked = !cb.checked;
    updateGenResult();
}

function switchGenMode(btn) {
    const row = btn.closest('.gen-mode-row');
    const field = row.getAttribute('data-field');
    const mode = btn.getAttribute('data-mode');

    // 更新按钮状态
    row.querySelectorAll('.gen-mode-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');

    // 显示/隐藏对应内容
    const parent = btn.closest('.gen-section');
    parent.querySelectorAll('.gen-step-row').forEach(function (el) { el.style.display = mode === 'step' ? 'flex' : 'none'; });
    parent.querySelectorAll('.gen-range-row').forEach(function (el) { el.style.display = mode === 'range' ? 'flex' : 'none'; });
    parent.querySelectorAll('.gen-specific-row').forEach(function (el) { el.style.display = mode === 'specific' ? 'block' : 'none'; });

    updateGenResult();
}

function getGenFieldExpr(field) {
    const section = document.getElementById('gen-' + field.key);
    const activeMode = section.querySelector('.gen-mode-btn.active').getAttribute('data-mode');

    if (activeMode === 'every') return '*';

    if (activeMode === 'step') {
        const stepInputs = section.querySelectorAll('.gen-step-row input[type="number"]');
        const step = stepInputs[0] ? parseInt(stepInputs[0].value) : 1;
        return '*/' + Math.max(1, step);
    }

    if (activeMode === 'range') {
        const rangeInputs = section.querySelectorAll('.gen-range-row input[type="number"]');
        const from = rangeInputs[0] ? parseInt(rangeInputs[0].value) : field.min;
        const to = rangeInputs[1] ? parseInt(rangeInputs[1].value) : field.max;
        if (from >= field.min && to <= field.max && from <= to) {
            return from === field.min && to === field.max ? '*' : from + '-' + to;
        }
        return '*';
    }

    if (activeMode === 'specific') {
        const container = document.getElementById(field.key + '-checkboxes');
        if (!container) return '*';
        const checked = container.querySelectorAll('.gen-check-item.selected');
        if (checked.length === 0) return '*';

        const values = Array.from(checked).map(function (el) { return parseInt(el.getAttribute('data-value')); }).sort((a, b) => a - b);

        // 检查是否为连续范围
        if (values.length > 2 && values[values.length - 1] - values[0] === values.length - 1) {
            return values[0] + '-' + values[values.length - 1];
        }

        // 检查是否为等差数列
        if (values.length >= 2) {
            let allSame = true;
            const diff = values[1] - values[0];
            for (let i = 2; i < values.length; i++) {
                if (values[i] - values[i - 1] !== diff) { allSame = false; break; }
            }
            if (allSame && values[0] === field.min && diff > 1) {
                return '*/' + diff;
            }
        }

        return values.join(',');
    }

    return '*';
}

function updateGenResult() {
    const parts = GEN_FIELDS.map(function (f) { return getGenFieldExpr(f); });
    const cron = parts.join(' ');
    document.getElementById('gen-result-cron').textContent = cron;

    // 生成描述
    try {
        const fields = parseCronExpression(cron);
        document.getElementById('gen-result-desc').innerHTML = generateDescription(fields);
    } catch (e) {
        document.getElementById('gen-result-desc').textContent = cron;
    }
}

function copyGenResult() {
    const expr = document.getElementById('gen-result-cron').textContent;
    navigator.clipboard.writeText(expr).then(function () {
        const btn = document.querySelector('#tab-generate .copy-btn');
        const orig = btn.textContent; btn.textContent = '已复制'; btn.classList.add('copied');
        setTimeout(function () { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
        utils.showSuccess('已复制到剪贴板！');
    }).catch(function () { utils.showError('复制失败，请手动复制'); });
}

function sendToParse() {
    const expr = document.getElementById('gen-result-cron').textContent;
    document.getElementById('cron-input').value = expr;
    switchTab('parse');
    parseCron();
}

// 实时解析
document.getElementById('cron-input').addEventListener('input', function () {
    const expr = this.value.trim();
    if (expr && expr.split(/\s+/).length === 5) parseCron();
});

document.getElementById('cron-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') parseCron();
});

// Event listeners for generator mode buttons
document.addEventListener('click', function(e) {
    const modeBtn = e.target.closest('.gen-mode-btn');
    if (modeBtn) {
        switchGenMode(modeBtn);
        return;
    }

    const checkItem = e.target.closest('.gen-check-item');
    if (checkItem) {
        toggleGenCheck(checkItem);
        return;
    }
});

// Event listeners for generator input changes
document.addEventListener('change', function(e) {
    const target = e.target;
    if (target.closest('.gen-mode-content') && target.tagName === 'INPUT') {
        updateGenResult();
    }
});

// 初始化
initGenerator();
parseCron();
