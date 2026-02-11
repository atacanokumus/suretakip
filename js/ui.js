import { Store } from './store.js';
import { escapeHtml } from './utils.js';

/**
 * Displays a toast notification
 * @param {string} message 
 * @param {string} type - 'info', 'success', 'error'
 */
export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    const iconEl = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');

    if (iconEl) iconEl.textContent = icon;
    if (messageEl) messageEl.textContent = message;

    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Handles application view navigation
 */
export function initNavigation() {
    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            const targetPage = document.getElementById(pageId);

            if (!targetPage) return;

            // Update nav active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show current page
            pages.forEach(page => {
                page.classList.remove('active');
            });
            targetPage.classList.add('active');

            // Update header title
            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) {
                const spanText = item.querySelector('span:last-child');
                pageTitle.textContent = spanText ? spanText.textContent : 'Ana Sayfa';
            }

            // Toggle Header Buttons
            const addObligationBtn = document.getElementById('addObligationBtn');
            const addJobBtn = document.getElementById('addJobBtn');
            const generateReportBtn = document.getElementById('generateReportBtn');

            if (pageId === 'jobs') {
                if (addObligationBtn) addObligationBtn.style.display = 'none';
                if (addJobBtn) addJobBtn.style.display = 'flex';
                if (generateReportBtn) generateReportBtn.style.display = 'none';
            } else if (pageId === 'obligations') {
                if (addObligationBtn) addObligationBtn.style.display = 'flex';
                if (addJobBtn) addJobBtn.style.display = 'none';
                if (generateReportBtn) generateReportBtn.style.display = 'none';
            } else if (pageId === 'dashboard') {
                if (addObligationBtn) addObligationBtn.style.display = 'flex';
                if (addJobBtn) addJobBtn.style.display = 'flex'; // Phase 5 Refinement
                if (generateReportBtn) generateReportBtn.style.display = 'flex';
            } else {
                if (addObligationBtn) addObligationBtn.style.display = 'none';
                if (addJobBtn) addJobBtn.style.display = 'none';
                if (generateReportBtn) generateReportBtn.style.display = 'none';
            }
        });
    });
}

/**
 * Displays the main app container and hides login overlay
 */
export function showApp() {
    const loginOverlay = document.getElementById('loginOverlay');
    const appContainer = document.getElementById('appContainer');

    if (loginOverlay) {
        loginOverlay.classList.add('hidden');
    }
    if (appContainer) {
        appContainer.style.display = 'flex';
    }
}

/**
 * Initializes modal close handlers
 */
export function initModals() {
    // Close on background click
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.classList.remove('show');
        }
    });

    // Close on button click
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const overlay = btn.closest('.modal-overlay');
            if (overlay) overlay.classList.remove('show');
        });
    });

    // Handle cancel buttons in forms
    document.querySelectorAll('.btn-secondary[id^="cancel"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const overlay = btn.closest('.modal-overlay');
            if (overlay) overlay.classList.remove('show');
        });
    });
}

/**
 * Generates the HTML for project/company/expert metadata cards (VLOOKUP logic)
 */
export function getExpertInfoHtml(projectName) {
    if (!projectName || !Store.projects) return '';

    const proj = Store.projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
    if (!proj) return '';

    const hasExpert = proj.expert && proj.expert.name;

    return `
        <div class="expert-info-card" style="margin-bottom: 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
            <div class="expert-icon">🏢</div>
            <div class="expert-content">
                <label style="opacity: 0.6; font-size: 0.75rem; display: block; margin-bottom: 2px;">${escapeHtml(proj.parentCompany || 'Ana Firma')}</label>
                <strong style="color: var(--accent-light);">${escapeHtml(proj.company || 'Firma')}</strong>
                <p style="font-size: 0.85em; margin-top: 4px; color: var(--text-muted);">${escapeHtml(proj.name)}</p>
            </div>
        </div>
        
        <div class="expert-info-card" style="margin-bottom: 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
            <div class="expert-icon">📄</div>
            <div class="expert-content">
                <label style="opacity: 0.6; font-size: 0.75rem; display: block; margin-bottom: 2px;">Lisans Bilgisi</label>
                <strong>${escapeHtml(proj.licenseNo || '-')}</strong>
                ${proj.licenseDate ? `<p style="font-size: 0.85em; color: var(--text-muted); margin-top: 2px;">Tarih: ${proj.licenseDate}</p>` : ''}
            </div>
        </div>

        ${hasExpert ? `
        <div class="expert-info-card" style="background: rgba(129, 140, 248, 0.05); border: 1px solid rgba(129, 140, 248, 0.1);">
            <div class="expert-icon">👤</div>
            <div class="expert-content">
                <label style="opacity: 0.6; font-size: 0.75rem; display: block; margin-bottom: 2px;">EPDK Uzmanı</label>
                <strong>${escapeHtml(proj.expert.name)}</strong>
                <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
                    ${proj.expert.phone ? `<a href="tel:${proj.expert.phone}" class="expert-phone" style="display: flex; align-items: center; gap: 5px; font-size: 0.85rem;"><span>📞</span> ${proj.expert.phone}</a>` : ''}
                    ${proj.expert.email ? `<a href="mailto:${proj.expert.email}" class="expert-phone" style="display: flex; align-items: center; gap: 5px; color: #818cf8; font-size: 0.85rem;"><span>📧</span> ${proj.expert.email}</a>` : ''}
                </div>
            </div>
        </div>
        ` : ''}
    `;
}
