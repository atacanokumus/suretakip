/**
 * Main Application Coordinator for EPDK Süre Takip Platformu
 */

import { Store } from './js/store.js';
import {
    initAuthStyles, checkAuthentication, authenticate
} from './js/auth.js';
import {
    loadData, saveData, handleExcelImport, exportToExcel, clearAllData
} from './js/data.js';
import {
    showToast, initNavigation, showApp, initModals
} from './js/ui.js';
import {
    updateDashboard, updateUpcomingList
} from './js/dashboard.js';
import {
    updateObligationsTable, updateTypeFilter
} from './js/obligations.js';
import {
    updateProjectsGrid
} from './js/projects.js';
import {
    updateAnalytics
} from './js/analytics.js';
import {
    formatDateLong, formatDate, getStatus, getStatusText, getStatusLabel, escapeHtml, generateId, validateDate, validateString
} from './js/utils.js';

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    initAuthStyles();
    initNavigation();
    initModals();

    // Set current date in header
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = formatDateLong(new Date());

    // Check auth
    if (checkAuthentication()) {
        authorizedInit();
    } else {
        setupLoginForm();
    }
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const passwordInput = document.getElementById('passwordInput');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (authenticate(passwordInput.value)) {
                authorizedInit();
            } else {
                loginError.textContent = '❌ Hatalı şifre!';
                const container = document.querySelector('.login-container');
                container.style.animation = 'shake 0.5s';
                setTimeout(() => container.style.animation = '', 500);
            }
        });
    }
}

function authorizedInit() {
    showApp();
    loadData();
    refreshAllViews();
    setupEventHandlers();
}

function refreshAllViews() {
    updateDashboard();
    updateObligationsTable();
    updateProjectsGrid();
    updateAnalytics();
    updateDataStats();
}

function updateDataStats() {
    const totalRecords = document.getElementById('totalRecords');
    const totalProjects = document.getElementById('totalProjects');
    const lastUpdate = document.getElementById('lastUpdate');

    if (totalRecords) totalRecords.textContent = Store.obligations.length;
    if (totalProjects) {
        const uniqueProjects = new Set(Store.obligations.map(o => o.projectName)).size;
        totalProjects.textContent = uniqueProjects;
    }
    if (lastUpdate) {
        const saved = localStorage.getItem('epdk_lastUpdate');
        lastUpdate.textContent = saved ? new Date(saved).toLocaleString('tr-TR') : '-';
    }
}

// ==========================================
// Event Handlers
// ==========================================

function setupEventHandlers() {
    // Search functionality
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', () => {
            updateObligationsTable();
            updateProjectsGrid();
        });
    }

    // Filters
    ['typeFilter', 'statusFilter', 'startDate', 'endDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateObligationsTable);
    });

    // Add Obligation
    const addBtn = document.getElementById('addObligationBtn');
    const addModal = document.getElementById('addObligationModal');
    const addForm = document.getElementById('addObligationForm');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            addModal.classList.add('show');
        });
    }

    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newObligation = {
                id: generateId(),
                projectName: validateString(document.getElementById('projectName').value),
                projectLink: document.getElementById('projectLink').value,
                obligationType: validateString(document.getElementById('obligationType').value),
                obligationDescription: validateString(document.getElementById('obligationDescription').value),
                deadline: new Date(document.getElementById('deadline').value),
                notes: validateString(document.getElementById('notes').value),
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            Store.obligations.push(newObligation);
            if (saveData()) {
                addModal.classList.remove('show');
                addForm.reset();
                refreshAllViews();
                showToast('Yükümlülük başarıyla eklendi', 'success');
            }
        });
    }

    // Detail View Event
    window.addEventListener('show-detail', (e) => {
        const id = e.detail.id;
        const o = Store.obligations.find(item => item.id === id);
        if (o) showDetailModal(o);
    });

    // Project Detail Event
    window.addEventListener('show-project-detail', (e) => {
        const projectName = e.detail.projectName;
        const projectObligations = Store.obligations.filter(o => o.projectName === projectName);
        showProjectModal(projectName, projectObligations);
    });

    // Excel Operations
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportToExcel);

    const importBtn = document.getElementById('settingsImportBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx, .xls, .csv';
            input.onchange = (e) => {
                const file = e.target.files[0];
                handleExcelImport(file, refreshAllViews);
            };
            input.click();
        });
    }

    // Reset Data
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Tüm verileri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                clearAllData();
                refreshAllViews();
                showToast('Tüm veriler temizlendi', 'info');
            }
        });
    }

    // Help Modal
    const helpBtns = [document.getElementById('headerHelpBtn'), document.getElementById('sidebarHelpBtn')];
    const helpModal = document.getElementById('helpModal');
    helpBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', () => helpModal.classList.add('show'));
    });

    document.getElementById('helpModalOk')?.addEventListener('click', () => helpModal.classList.remove('show'));
    document.getElementById('helpModalClose')?.addEventListener('click', () => helpModal.classList.remove('show'));
}

// ==========================================
// Specialized Modals (Detail View)
// ==========================================

function showDetailModal(o) {
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const status = getStatus(o.deadline);

    title.textContent = 'Yükümlülük Detayı';
    body.innerHTML = `
        <div class="detail-view">
            <div class="detail-header">
                <span class="status-badge ${status}">${getStatusLabel(status)}</span>
                <h3>${o.projectLink ? `<a href="${o.projectLink}" target="_blank">${escapeHtml(o.projectName)}</a>` : escapeHtml(o.projectName)}</h3>
            </div>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Yükümlülük Türü</label>
                    <p>${escapeHtml(o.obligationType)}</p>
                </div>
                <div class="detail-item">
                    <label>Son Tarih</label>
                    <p>${formatDate(o.deadline)}</p>
                </div>
                <div class="detail-item full">
                    <label>Açıklama</label>
                    <p>${escapeHtml(o.obligationDescription)}</p>
                </div>
                <div class="detail-item full">
                    <label>Durum</label>
                    <p class="${status}">${getStatusText(o.deadline)}</p>
                </div>
                <div class="detail-item full">
                    <label>Notlar</label>
                    <p>${escapeHtml(o.notes || 'Not bulunmuyor.')}</p>
                </div>
            </div>
            <div class="detail-footer">
                <small>Oluşturulma: ${new Date(o.createdAt).toLocaleString('tr-TR')}</small>
            </div>
        </div>
    `;
    modal.classList.add('show');
}

function showProjectModal(projectName, obligations) {
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = projectName;
    body.innerHTML = `
        <div class="project-detail">
            <h3>Toplam ${obligations.length} Yükümlülük</h3>
            <div class="project-obs-list">
                ${obligations.map(o => `
                    <div class="project-ob-item">
                        <div class="ob-info">
                            <strong>${escapeHtml(o.obligationType)}</strong>
                            <span>${formatDate(o.deadline)}</span>
                        </div>
                        <p>${escapeHtml(o.obligationDescription)}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    modal.classList.add('show');
}
