/* ==========================================
   EPDK Süre Takip Platformu - Application Logic
   ========================================== */

// ==========================================
// Password Protection
// ==========================================

const APP_PASSWORD = 'Davinci*2026';
const AUTH_KEY = 'epdk_authenticated';

function checkAuthentication() {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
}

function authenticate(password) {
    if (password === APP_PASSWORD) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        return true;
    }
    return false;
}

function showApp() {
    const loginOverlay = document.getElementById('loginOverlay');
    const appContainer = document.getElementById('appContainer');

    if (loginOverlay) {
        loginOverlay.classList.add('hidden');
    }
    if (appContainer) {
        appContainer.style.display = 'flex';
    }
}

function initPasswordProtection() {
    // Check if already authenticated
    if (checkAuthentication()) {
        showApp();
        return;
    }

    // Setup login form handler
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const password = passwordInput.value;

            if (authenticate(password)) {
                showApp();
                // Initialize the app after successful login
                initializeApp();
            } else {
                loginError.textContent = '❌ Yanlış şifre. Lütfen tekrar deneyin.';
                passwordInput.value = '';
                passwordInput.focus();

                // Shake animation
                const container = document.querySelector('.login-container');
                container.style.animation = 'none';
                container.offsetHeight; // Trigger reflow
                container.style.animation = 'shake 0.5s ease';
            }
        });
    }
}

// Add shake animation for wrong password
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(shakeStyle);

// ==========================================
// Data Management
// ==========================================

const STORAGE_KEY = 'epdk_obligations';

let obligations = [];

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        obligations = JSON.parse(saved);
        // Convert date strings back to Date objects
        obligations.forEach(o => {
            o.deadline = new Date(o.deadline);
            o.createdAt = new Date(o.createdAt);
            o.updatedAt = new Date(o.updatedAt);
        });
    } else if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.length > 0) {
        // Load embedded data if no saved data exists
        loadEmbeddedData();
    }
    return obligations;
}

function loadEmbeddedData() {
    obligations = EMBEDDED_DATA.map(item => ({
        id: item.id,
        projectName: item.projectName,
        projectLink: item.projectLink,
        obligationType: item.obligationType,
        obligationDescription: item.obligationDescription,
        deadline: parseExcelDate(item.deadline),
        notes: item.notes,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    })).filter(o => o.deadline !== null);

    saveData();
    console.log(`Loaded ${obligations.length} embedded records`);
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obligations));
    localStorage.setItem('epdk_lastUpdate', new Date().toISOString());
}

function clearAllData() {
    if (confirm('Tüm veriler silinecek. Bu işlem geri alınamaz. Emin misiniz?')) {
        obligations = [];
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('epdk_lastUpdate');
        refreshAllViews();
        showToast('Tüm veriler silindi', 'success');
    }
}

// ==========================================
// Excel Import/Export
// ==========================================

