/**
 * Analytics module for EPDK Süre Takip Platformu - High Performance Edition
 */

import { Store } from './store.js';
import { getQuarter, getDaysUntil, getStatus } from './utils.js';

let chart1 = null;
let chart2 = null;

// Track summary vs drilldown level for each chart
const chartLevels = { 1: 'summary', 2: 'summary' };
const othersItemsStore = { 1: [], 2: [] };

// Register Plugin and Custom Callout Lines
if (window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
}

// Custom Plugin for Pie Chart Connector Lines (Anti-Collision Edition)
const pieConnectorLines = {
    id: 'pieConnectorLines',
    afterDraw(chart) {
        if (chart.config.type !== 'pie') return;
        const { ctx } = chart;
        ctx.save();

        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((datapoint, index) => {
            const { x, y, startAngle, endAngle, outerRadius } = datapoint.getProps(['x', 'y', 'startAngle', 'endAngle', 'outerRadius'], true);

            const midAngle = startAngle + (endAngle - startAngle) / 2;

            // Stagger Logic: Even indices are short, odd indices are long to prevent lateral clashing
            const isStaggered = index % 2 !== 0;
            const lineExtension = isStaggered ? 45 : 20;

            const x0 = x + Math.cos(midAngle) * outerRadius;
            const y0 = y + Math.sin(midAngle) * outerRadius;
            const x1 = x + Math.cos(midAngle) * (outerRadius + lineExtension);
            const y1 = y + Math.sin(midAngle) * (outerRadius + lineExtension);

            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = chart.data.datasets[0].backgroundColor[index] || '#ffffff';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
        });
        ctx.restore();
    }
};

Chart.register(pieConnectorLines);

/**
 * Initializes analytics event listeners with Auto-Update support
 */
export function initAnalytics() {
    console.log('📊 Initializing Analytics Engine...');

    const selectors = [
        'chart1AnalysisType', 'chart1ChartType', 'chart1Year',
        'chart2AnalysisType', 'chart2ChartType', 'chart2Year'
    ];

    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const chartId = id.startsWith('chart1') ? 1 : 2;
                chartLevels[chartId] = 'summary'; // Revert on settings change
                updateChart(chartId);
            });
        }
    });

    // Handle the global back button for inline drill-down
    const btnBack = document.getElementById('btnBackToSummary');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            chartLevels[1] = 'summary';
            chartLevels[2] = 'summary';
            updateChart(1);
            updateChart(2);
            document.getElementById('drilldownControls').classList.add('hidden');
        });
    }

    // Initial render
    updateChart(1);
    updateChart(2);
}

/**
 * Updates all analytics visualizations
 */
export function updateAnalytics() {
    updateAnalyticsStats();
    if (chart1 || chart2) {
        updateChart(1);
        updateChart(2);
    }
}

/**
 * Updates basic stats on the analytics page (if labels exist)
 */
export function updateAnalyticsStats() {
    const totalObligations = Store.obligations.length;
    const completed = Store.obligations.filter(o => getStatus(o.deadline, o.status) === 'completed').length;
    const completionRate = totalObligations > 0 ? (completed / totalObligations * 100).toFixed(1) : 0;

    const elTotal = document.getElementById('totalProjectCount');
    const elRate = document.getElementById('completionRate');

    if (elTotal) {
        const uniqueProjects = new Set(Store.obligations.map(o => o.projectName)).size;
        elTotal.textContent = uniqueProjects;
    }

    if (elRate) elRate.textContent = `%${completionRate}`;
}

/**
 * Main Chart logic
 */
/**
 * Main Chart logic with Inline Drill-down support
 */
