/**
 * Obligations module for EPDK Süre Takip Platformu
 */

import { Store } from './store.js';
import {
    getStatus, getStatusText, getStatusLabel, formatDate, escapeHtml
} from './utils.js';

/**
 * Updates the obligations table with filters and search
 */
export function updateObligationsTable() {
    const tbody = document.getElementById('obligationsTable');
    if (!tbody) return;

    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const searchTerm = document.getElementById('globalSearch').value.toLowerCase();

    let filtered = [...Store.obligations];

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
            <tr data-id="${o.id}">
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

    // Attach click listeners
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.getAttribute('data-id');
            const event = new CustomEvent('show-detail', { detail: { id } });
            window.dispatchEvent(event);
        });
    });

    updateTypeFilter();
}

/**
 * Updates the type filter dropdown options based on current obligations
 */
export function updateTypeFilter() {
    const select = document.getElementById('typeFilter');
    if (!select) return;

    const currentValue = select.value;
    const types = [...new Set(Store.obligations.map(o => o.obligationType).filter(Boolean))];

    select.innerHTML = '<option value="">Tümü</option>' +
        types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

    select.value = currentValue;
}
