/**
 * TEA Başvuruları (TÜBİTAK RAPSİM Teknik Etkileşim Analizi) modülü
 */

import { Store } from './store.js';
import { escapeHtml, generateId } from './utils.js';
import { showToast } from './ui.js';
import { saveData } from './data.js';
import { auth } from './firebase-config.js';

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function getMonthYearLabel(monthYear) {
    if (!monthYear) return '';
    const [y, m] = monthYear.split('-');
    const monthName = TR_MONTHS[parseInt(m, 10) - 1] || m;
    return `${monthName} ${y}`;
}

export function getTeaApplicationsForProject(projectName) {
    return (Store.teaApplications || [])
        .filter(t => t.projectName === projectName)
        .sort((a, b) => b.monthYear.localeCompare(a.monthYear));
}

/**
 * Tek bir aktif filtre: pasta grafiğinde bir şirket dilimine ya da sağdaki
 * Olumlu/Olumsuz istatistiğine tıklanınca soldaki listeyi daraltır. Hep ana
 * listeden (tam veri kümesinden) filtrelenir, üst üste birikmez.
 * type: 'company' | 'result' | null, value: string | string[] | null
 */
let currentFilter = { type: null, value: null };
let othersCompanyGroup = []; // pasta grafiğindeki "Diğer" dilimine giren şirketler

function getProjectsByName() {
    return new Map((Store.projects || []).map(p => [p.name, p]));
}

function matchesCurrentFilter(t, projectsByName) {
    if (currentFilter.type === 'company') {
        const company = projectsByName.get(t.projectName)?.company || t.projectName || 'Bilinmiyor';
        return Array.isArray(currentFilter.value) ? currentFilter.value.includes(company) : company === currentFilter.value;
    }
    if (currentFilter.type === 'result') {
        return (t.result || 'pending') === currentFilter.value;
    }
    return true;
}

function setTeaFilter(type, value, label) {
    currentFilter = { type, value };
    renderTeaApplicationsMatrix();
    updateFilterStatusUI(label);
}

function clearTeaFilter() {
    currentFilter = { type: null, value: null };
    renderTeaApplicationsMatrix();
    updateFilterStatusUI(null);
}

function updateFilterStatusUI(label) {
    const statusEl = document.getElementById('teaFilterStatus');
    const labelEl = document.getElementById('teaFilterLabel');
    if (!statusEl || !labelEl) return;
    if (label) {
        labelEl.textContent = `Filtre: ${label}`;
        statusEl.style.display = 'flex';
    } else {
        statusEl.style.display = 'none';
    }
    document.getElementById('teaStatPositiveCard')?.classList.toggle('active', currentFilter.type === 'result' && currentFilter.value === 'positive');
    document.getElementById('teaStatNegativeCard')?.classList.toggle('active', currentFilter.type === 'result' && currentFilter.value === 'negative');
}

/**
 * TEA paketleri her ayın 15'inden 15'ine işler: bugün ayın 15'ini geçtiyse
 * şu an yapılacak bir başvuru bir sonraki ayın paketine dahil olur, geçmediyse
 * içinde bulunulan ayın paketine dahil olur. Matriste boş gelecek satır olarak
 * yalnızca bu "açık paket" ayı gösterilir, daha ilerisi gösterilmez.
 */
function getCurrentOpenPackageMonthYear() {
    const now = new Date();
    let y = now.getFullYear(), m = now.getMonth() + 1;
    if (now.getDate() > 15) {
        m++;
        if (m > 12) { m = 1; y++; }
    }
    return `${y}-${String(m).padStart(2, '0')}`;
}