function updateChart(chartId) {
    const analysisType = document.getElementById(`chart${chartId}AnalysisType`).value;
    const chartType = document.getElementById(`chart${chartId}ChartType`).value;
    const yearFilter = document.getElementById(`chart${chartId}Year`).value;
    const container = document.getElementById(`chart${chartId}Container`);

    if (!container) return;

    // Data Source Selection
    let rawData = Store.obligations;
    if (analysisType === 'workload') {
        rawData = Store.jobs.filter(j => j.status !== 'completed');
    }

    if (yearFilter !== 'all' && analysisType !== 'workload') {
        rawData = rawData.filter(o => {
            const date = new Date(o.deadline || o.updatedAt);
            return !isNaN(date.getTime()) && date.getFullYear().toString() === yearFilter;
        });
    }

    const premiumColors = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#0ea5e9', '#a855f7', '#64748b', '#fb7185', '#38bdf8', '#818cf8', '#34d399', '#f472b6'];
    let finalLabels = [];
    let finalValues = [];

    // State-based data selection
    if (chartType === 'pie' && chartLevels[chartId] === 'drilldown') {
        const subCounts = {};
        othersItemsStore[chartId].forEach(name => {
            subCounts[name] = (subCounts[name] || 0) + 1;
        });
        const sortedSub = Object.entries(subCounts).sort((a, b) => b[1] - a[1]);
        finalLabels = sortedSub.map(e => e[0]);
        finalValues = sortedSub.map(e => e[1]);
        document.getElementById('drilldownControls').classList.remove('hidden');
    } else {
        const counts = {};
        const groups = {};

        rawData.forEach(item => {
            let key = 'Diğer';
            const date = new Date(item.deadline || item.updatedAt);
            const itemName = item.obligationType || item.title || item.projectName || 'Belirtilmemiş';

            switch (analysisType) {
                case 'quarter': key = isNaN(date.getTime()) ? 'Bilinmiyor' : `Q${Math.floor(date.getMonth() / 3) + 1}`; break;
                case 'type': key = item.obligationType || 'Belirtilmemiş'; break;
                case 'company': key = item.company || (item.projectName ? item.projectName.split(' ')[0] : 'Firma'); break;
                case 'parentCompany': key = item.parentCompany || 'Ana Firma'; break;
                case 'month':
                    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                    key = isNaN(date.getTime()) ? 'Bilinmiyor' : months[date.getMonth()];
                    break;
                case 'workload': key = Store.getUserName(item.assignee) || 'Atanmamış'; break;
            }
            counts[key] = (counts[key] || 0) + 1;
            if (!groups[key]) groups[key] = [];
            groups[key].push(itemName);
        });

        if (chartType === 'pie') {
            const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            if (sortedEntries.length > 7) {
                const top6 = sortedEntries.slice(0, 6);
                const othersSliceData = sortedEntries.slice(6);
                finalLabels = [...top6.map(e => e[0]), 'Diğer'];
                finalValues = [...top6.map(e => e[1]), othersSliceData.reduce((acc, curr) => acc + curr[1], 0)];

                othersItemsStore[chartId] = [];
                othersSliceData.forEach(([k]) => othersItemsStore[chartId].push(...groups[k]));
            } else {
                finalLabels = sortedEntries.map(e => e[0]);
                finalValues = sortedEntries.map(e => e[1]);
            }
        } else {
            finalLabels = Object.keys(counts);
            finalValues = Object.values(counts);
        }
    }

    container.innerHTML = `<canvas id="canvas${chartId}"></canvas>`;
    const ctx = document.getElementById(`canvas${chartId}`).getContext('2d');

    if (chartId === 1 && chart1) chart1.destroy();
    if (chartId === 2 && chart2) chart2.destroy();

    const chartConfig = {
        type: chartType,
        data: {
            labels: finalLabels,
            datasets: [{
                label: 'Sayı',
                data: finalValues,
                backgroundColor: premiumColors,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 2,
                hoverOffset: 30,
                borderRadius: chartType === 'bar' ? 6 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 40, bottom: (chartType === 'pie') ? 160 : 40, left: 100, right: 100
                }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0 && chartType === 'pie') {
                    const idx = elements[0].index;
                    if (finalLabels[idx] === 'Diğer' && chartLevels[chartId] === 'summary') {
                        chartLevels[chartId] = 'drilldown';
                        updateChart(chartId);
                    }
                } else if (chartLevels[chartId] === 'drilldown') {
                    chartLevels[chartId] = 'summary';
                    updateChart(chartId);
                    if (chartLevels[1] === 'summary' && chartLevels[2] === 'summary') {
                        document.getElementById('drilldownControls').classList.add('hidden');
                    }
                }
            },
            animation: { duration: 1500, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: chartType !== 'pie', position: 'bottom', labels: { color: '#cbd5e1', font: { family: 'Outfit', weight: '600' } } },
                datalabels: {
                    display: (ctx) => chartType === 'pie' && ctx.dataset.data[ctx.dataIndex] > 0,
                    anchor: 'end', align: 'end',
                    offset: (ctx) => (ctx.dataIndex % 2 !== 0) ? 90 : 45,
                    color: (ctx) => premiumColors[ctx.dataIndex % premiumColors.length] || '#fff',
                    font: { weight: '900', size: 10, family: 'Outfit' },
                    formatter: (value, ctx) => {
                        const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const perc = (value * 100 / sum).toFixed(0) + "%";
                        const lbl = ctx.chart.data.labels[ctx.dataIndex];
                        return `${lbl.substring(0, 18)}${lbl.length > 18 ? '...' : ''}\n${perc}`;
                    },
                    textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.9)', textShadowBlur: 6, backgroundColor: null
                },
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 14, weight: 'bold' }, padding: 12, cornerRadius: 8 }
            },
            scales: chartType === 'bar' ? {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            } : {}
        }
    };

    const newChart = new Chart(ctx, chartConfig);
    if (chartId === 1) chart1 = newChart;
    else chart2 = newChart;
}

