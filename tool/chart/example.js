/**
 * 数据转图表工具 —— 示例数据与规范数据模板
 * 数据结构规范（JSON）：
 * {
 *   "type": "bar|barh|stack|line|area|stackarea|pie|doughnut|radar|polar|scatter",  // 图表类型
 *   "title": "图表标题",                              // 可选
 *   "xTitle": "X轴标题",                             // 可选
 *   "yTitle": "Y轴标题",                             // 可选
 *   "labels": ["类别1", "类别2", ...],               // 分类标签 / 散点图 X 值
 *   "datasets": [                                    // 数据系列
 *     { "name": "系列名", "color": "#RRGGBB", "data": [10, 20, ...] }
 *   ]
 * }
 * 饼图 / 环形图通常只有一个 dataset。
 */

// 规范数据模板（供用户下载参考）
const chartDataTemplate = {
    type: 'bar',
    title: '示例图表标题',
    xTitle: 'X 轴',
    yTitle: '数值',
    labels: ['类别A', '类别B', '类别C', '类别D'],
    datasets: [
        { name: '系列一', color: '#5470c6', data: [120, 200, 150, 80] },
        { name: '系列二', color: '#91cc75', data: [80, 120, 90, 110] }
    ]
};

// 各类表示例数据
const chartExamples = {
    sales: {
        type: 'bar',
        title: '季度销售额对比',
        xTitle: '季度',
        yTitle: '销售额 (万元)',
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
            { name: '线上渠道', data: [320, 410, 380, 520] },
            { name: '线下门店', data: [220, 260, 300, 340] }
        ]
    },
    trend: {
        type: 'line',
        title: '用户增长趋势',
        xTitle: '月份',
        yTitle: '累计用户 (万人)',
        labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月'],
        datasets: [
            { name: '国内用户', data: [12, 18, 25, 33, 45, 58, 70, 88] },
            { name: '海外用户', data: [5, 8, 11, 15, 21, 27, 36, 47] }
        ]
    },
    traffic: {
        type: 'area',
        title: '网站访问量分布',
        xTitle: '时段',
        yTitle: '访问量 (PV)',
        labels: ['0点', '4点', '8点', '12点', '16点', '20点', '24点'],
        datasets: [
            { name: '移动端', data: [3200, 1500, 8600, 12400, 11200, 15800, 9200] },
            { name: '桌面端', data: [4100, 1900, 6200, 9800, 10400, 8600, 5400] }
        ]
    },
    share: {
        type: 'pie',
        title: '浏览器市场份额',
        labels: ['Chrome', 'Safari', 'Edge', 'Firefox', '其他'],
        datasets: [
            {
                name: '占比', data: [63.5, 19.8, 5.2, 3.1, 8.4]
            }
        ]
    },
    ratio: {
        type: 'doughnut',
        title: '预算分配比例',
        labels: ['研发', '市场', '运营', '人力', '其他'],
        datasets: [
            { name: '预算', data: [40, 25, 15, 12, 8] }
        ]
    },
    points: {
        type: 'scatter',
        title: '广告投入与销售额关系',
        xTitle: '广告投入 (万元)',
        yTitle: '销售额 (万元)',
        labels: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
        datasets: [
            { name: '样本A', data: [82, 110, 135, 160, 178, 205, 230, 248, 275, 292, 318] },
            { name: '样本B', data: [70, 95, 128, 142, 168, 190, 212, 240, 258, 285, 300] }
        ]
    },
    rank: {
        type: 'barh',
        title: '热门编程语言排行榜',
        xTitle: '使用率 (%)',
        labels: ['JavaScript', 'Python', 'Java', 'TypeScript', 'Go', 'Rust'],
        datasets: [
            { name: '使用率', data: [62, 51, 40, 38, 24, 13] }
        ]
    },
    compose: {
        type: 'stack',
        title: '各季度渠道销售额构成',
        xTitle: '季度',
        yTitle: '销售额 (万元)',
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
            { name: '线上', data: [320, 410, 380, 520] },
            { name: '门店', data: [220, 260, 300, 340] },
            { name: '代理', data: [90, 120, 140, 160] }
        ]
    },
    ability: {
        type: 'radar',
        title: '候选人能力评估',
        labels: ['沟通', '技术', '项目管理', '创新', '执行', '学习'],
        datasets: [
            { name: '候选人 A', data: [85, 92, 70, 88, 76, 90] },
            { name: '候选人 B', data: [92, 68, 88, 72, 90, 75] }
        ]
    },
    rose: {
        type: 'polar',
        title: '各区域业绩玫瑰图',
        labels: ['华东', '华南', '华北', '西南', '西北', '东北', '华中'],
        datasets: [
            { name: '业绩', data: [420, 360, 310, 240, 150, 190, 280] }
        ]
    }
};

// 暴露为全局，供 script.js 使用（与 mermaid 工具保持同样的隐式全局约定）
window.chartDataTemplate = chartDataTemplate;
window.chartExamples = chartExamples;
