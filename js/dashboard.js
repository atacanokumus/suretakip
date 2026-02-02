/**
 * Dashboard module for EPDK Süre Takip Platformu
 */

import { Store } from './store.js';
import {
    getDaysUntil, getStatus, getStatusText, formatDate, getQuarter, escapeHtml
} from './utils.js';

/**
 * Updates all dashboard elements
 */
export function updateDashboard() {
    const obligations = Store.obligations;

    // Calculate stats
    let completed = 0, thisWeek = 0, thisMonth = 0, upcoming = 0;

    obligations.forEach(o => {
        const days = getDaysUntil(o.deadline);
        if (days < 0) completed++;
        else if (days <= 7) thisWeek++;
        else if (days <= 30) thisMonth++;
        else upcoming++;
    });

    // Update stat cards
    const elements = {
        thisWeekCount: thisWeek,
        thisMonthCount: thisMonth,
        upcomingCount: upcoming,
        completedCount: completed
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    updateUpcomingList();
    updateQuarterlyChart();
}

/**
 * Updates the upcoming obligations list on the dashboard
 */
export function updateUpcomingList() {
    const list = document.getElementById('upcomingList');
    if (!list) return;

    if (Store.obligations.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span>📤</span>
                <p>Excel dosyası yükleyerek başlayın</p>
            </div>
        `;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...Store.obligations]
        .filter(o => new Date(o.deadline) >= today)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 30);

    list.innerHTML = sorted.map(o => {
        const status = getStatus(o.deadline);
        const statusText = getStatusText(o.deadline);

        return `
            <div class="obligation-item" data-id="${o.id}">
                <div class="obligation-status ${status}"></div>
                <div class="obligation-content">
                    <div class="obligation-project">
                        ${o.projectLink ? `<a href="${o.projectLink}" target="_blank">${escapeHtml(o.projectName)}</a>` : escapeHtml(o.projectName)}
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

    // Attach click listeners
    list.querySelectorAll('.obligation-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            const id = item.getAttribute('data-id');
            // detail view will be handled via global app instance or events
            const event = new CustomEvent('show-detail', { detail: { id } });
            window.dispatchEvent(event);
        });
    });
}

/**
 * Updates the quarterly intensity chart
 */
export function updateQuarterlyChart() {
    const currentYear = new Date().getFullYear();
    const quarters = [0, 0, 0, 0];

    Store.obligations.forEach(o => {
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

        if (label) label.textContent = `${currentYear} Q${i + 1}`;
        if (value) value.textContent = quarters[i];

        if (bar) {
            const width = (quarters[i] / max) * 100;
            bar.style.setProperty('--width', `${width}%`);

            // Fix for chart rendering
            setTimeout(() => {
                const styleId = `q${i + 1}BarStyle`;
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }
                styleEl.textContent = `#q${i + 1}Bar::after { width: ${width}% !important; }`;
            }, 100);
        }
    }
}
