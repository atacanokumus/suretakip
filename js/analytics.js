/**
 * Analytics module for EPDK Süre Takip Platformu
 */

import { Store } from './store.js';
import { getQuarter, getDaysUntil } from './utils.js';

/**
 * Updates all analytics visualizations
 */
export function updateAnalytics() {
    updateAnalyticsStats();
    // Future: Add more charts using Chart.js or similar
}

/**
 * Updates basic stats on the analytics page
 */
export function updateAnalyticsStats() {
    const totalObligations = Store.obligations.length;
    const completed = Store.obligations.filter(o => getDaysUntil(o.deadline) < 0).length;
    const completionRate = totalObligations > 0 ? (completed / totalObligations * 100).toFixed(1) : 0;

    const elTotal = document.getElementById('totalProjectCount');
    const elRate = document.getElementById('completionRate');

    if (elTotal) {
        const uniqueProjects = new Set(Store.obligations.map(o => o.projectName)).size;
        elTotal.textContent = uniqueProjects;
    }

    if (elRate) elRate.textContent = `%${completionRate}`;
}