function handleExcelImport(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Skip header row if exists
            const startRow = isHeaderRow(jsonData[0]) ? 1 : 0;

            obligations = [];
            for (let i = startRow; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || !row[0]) continue;

                // Parse the row
                const projectCell = row[0] || '';
                const { name: projectName, link: projectLink } = parseProjectCell(projectCell);
                const obligationType = row[1] || '';
                const obligationDescription = row[2] || '';
                const deadline = parseExcelDate(row[3]);
                const notes = row[4] || '';

                if (projectName && deadline) {
                    obligations.push({
                        id: generateId(),
                        projectName,
                        projectLink,
                        obligationType,
                        obligationDescription,
                        deadline,
                        notes,
                        status: 'pending',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
            }

            saveData();
            refreshAllViews();
            showToast(`${obligations.length} kayıt başarıyla yüklendi`, 'success');
        } catch (error) {
            console.error('Excel import error:', error);
            showToast('Excel dosyası okunamadı', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function isHeaderRow(row) {
    if (!row || row.length === 0) return false;
    const firstCell = String(row[0]).toLowerCase();
    return firstCell.includes('proje') || firstCell.includes('santral') || firstCell.includes('ad');
}

function parseProjectCell(cell) {
    // Check if cell contains a hyperlink (Excel formula or plain text with URL)
    const cellStr = String(cell);

    // Try to extract hyperlink from HYPERLINK formula
    const hyperlinkMatch = cellStr.match(/=HYPERLINK\("([^"]+)"\s*,\s*"([^"]+)"\)/i);
    if (hyperlinkMatch) {
        return { name: hyperlinkMatch[2], link: hyperlinkMatch[1] };
    }

    // If no hyperlink, just return the text
    return { name: cellStr, link: null };
}

function parseExcelDate(value) {
    if (!value) return null;

    // If it's already a Date object
    if (value instanceof Date) return value;

    // If it's an Excel serial number
    if (typeof value === 'number') {
        // Excel date serial number (days since 1900-01-01)
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    }

    // If it's a string, try to parse it
    if (typeof value === 'string') {
        // Try various date formats
        const formats = [
            /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // DD.MM.YYYY
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
            /(\d{4})-(\d{1,2})-(\d{1,2})/    // YYYY-MM-DD
        ];

        for (const format of formats) {
            const match = value.match(format);
            if (match) {
                if (format === formats[2]) {
                    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                } else {
                    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                }
            }
        }

        // Try native parsing
        const parsed = new Date(value);
        if (!isNaN(parsed)) return parsed;
    }

    return null;
}

function exportToExcel() {
    if (obligations.length === 0) {
        showToast('Dışa aktarılacak veri yok', 'error');
        return;
    }

    const exportData = obligations.map(o => ({
        'Proje': o.projectName,
        'Yükümlülük Türü': o.obligationType,
        'Yükümlülük': o.obligationDescription,
        'Son Tarih': formatDate(o.deadline),
        'Notlar': o.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yükümlülükler');
    XLSX.writeFile(wb, `EPDK_Sureler_${formatDate(new Date())}.xlsx`);
    showToast('Excel dosyası indirildi', 'success');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==========================================
// Date Utilities
// ==========================================

function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

function formatDateLong(date) {
    if (!date) return '-';
    const d = new Date(date);
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getDaysUntil(date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function getStatus(date) {
    const days = getDaysUntil(date);
    if (days < 0) return 'overdue';
    if (days <= 7) return 'this-week';
    if (days <= 30) return 'this-month';
    return 'upcoming';
}

function getStatusText(date) {
    const days = getDaysUntil(date);
    if (days < 0) return `${Math.abs(days)} gün gecikti`;
    if (days === 0) return 'Bugün!';
    if (days === 1) return 'Yarın';
    return `${days} gün kaldı`;
}

function getCurrentQuarter() {
    const month = new Date().getMonth();
    return Math.floor(month / 3) + 1;
}

function getQuarter(date) {
    const month = new Date(date).getMonth();
    return Math.floor(month / 3) + 1;
}

// ==========================================
// Dashboard Updates
// ==========================================

function updateDashboard() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Calculate stats
    let completed = 0, thisWeek = 0, thisMonth = 0, upcoming = 0;

    obligations.forEach(o => {
        const days = getDaysUntil(o.deadline);
        if (days < 0) completed++; // Past deadlines = completed
        else if (days <= 7) thisWeek++;
        else if (days <= 30) thisMonth++;
        else upcoming++; // More than 30 days
    });

    // Update stat cards
    document.getElementById('thisWeekCount').textContent = thisWeek;
    document.getElementById('thisMonthCount').textContent = thisMonth;
    document.getElementById('upcomingCount').textContent = upcoming;
    document.getElementById('completedCount').textContent = completed;

    // Update upcoming list
    updateUpcomingList();

    // Update quarterly chart
    updateQuarterlyChart();
}

function updateUpcomingList() {
    const list = document.getElementById('upcomingList');

    if (obligations.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span>📤</span>
                <p>Excel dosyası yükleyerek başlayın</p>
            </div>
        `;
        return;
    }

    // Filter out past deadlines and get top 30 upcoming
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...obligations]
        .filter(o => new Date(o.deadline) >= today) // Only future dates
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 30);

    list.innerHTML = sorted.map(o => {
        const status = getStatus(o.deadline);
        const statusText = getStatusText(o.deadline);

        return `
            <div class="obligation-item" onclick="showObligationDetail('${o.id}')">
                <div class="obligation-status ${status}"></div>
                <div class="obligation-content">
                    <div class="obligation-project">
                        ${o.projectLink ? `<a href="${o.projectLink}" target="_blank" onclick="event.stopPropagation()">${escapeHtml(o.projectName)}</a>` : escapeHtml(o.projectName)}
                    </div>
                    <div class="obligation-type">${escapeHtml(o.obligationType)}</div>
                    <div class="obligation-desc">${escapeHtml(o.obligationDescription)}</div>
                </div>
                <div class="obligation-meta">
                    <div class="obligation-date">${formatDate(o.deadline)}</div>
                    <div class="obligation-days ${status}">${statusText}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateQuarterlyChart() {
    const currentYear = new Date().getFullYear();
    const quarters = [0, 0, 0, 0];

    obligations.forEach(o => {
        const year = new Date(o.deadline).getFullYear();
        if (year === currentYear) {
            const q = getQuarter(o.deadline) - 1;
            quarters[q]++;
        }
    });

    const max = Math.max(...quarters, 1);

    for (let i = 0; i < 4; i++) {
        const bar = document.getElementById(`q${i + 1}Bar`);
        const value = document.getElementById(`q${i + 1}Value`);
        const label = document.querySelector(`#quarterlyChart .quarter-bar:nth-child(${i + 1}) .bar-label`);

        // Update label with year
        if (label) {
            label.textContent = `${currentYear} Q${i + 1}`;
        }

        bar.style.setProperty('--width', `${(quarters[i] / max) * 100}%`);
        bar.style.cssText = `--width: ${(quarters[i] / max) * 100}%`;
        bar.setAttribute('style', `--width: ${(quarters[i] / max) * 100}%`);
        // Use ::after pseudo-element width
        setTimeout(() => {
            bar.querySelector('::after') || (bar.style.setProperty('width', '100%'));
            const afterStyle = document.createElement('style');
            afterStyle.textContent = `#q${i + 1}Bar::after { width: ${(quarters[i] / max) * 100}% !important; }`;
            document.head.appendChild(afterStyle);
        }, 100);
        value.textContent = quarters[i];
    }
}

// ==========================================
// Obligations Page
// ==========================================

function updateObligationsTable() {
    const tbody = document.getElementById('obligationsTable');
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const searchTerm = document.getElementById('globalSearch').value.toLowerCase();

    let filtered = [...obligations];

    // Apply filters
    if (typeFilter) {
        filtered = filtered.filter(o => o.obligationType === typeFilter);
    }

    if (statusFilter) {
        filtered = filtered.filter(o => {
            const status = getStatus(o.deadline);
            if (statusFilter === 'overdue') return status === 'overdue';
            if (statusFilter === 'thisWeek') return status === 'this-week';
            if (statusFilter === 'thisMonth') return status === 'this-month';
            if (statusFilter === 'upcoming') return status === 'upcoming';
            return true;
        });
    }

    if (startDate) {
        const start = new Date(startDate);
        filtered = filtered.filter(o => new Date(o.deadline) >= start);
    }

    if (endDate) {
        const end = new Date(endDate);
        filtered = filtered.filter(o => new Date(o.deadline) <= end);
    }

    if (searchTerm) {
        filtered = filtered.filter(o =>
            o.projectName.toLowerCase().includes(searchTerm) ||
            o.obligationType.toLowerCase().includes(searchTerm) ||
            o.obligationDescription.toLowerCase().includes(searchTerm)
        );
    }

    // Sort by deadline
    filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    tbody.innerHTML = filtered.map(o => {
        const status = getStatus(o.deadline);
        const statusText = getStatusText(o.deadline);

        return `
            <tr onclick="showObligationDetail('${o.id}')">
                <td><span class="status-badge ${status}">${getStatusLabel(status)}</span></td>
                <td>${o.projectLink ? `<a href="${o.projectLink}" target="_blank" onclick="event.stopPropagation()">${escapeHtml(o.projectName)}</a>` : escapeHtml(o.projectName)}</td>
                <td>${escapeHtml(o.obligationType)}</td>
                <td>${escapeHtml(o.obligationDescription)}</td>
                <td>${formatDate(o.deadline)}</td>
                <td class="${status}">${statusText}</td>
                <td>${escapeHtml(o.notes || '-')}</td>
            </tr>
        `;
    }).join('');

    // Update type filter options
    updateTypeFilter();
}

function getStatusLabel(status) {
    switch (status) {
        case 'overdue': return '🔴 Gecikmiş';
        case 'this-week': return '🟠 Bu Hafta';
        case 'this-month': return '🟡 Bu Ay';
        default: return '🟢 Yaklaşan';
    }
}

function updateTypeFilter() {
    const select = document.getElementById('typeFilter');
    const currentValue = select.value;
    const types = [...new Set(obligations.map(o => o.obligationType).filter(Boolean))];

    select.innerHTML = '<option value="">Tümü</option>' +
        types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

    select.value = currentValue;
}

// ==========================================
// Projects Page
// ==========================================

function updateProjectsGrid() {
    const grid = document.getElementById('projectsGrid');
    const searchTerm = document.getElementById('projectSearch').value.toLowerCase();

    // Group by project
    const projects = {};
    obligations.forEach(o => {
        if (!projects[o.projectName]) {
            projects[o.projectName] = {
                name: o.projectName,
                link: o.projectLink,
                obligations: []
            };
        }
        projects[o.projectName].obligations.push(o);
    });

    // Filter and sort
    let projectList = Object.values(projects);
    if (searchTerm) {
        projectList = projectList.filter(p => p.name.toLowerCase().includes(searchTerm));
    }
    projectList.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    if (projectList.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span>🏭</span>
                <p>${obligations.length === 0 ? 'Excel dosyası yükleyerek başlayın' : 'Arama sonucu bulunamadı'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = projectList.map(p => {
        // Sort obligations by deadline
        const sorted = [...p.obligations].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        const upcoming = sorted.slice(0, 3);

        return `
            <div class="project-card">
                <div class="project-header">
                    <div class="project-name">
                        ${p.link ? `<a href="${p.link}" target="_blank">${escapeHtml(p.name)}</a>` : escapeHtml(p.name)}
                    </div>
                    <div class="project-count">${p.obligations.length} yükümlülük</div>
                </div>
                <div class="project-obligations">
                    ${upcoming.map(o => {
            const status = getStatus(o.deadline);
            return `
                            <div class="project-obligation">
                                <span class="project-obligation-type">${escapeHtml(o.obligationType)}</span>
                                <span class="project-obligation-date ${status}">${formatDate(o.deadline)}</span>
                            </div>
                        `;
        }).join('')}
                    ${p.obligations.length > 3 ? `<div class="project-obligation"><span class="project-obligation-type">+${p.obligations.length - 3} daha...</span></div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// Analytics Page - Parametric Charts
// ==========================================

// Enrich obligations with company data
function enrichObligationsWithCompanyData() {
    return obligations.map(o => {
        const companyInfo = matchProjectToCompany(o.projectName);
        return {
            ...o,
            company: companyInfo ? companyInfo.company : 'Belirtilmemiş',
            parentCompany: companyInfo ? companyInfo.parentCompany : 'Belirtilmemiş'
        };
    });
}

// Group data based on analysis type
function groupDataByType(enrichedObligations, analysisType, year) {
    const groups = {};

    enrichedObligations.forEach(o => {
        // Year filter
        const oblYear = new Date(o.deadline).getFullYear();
        if (year !== 'all' && oblYear !== parseInt(year)) {
            return;
        }

        let key;
        switch (analysisType) {
            case 'quarter':
                const quarter = getQuarter(o.deadline);
                const qYear = new Date(o.deadline).getFullYear();
                key = `${qYear} Q${quarter}`;
                break;
            case 'type':
                key = o.obligationType || 'Belirtilmemiş';
                break;
            case 'company':
                key = o.company;
                break;
            case 'parentCompany':
                key = o.parentCompany;
                break;
            case 'month':
                const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                const monthIndex = new Date(o.deadline).getMonth();
                key = months[monthIndex];
                break;
            default:
                key = 'Unknown';
        }

        groups[key] = (groups[key] || 0) + 1;
    });

    return groups;
}

// Render bar chart
function renderBarChart(containerId, data) {
    const container = document.getElementById(containerId);
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = entries.length > 0 ? Math.max(...entries.map(e => e[1])) : 1;

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="chart-placeholder">
                <span>📊</span>
                <p>Seçilen parametrelere göre veri bulunamadı</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="chart-bars">
            ${entries.map(([label, value]) => `
                <div class="chart-bar-item">
                    <div class="chart-bar-label">${escapeHtml(label)}</div>
                    <div class="chart-bar-track">
                        <div class="chart-bar-fill" style="width: ${(value / max) * 100}%">
                            <span class="chart-bar-value">${value}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render pie chart
function renderPieChart(containerId, data) {
    const container = document.getElementById(containerId);
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10); // Top 10

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="chart-placeholder">
                <span>📊</span>
                <p>Seçilen parametrelere göre veri bulunamadı</p>
            </div>
        `;
        return;
    }

    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c',
        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
        '#fa709a', '#fee140'
    ];

    // Simple pie chart using div-based approach
    container.innerHTML = `
        <div class="chart-pie">
            <div class="pie-canvas-container">
                <svg width="300" height="300" viewBox="0 0 300 300">
                    ${createPieSlices(entries, total, colors)}
                </svg>
            </div>
            <div class="pie-legend">
                ${entries.map(([label, value], index) => `
                    <div class="pie-legend-item">
                        <div class="pie-legend-color" style="background: ${colors[index % colors.length]}"></div>
                        <div class="pie-legend-label">${escapeHtml(label)}</div>
                        <div class="pie-legend-value">${value} (${Math.round(value / total * 100)}%)</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function createPieSlices(entries, total, colors) {
    let currentAngle = -90; // Start from top
    const centerX = 150;
    const centerY = 150;
    const radius = 120;

    return entries.map(([, value], index) => {
        const percentage = value / total;
        const angle = percentage * 360;
        const endAngle = currentAngle + angle;

        const startX = centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
        const startY = centerY + radius * Math.sin((currentAngle * Math.PI) / 180);
        const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
        const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;

        const pathData = `
            M ${centerX} ${centerY}
            L ${startX} ${startY}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
            Z
        `;

        currentAngle = endAngle;

        return `<path d="${pathData}" fill="${colors[index % colors.length]}" stroke="#1a1a2e" stroke-width="2"/>`;
    }).join('');
}

// Generate chart based on config
function generateChart(chartNumber) {
    const analysisType = document.getElementById(`chart${chartNumber}AnalysisType`).value;
    const chartType = document.getElementById(`chart${chartNumber}ChartType`).value;
    const year = document.getElementById(`chart${chartNumber}Year`).value;
    const containerId = `chart${chartNumber}Container`;

    // Enrich data
    const enrichedData = enrichObligationsWithCompanyData();

    // Group data
    const groupedData = groupDataByType(enrichedData, analysisType, year);

    // Render chart
    if (chartType === 'bar') {
        renderBarChart(containerId, groupedData);
    } else if (chartType === 'pie') {
        renderPieChart(containerId, groupedData);
    }
}

// Initialize analytics page (called when navigating to analytics)
function updateAnalytics() {
    // Initialize charts with default state (placeholder)
    // Users will click "Güncelle" to generate charts
}


// ==========================================
// Settings Page
// ==========================================

function updateSettings() {
    document.getElementById('totalRecords').textContent = obligations.length;

    const projects = new Set(obligations.map(o => o.projectName));
    document.getElementById('totalProjects').textContent = projects.size;

    const lastUpdate = localStorage.getItem('epdk_lastUpdate');
    document.getElementById('lastUpdate').textContent = lastUpdate ? formatDateLong(new Date(lastUpdate)) : '-';
}

// ==========================================
// Modal
// ==========================================

function showObligationDetail(id) {
    const obligation = obligations.find(o => o.id === id);
    if (!obligation) return;

    const status = getStatus(obligation.deadline);
    const statusText = getStatusText(obligation.deadline);

    document.getElementById('modalTitle').textContent = obligation.projectName;
    document.getElementById('modalBody').innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
                <label style="color: var(--text-muted); font-size: 13px;">Durum</label>
                <p><span class="status-badge ${status}">${getStatusLabel(status)}</span> ${statusText}</p>
            </div>
            ${obligation.projectLink ? `
            <div>
                <label style="color: var(--text-muted); font-size: 13px;">M-Files Link</label>
                <p><a href="${obligation.projectLink}" target="_blank" style="color: var(--accent-primary);">Dökümana Git ↗</a></p>
            </div>
            ` : ''}
            <div>
                <label style="color: var(--text-muted); font-size: 13px;">Yükümlülük Türü</label>
                <p>${escapeHtml(obligation.obligationType)}</p>
            </div>
            <div>
                <label style="color: var(--text-muted); font-size: 13px;">Yükümlülük</label>
                <p>${escapeHtml(obligation.obligationDescription)}</p>
            </div>
            <div>
                <label style="color: var(--text-muted); font-size: 13px;">Son Tarih</label>
                <p>${formatDateLong(obligation.deadline)}</p>
            </div>
            ${obligation.notes ? `
            <div>
                <label style="color: var(--text-muted); font-size: 13px;">Notlar</label>
                <p>${escapeHtml(obligation.notes)}</p>
            </div>
            ` : ''}
        </div>
    `;

    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// ==========================================
// Add Obligation Modal
// ==========================================

function showAddObligationModal() {
    const modal = document.getElementById('addObligationModal');
    modal.classList.add('show');

    // Reset form
    document.getElementById('addObligationForm').reset();

    // Focus on first input
    setTimeout(() => {
        document.getElementById('projectName').focus();
    }, 100);
}

function closeAddObligationModal() {
    document.getElementById('addObligationModal').classList.remove('show');
}

function handleAddObligation(e) {
    e.preventDefault();

    // Get form values
    const obligationData = {
        projectName: document.getElementById('projectName').value.trim(),
        projectLink: document.getElementById('projectLink').value.trim() || null,
        obligationType: document.getElementById('obligationType').value.trim(),
        obligationDescription: document.getElementById('obligationDescription').value.trim(),
        deadline: document.getElementById('deadline').value,
        notes: document.getElementById('notes').value.trim() || ''
    };

    // Validate required fields
    if (!obligationData.projectName || !obligationData.obligationType ||
        !obligationData.obligationDescription || !obligationData.deadline) {
        showToast('Lütfen tüm zorunlu alanları doldurun', 'error');
        return;
    }

    // Add new obligation
    addNewObligation(obligationData);
}

function addNewObligation(data) {
    const newObligation = {
        id: generateId(),
        projectName: data.projectName,
        projectLink: data.projectLink,
        obligationType: data.obligationType,
        obligationDescription: data.obligationDescription,
        deadline: new Date(data.deadline),
        notes: data.notes,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    // Add to obligations array
    obligations.push(newObligation);

    // Save to localStorage
    saveData();

    // Refresh all views
    refreshAllViews();

    // Close modal
    closeAddObligationModal();

    // Show success message
    showToast(`Yeni yükümlülük eklendi: ${data.projectName}`, 'success');
}

// ==========================================
// Toast Notifications
// ==========================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    toast.querySelector('.toast-icon').textContent = icon;
    toast.querySelector('.toast-message').textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==========================================
// Navigation
// ==========================================

function navigateTo(page) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}Page`);
    });

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        obligations: 'Yükümlülükler',
        projects: 'Projeler',
        analytics: 'Analiz',
        settings: 'Ayarlar'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    // Refresh view
    switch (page) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'obligations':
            updateObligationsTable();
            break;
        case 'projects':
            updateProjectsGrid();
            break;
        case 'analytics':
            updateAnalytics();
            break;
        case 'settings':
            updateSettings();
            break;
    }
}

function refreshAllViews() {
    updateDashboard();
    updateObligationsTable();
    updateProjectsGrid();
    updateAnalytics();
    updateSettings();
}

// ==========================================
// Utilities
// ==========================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// Event Listeners
// ==========================================

function initializeApp() {
    // Load saved data
    loadData();

    // Set current date
    document.getElementById('currentDate').textContent = formatDateLong(new Date());

    // Initialize views
    refreshAllViews();

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            navigateTo(this.dataset.page);
        });
    });

    // Excel import
    const excelInput = document.getElementById('excelInput');

    document.getElementById('importBtn').addEventListener('click', () => excelInput.click());
    document.getElementById('settingsImportBtn').addEventListener('click', () => excelInput.click());

    excelInput.addEventListener('change', function (e) {
        if (this.files && this.files[0]) {
            handleExcelImport(this.files[0]);
            this.value = '';
        }
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);

    // Clear data
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

    // Modal
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });

    // Filters
    ['typeFilter', 'statusFilter', 'startDate', 'endDate'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateObligationsTable);
    });

    // Global search
    let searchTimeout;
    document.getElementById('globalSearch').addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const currentPage = document.querySelector('.nav-item.active').dataset.page;
            if (currentPage === 'obligations') {
                updateObligationsTable();
            } else if (currentPage === 'projects') {
                updateProjectsGrid();
            } else {
                // Switch to obligations page for search
                navigateTo('obligations');
            }
        }, 300);
    });

    // Project search
    document.getElementById('projectSearch').addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(updateProjectsGrid, 300);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal();
            closeAddObligationModal();
        }
    });

    // Parametric Analytics Charts
    const chart1UpdateBtn = document.getElementById('chart1Update');
    const chart2UpdateBtn = document.getElementById('chart2Update');

    if (chart1UpdateBtn) {
        chart1UpdateBtn.addEventListener('click', () => generateChart(1));
    }
    if (chart2UpdateBtn) {
        chart2UpdateBtn.addEventListener('click', () => generateChart(2));
    }

    // Add Obligation Modal
    document.getElementById('addObligationBtn').addEventListener('click', showAddObligationModal);
    document.getElementById('addObligationModalClose').addEventListener('click', closeAddObligationModal);
    document.getElementById('cancelAddObligation').addEventListener('click', closeAddObligationModal);
    document.getElementById('addObligationForm').addEventListener('submit', handleAddObligation);

    document.getElementById('addObligationModal').addEventListener('click', function (e) {
        if (e.target === this) closeAddObligationModal();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // Initialize password protection first
    initPasswordProtection();

    // If already authenticated, initialize the app
    if (checkAuthentication()) {
        initializeApp();
    }
});
