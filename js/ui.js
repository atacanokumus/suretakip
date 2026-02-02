/**
 * UI and DOM utilities for EPDK Süre Takip Platformu
 */

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
                pageTitle.textContent = spanText ? spanText.textContent : 'Dashboard';
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
