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
    const navItems = document.querySelectorAll('.nav-items .nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');

            // Update nav active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show current page
            pages.forEach(page => {
                if (page.id === pageId) {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });

            // Close mobile sidebar if necessary
            // (Wait for future mobile improvements)
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
    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        });
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('show');
        });
    });
}