/** Ay-yıl aralığını üretir: en eski kayıttan, o an açık olan TEA paketine kadar. */
function buildMonthRange() {
    const apps = Store.teaApplications || [];
    const today = new Date();
    let startY = today.getFullYear(), startM = today.getMonth() + 1;

    apps.forEach(t => {
        const [y, m] = t.monthYear.split('-').map(Number);
        if (y < startY || (y === startY && m < startM)) { startY = y; startM = m; }
    });

    const [openY, openM] = getCurrentOpenPackageMonthYear().split('-').map(Number);
    let endY = openY, endM = openM;

    apps.forEach(t => {
        const [y, m] = t.monthYear.split('-').map(Number);
        if (y > endY || (y === endY && m > endM)) { endY = y; endM = m; }
    });

    const months = [];
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
        months.push(`${y}-${String(m).padStart(2, '0')}`);
        m++;
        if (m > 12) { m = 1; y++; }
    }
    return months.reverse(); // en yeni ay en üstte
}

const RESULT_LABELS = { positive: 'Olumlu', negative: 'Olumsuz', pending: 'Beklemede' };

function renderChip(t, chipIdx) {
    const hasLink = !!(t.mfilesLink && t.mfilesLink.trim());
    const result = t.result || 'pending';
    const chipClass = `tea-chip result-${result}`;
    const clickAction = hasLink
        ? `window.open('${escapeHtml(t.mfilesLink)}', '_blank', 'noopener')`
        : `window.openTeaApplicationModal('${t.id}')`;
    const titleText = `${RESULT_LABELS[result]}${hasLink ? ' - M-Files bağlantısını aç' : ' - Düzenlemek için tıklayın'}`;
    const delay = Math.min(chipIdx * 35, 350);
    return `
        <span class="${chipClass}" style="animation-delay: ${delay}ms" title="${titleText}">
            <span class="tea-chip-icon">${hasLink ? '🔗' : '🧪'}</span>
            <span class="tea-chip-label" onclick="${clickAction}">${escapeHtml(t.label)}</span>
            <button type="button" class="tea-chip-edit" onclick="event.stopPropagation(); window.openTeaApplicationModal('${t.id}')" title="Düzenle">✏️</button>
        </span>
    `;
}

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#0ea5e9', '#a855f7', '#64748b', '#fb7185', '#38bdf8', '#818cf8', '#34d399', '#f472b6'];
let teaCompanyChart = null;

/** En çok geçen ilk 6 anahtarı döndürür, gerisini "Diğer" altında toplar. */
function topCounts(counts) {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length <= 7) {
        return { labels: sorted.map(e => e[0]), values: sorted.map(e => e[1]), othersKeys: [] };
    }
    const top6 = sorted.slice(0, 6);
    const rest = sorted.slice(6);
    return {
        labels: [...top6.map(e => e[0]), 'Diğer'],
        values: [...top6.map(e => e[1]), rest.reduce((sum, e) => sum + e[1], 0)],
        othersKeys: rest.map(e => e[0])
    };
}

/** Bir hex rengi beyaza doğru karıştırıp radial-gradient'ın parlak merkezini üretir. */
function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * percent));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round((255 - ((num >> 8) & 0xff)) * percent));
    const b = Math.min(255, (num & 0xff) + Math.round((255 - (num & 0xff)) * percent));
    return `rgb(${r}, ${g}, ${b})`;
}

function buildPieConfig(labels, values) {
    return {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data: values,
                // Her dilime radial gradient uygulayarak "cam küre / 2.5D" hissi verir.
                backgroundColor: (ctx) => {
                    const chart = ctx.chart;
                    const { chartArea } = chart;
                    const color = PIE_COLORS[ctx.dataIndex % PIE_COLORS.length];
                    if (!chartArea) return color;
                    const cx = (chartArea.left + chartArea.right) / 2;
                    const cy = (chartArea.top + chartArea.bottom) / 2;
                    const r = Math.max(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
                    const gradient = chart.ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.05, cx, cy, r);
                    gradient.addColorStop(0, lightenColor(color, 0.55));
                    gradient.addColorStop(1, color);
                    return gradient;
                },
                borderColor: 'rgba(255, 255, 255, 0.25)',
                borderWidth: 2,
                hoverOffset: 26,
                hoverBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 24, bottom: 60, left: 40, right: 40 } },
            animation: { duration: 1300, easing: 'easeOutElastic', animateRotate: true, animateScale: true },
            onClick: (evt, elements) => {
                if (!elements.length) return;
                const idx = elements[0].index;
                const label = labels[idx];
                if (label === 'Diğer') {
                    setTeaFilter('company', othersCompanyGroup, 'Diğer Şirketler');
                } else {
                    setTeaFilter('company', label, label);
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
                    anchor: 'end', align: 'end',
                    offset: (ctx) => (ctx.dataIndex % 2 !== 0) ? 34 : 16,
                    color: (ctx) => PIE_COLORS[ctx.dataIndex % PIE_COLORS.length] || '#fff',
                    font: { weight: '700', size: 10, family: 'Outfit' },
                    formatter: (value, ctx) => {
                        const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const perc = (value * 100 / sum).toFixed(0) + "%";
                        const lbl = ctx.chart.data.labels[ctx.dataIndex];
                        return `${lbl.substring(0, 14)}${lbl.length > 14 ? '...' : ''}\n${perc}`;
                    },
                    textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.9)', textShadowBlur: 6
                },
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 13, weight: 'bold' }, padding: 10, cornerRadius: 8 }
            }
        }
    };
}

function renderTeaCharts(apps) {
    const companyCanvas = document.getElementById('teaCompanyChart');
    if (!companyCanvas || typeof Chart === 'undefined') return;

    const projectsByName = getProjectsByName();

    const companyCounts = {};
    apps.forEach(t => {
        const company = projectsByName.get(t.projectName)?.company || t.projectName || 'Bilinmiyor';
        companyCounts[company] = (companyCounts[company] || 0) + 1;
    });

    if (teaCompanyChart) teaCompanyChart.destroy();

    const companyData = topCounts(companyCounts);
    othersCompanyGroup = companyData.othersKeys;

    teaCompanyChart = apps.length > 0
        ? new Chart(companyCanvas.getContext('2d'), buildPieConfig(companyData.labels, companyData.values))
        : null;
}

export function renderTeaApplicationsMatrix() {
    const container = document.getElementById('teaMatrixContainer');
    if (!container) return;

    const searchInput = document.getElementById('teaMatrixSearchInput');
    const searchQuery = (searchInput?.value || '').toLowerCase().trim();

    const months = buildMonthRange();
    const apps = Store.teaApplications || [];
    const projectsByName = getProjectsByName();

    const elTotal = document.getElementById('teaStatTotal');
    const elPositive = document.getElementById('teaStatPositive');
    const elNegative = document.getElementById('teaStatNegative');
    if (elTotal) elTotal.textContent = apps.length;
    if (elPositive) elPositive.textContent = apps.filter(t => (t.result || 'pending') === 'positive').length;
    if (elNegative) elNegative.textContent = apps.filter(t => (t.result || 'pending') === 'negative').length;

    const rows = months.map((monthYear, idx) => {
        let monthApps = apps.filter(t => t.monthYear === monthYear && matchesCurrentFilter(t, projectsByName));
        if (searchQuery) {
            monthApps = monthApps.filter(t =>
                (t.label || '').toLowerCase().includes(searchQuery) ||
                (t.projectName || '').toLowerCase().includes(searchQuery)
            );
        }
        if ((searchQuery || currentFilter.type) && monthApps.length === 0) return '';

        monthApps = [...monthApps].sort((a, b) => (a.label || '').localeCompare(b.label || '', 'tr'));

        return `
            <div class="tea-row ${idx % 2 === 0 ? 'tea-row-even' : 'tea-row-odd'}" style="animation-delay: ${Math.min(idx * 25, 300)}ms">
                <div class="tea-month-cell">${escapeHtml(getMonthYearLabel(monthYear))}</div>
                <div class="tea-apps-cell">
                    <div class="tea-chip-list">
                        ${monthApps.length > 0 ? monthApps.map(renderChip).join('') : '<span class="tea-empty-month">Başvuru yok</span>'}
                        <button type="button" class="tea-add-mini-btn" onclick="window.openTeaApplicationModal(null, '${monthYear}')" title="Bu aya başvuru ekle">➕</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="tea-matrix-list">
            <div class="tea-matrix-header">
                <div class="tea-month-cell-header">AY - YIL</div>
                <div class="tea-apps-cell-header">BAŞVURULAR</div>
            </div>
            ${rows || '<div class="empty-text" style="padding: 20px;">Kayıt bulunamadı.</div>'}
        </div>
    `;

    renderTeaCharts(apps);
    populateTeaCalcProjectSelect();
}

export function initTeaEventHandlers() {
    const searchInput = document.getElementById('teaMatrixSearchInput');
    if (searchInput) {
        let searchTimer = null;
        searchInput.oninput = () => {
            if (searchTimer) clearTimeout(searchTimer);
            searchTimer = setTimeout(() => renderTeaApplicationsMatrix(), 200);
        };
    }

    const addBtn = document.getElementById('teaAddBtn');
    if (addBtn) {
        addBtn.onclick = () => window.openTeaApplicationModal(null);
    }

    const positiveCard = document.getElementById('teaStatPositiveCard');
    if (positiveCard) {
        positiveCard.onclick = () => setTeaFilter('result', 'positive', 'Olumlu Başvurular');
    }
    const negativeCard = document.getElementById('teaStatNegativeCard');
    if (negativeCard) {
        negativeCard.onclick = () => setTeaFilter('result', 'negative', 'Olumsuz Başvurular');
    }
    const clearFilterBtn = document.getElementById('teaClearFilterBtn');
    if (clearFilterBtn) {
        clearFilterBtn.onclick = () => clearTeaFilter();
    }

    const modal = document.getElementById('addTeaApplicationModal');
    const form = document.getElementById('addTeaApplicationForm');
    const closeBtn = document.getElementById('addTeaApplicationModalClose');
    const cancelBtn = document.getElementById('cancelAddTeaApplication');
    const deleteBtn = document.getElementById('deleteTeaApplicationBtn');

    const closeModal = () => {
        if (modal) modal.classList.remove('show');
        if (form) form.reset();
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const editingId = document.getElementById('teaEditingId').value;
            const month = document.getElementById('teaMonthSelect').value;
            const year = document.getElementById('teaYearInput').value;
            const monthYear = `${year}-${String(month).padStart(2, '0')}`;

            const payload = {
                projectName: document.getElementById('teaProjectSelect').value,
                monthYear,
                label: document.getElementById('teaLabelInput').value.trim(),
                result: document.getElementById('teaResultSelect').value,
                mfilesLink: document.getElementById('teaMfilesLink').value.trim(),
                notes: document.getElementById('teaNotesInput').value.trim(),
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser?.email || null
            };

            if (editingId) {
                const idx = Store.teaApplications.findIndex(t => t.id === editingId);
                if (idx !== -1) Store.teaApplications[idx] = { ...Store.teaApplications[idx], ...payload };
            } else {
                Store.teaApplications.push({
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                    createdBy: auth.currentUser?.email || null,
                    ...payload
                });
            }

            Store.lastUpdate = new Date().toISOString();
            if (saveData()) {
                closeModal();
                renderTeaApplicationsMatrix();
                showToast(editingId ? 'TEA başvurusu güncellendi' : 'TEA başvurusu eklendi', 'success');
            }
        };
    }

    if (deleteBtn) {
        deleteBtn.onclick = () => {
            const editingId = document.getElementById('teaEditingId').value;
            if (!editingId) return;
            if (!confirm('Bu TEA başvurusunu silmek istediğinize emin misiniz?')) return;
            Store.teaApplications = Store.teaApplications.filter(t => t.id !== editingId);
            Store.lastUpdate = new Date().toISOString();
            if (saveData()) {
                closeModal();
                renderTeaApplicationsMatrix();
                showToast('TEA başvurusu silindi', 'success');
            }
        };
    }

    initTeaFeeCalculator();
}

/**
 * @param {string|null} id - Düzenlenecek kaydın id'si, yeni kayıt için null
 * @param {string} [presetMonthYear] - "+" butonundan açılırken önceden doldurulacak ay-yıl
 */
window.openTeaApplicationModal = function (id, presetMonthYear) {
    const modal = document.getElementById('addTeaApplicationModal');
    const title = document.getElementById('addTeaApplicationModalTitle');
    const projectSelect = document.getElementById('teaProjectSelect');
    const monthSelect = document.getElementById('teaMonthSelect');
    const yearInput = document.getElementById('teaYearInput');
    const labelInput = document.getElementById('teaLabelInput');
    const resultSelect = document.getElementById('teaResultSelect');
    const linkInput = document.getElementById('teaMfilesLink');
    const notesInput = document.getElementById('teaNotesInput');
    const editingIdInput = document.getElementById('teaEditingId');
    const deleteBtn = document.getElementById('deleteTeaApplicationBtn');
    if (!modal) return;

    if (projectSelect) {
        const allProjects = (Store.projects || []).map(p => p.name).sort();
        projectSelect.innerHTML = '<option value="">Proje Seçiniz...</option>' +
            allProjects.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    }
    if (monthSelect && !monthSelect.options.length) {
        monthSelect.innerHTML = TR_MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    }

    const existing = id ? (Store.teaApplications || []).find(t => t.id === id) : null;

    if (existing) {
        title.textContent = '✏️ TEA Başvurusunu Düzenle';
        editingIdInput.value = existing.id;
        projectSelect.value = existing.projectName || '';
        const [y, m] = (existing.monthYear || '').split('-');
        monthSelect.value = String(parseInt(m, 10) || (new Date().getMonth() + 1));
        yearInput.value = y || new Date().getFullYear();
        labelInput.value = existing.label || '';
        resultSelect.value = existing.result || 'pending';
        linkInput.value = existing.mfilesLink || '';
        notesInput.value = existing.notes || '';
        if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    } else {
        title.textContent = '➕ Yeni TEA Başvurusu Ekle';
        editingIdInput.value = '';
        projectSelect.value = '';
        const now = new Date();
        if (presetMonthYear) {
            const [y, m] = presetMonthYear.split('-');
            monthSelect.value = String(parseInt(m, 10));
            yearInput.value = y;
        } else {
            monthSelect.value = String(now.getMonth() + 1);
            yearInput.value = now.getFullYear();
        }
        labelInput.value = '';
        resultSelect.value = 'pending';
        linkInput.value = '';
        notesInput.value = '';
        if (deleteBtn) deleteBtn.style.display = 'none';
    }

    modal.classList.add('show');
};

// ==========================================
// TEA Başvuru Bedeli Hesaplayıcı
// ==========================================

function formatCurrency(value) {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatMw(value) {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
}

/**
 * TEA başvuru bedeli 4 farklı senaryoya göre hesaplanır:
 * - İlk başvuru (önceki güç yok): yeni güç × yeni birim fiyat
 * - Güç artıyor: eski güç × eski birim fiyat + (artış) × yeni birim fiyat
 * - Güç aynı: eski güç × eski birim fiyat
 * - Güç azalıyor: yeni (başvurulacak) güç × eski birim fiyat
 * Sonuca KDV eklenir.
 */
function calculateTeaFeeCase(lastMW, newMW) {
    const { lastMwRate, newMwRate, vatRate } = Store.teaFeeSettings || { lastMwRate: 5800, newMwRate: 11600, vatRate: 0.20 };
    let caseType, base;

    if (!lastMW || lastMW <= 0) {
        caseType = 'first';
        base = newMW * newMwRate;
    } else if (newMW > lastMW) {
        caseType = 'increase';
        base = (lastMW * lastMwRate) + ((newMW - lastMW) * newMwRate);
    } else if (newMW === lastMW) {
        caseType = 'same';
        base = lastMW * lastMwRate;
    } else {
        caseType = 'decrease';
        base = newMW * lastMwRate;
    }

    const total = base * (1 + vatRate);
    return { caseType, base, total, lastMwRate, newMwRate, vatRate };
}

function generateTeaFeeEmailHtml({ projectName, company, lastMW, newMW, caseType, lastMwRate, newMwRate, vatRate, base, total }) {
    let calcLine;
    if (caseType === 'increase') {
        calcLine = `${formatMw(lastMW)} MW x ${formatCurrency(lastMwRate)}₺ + (${formatMw(newMW)} MW - ${formatMw(lastMW)} MW) x ${formatCurrency(newMwRate)}₺ = <b>${formatCurrency(base)}₺</b>`;
    } else if (caseType === 'same') {
        calcLine = `${formatMw(lastMW)} MW x ${formatCurrency(lastMwRate)}₺ = <b>${formatCurrency(base)}₺</b>`;
    } else if (caseType === 'decrease') {
        calcLine = `${formatMw(newMW)} MW x ${formatCurrency(lastMwRate)}₺ = <b>${formatCurrency(base)}₺</b>`;
    } else {
        calcLine = `${formatMw(newMW)} MW x ${formatCurrency(newMwRate)}₺ = <b>${formatCurrency(base)}₺</b>`;
    }
    const vatPercent = Math.round(vatRate * 100);
    const s = Store.teaFeeSettings || {};
    const recipientName = s.recipientName || 'Tübitak Bilgem';
    const bankBranch = s.bankBranch || 'Türkiye Cumhuriyeti Ziraat Bankası A.Ş. Gebze Kurumsal Şube';
    const iban = s.iban || 'TR96 0001 0020 8534 7551 9667 26';

    return `
        <div>${escapeHtml(projectName)} için yapacağımız TEA başvurusu için ödenmesi gereken tutar <b>${formatCurrency(total)}₺</b> olup ücretin detaylarını aşağıda bilgilerinize sunarım:</div>
        <br>
        <div><b>Ödeme Yapılacak Hesap Bilgileri:</b></div>
        <br>
        <table class="tea-email-table">
            <tr><td>Gönderilen Kişi</td><td>: ${escapeHtml(recipientName)}</td></tr>
            <tr><td>Yatırılacak Tutar</td><td>: ${calcLine} + %${vatPercent} KDV'dir. Vergiler Dahil Ödenecek Tutar: <b>${formatCurrency(total)}₺</b>'dir.</td></tr>
            <tr><td>Şube</td><td>: ${escapeHtml(bankBranch)}</td></tr>
            <tr><td>IBAN</td><td>: <b>${escapeHtml(iban)}</b></td></tr>
            <tr><td>Açıklama</td><td>: <b>${escapeHtml(company)}-${escapeHtml(projectName)} TEA Başvuru Bedeli</b></td></tr>
        </table>
        <br>
        <div>Saygılarımla,</div>
    `;
}

function populateTeaCalcProjectSelect() {
    const select = document.getElementById('teaCalcProjectSelect');
    if (!select) return;
    const currentValue = select.value;
    const allProjects = (Store.projects || []).map(p => p.name).sort();
    select.innerHTML = '<option value="">Proje Seçiniz...</option>' +
        allProjects.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    if (allProjects.includes(currentValue)) select.value = currentValue;
}

function recalcTeaFee() {
    const projectSelect = document.getElementById('teaCalcProjectSelect');
    const lastMwInput = document.getElementById('teaCalcLastMw');
    const newMwInput = document.getElementById('teaCalcNewMw');
    const resultBox = document.getElementById('teaCalcResult');
    const amountEl = document.getElementById('teaCalcAmount');
    const previewEl = document.getElementById('teaCalcEmailPreview');
    if (!projectSelect || !resultBox) return;

    const projectName = projectSelect.value;
    const newMW = parseFloat(newMwInput.value);
    const lastMW = parseFloat(lastMwInput.value) || 0;

    if (!projectName || !newMW || newMW <= 0) {
        resultBox.style.display = 'none';
        return;
    }

    const company = getProjectsByName().get(projectName)?.company || '';
    const calc = calculateTeaFeeCase(lastMW, newMW);

    amountEl.textContent = `${formatCurrency(calc.total)} ₺`;
    previewEl.innerHTML = generateTeaFeeEmailHtml({ projectName, company, lastMW, newMW, ...calc });
    resultBox.style.display = 'block';
}

function initTeaFeeCalculator() {
    const projectSelect = document.getElementById('teaCalcProjectSelect');
    const lastMwInput = document.getElementById('teaCalcLastMw');
    const newMwInput = document.getElementById('teaCalcNewMw');
    const copyBtn = document.getElementById('teaCalcCopyBtn');

    if (projectSelect) projectSelect.onchange = recalcTeaFee;
    if (lastMwInput) lastMwInput.oninput = recalcTeaFee;
    if (newMwInput) newMwInput.oninput = recalcTeaFee;

    if (copyBtn) {
        copyBtn.onclick = async () => {
            const previewEl = document.getElementById('teaCalcEmailPreview');
            if (!previewEl) return;
            const html = previewEl.innerHTML;
            const text = previewEl.innerText;
            try {
                if (navigator.clipboard && window.ClipboardItem) {
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'text/html': new Blob([html], { type: 'text/html' }),
                            'text/plain': new Blob([text], { type: 'text/plain' })
                        })
                    ]);
                } else {
                    await navigator.clipboard.writeText(text);
                }
                showToast('E-posta metni kopyalandı', 'success');
            } catch (err) {
                showToast('Kopyalama başarısız oldu, metni elle seçip kopyalayabilirsiniz.', 'error');
            }
        };
    }

    // Birim fiyat ayarları modalı
    const settingsBtn = document.getElementById('teaFeeSettingsBtn');
    const settingsModal = document.getElementById('teaFeeSettingsModal');
    const settingsForm = document.getElementById('teaFeeSettingsForm');
    const settingsClose = document.getElementById('teaFeeSettingsModalClose');
    const settingsCancel = document.getElementById('teaFeeSettingsCancel');
    const closeSettingsModal = () => settingsModal && settingsModal.classList.remove('show');

    if (settingsBtn) {
        settingsBtn.onclick = () => {
            const s = Store.teaFeeSettings || {};
            document.getElementById('teaSettingLastRate').value = s.lastMwRate ?? 5800;
            document.getElementById('teaSettingNewRate').value = s.newMwRate ?? 11600;
            document.getElementById('teaSettingVatRate').value = Math.round((s.vatRate ?? 0.20) * 100);
            document.getElementById('teaSettingRecipientName').value = s.recipientName || 'Tübitak Bilgem';
            document.getElementById('teaSettingBankBranch').value = s.bankBranch || 'Türkiye Cumhuriyeti Ziraat Bankası A.Ş. Gebze Kurumsal Şube';
            document.getElementById('teaSettingIban').value = s.iban || 'TR96 0001 0020 8534 7551 9667 26';
            settingsModal.classList.add('show');
        };
    }
    if (settingsClose) settingsClose.onclick = closeSettingsModal;
    if (settingsCancel) settingsCancel.onclick = closeSettingsModal;
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettingsModal();
    });

    if (settingsForm) {
        settingsForm.onsubmit = (e) => {
            e.preventDefault();
            Store.setTeaFeeSettings({
                lastMwRate: parseFloat(document.getElementById('teaSettingLastRate').value) || 0,
                newMwRate: parseFloat(document.getElementById('teaSettingNewRate').value) || 0,
                vatRate: (parseFloat(document.getElementById('teaSettingVatRate').value) || 0) / 100,
                recipientName: document.getElementById('teaSettingRecipientName').value.trim(),
                bankBranch: document.getElementById('teaSettingBankBranch').value.trim(),
                iban: document.getElementById('teaSettingIban').value.trim()
            });
            if (saveData()) {
                closeSettingsModal();
                showToast('Birim fiyatlar güncellendi', 'success');
                recalcTeaFee();
            }
        };
    }
}
