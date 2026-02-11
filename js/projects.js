/**
 * Projects module for EPDK Süre Takip Platformu
 */

import { Store } from './store.js';
import { escapeHtml } from './utils.js';

/**
 * Updates the projects grid with grouping and search
 */
export function updateProjectsGrid() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    const searchTerm = document.getElementById('projectSearch').value.toLowerCase();

    // Primary list comes from central projects definition (Phase 4)
    const projectList = (Store.projects || []).map(definedProj => {
        const obligations = Store.obligations.filter(o => o.projectName.toLowerCase() === definedProj.name.toLowerCase());
        return {
            ...definedProj,
            obligations: obligations
        };
    });

    // Handle any legacy projects that might not be defined in settings yet (Safety fallback)
    const definedNames = new Set(projectList.map(p => p.name.toLowerCase()));
    Store.obligations.forEach(o => {
        if (!definedNames.has(o.projectName.toLowerCase())) {
            projectList.push({
                name: o.projectName,
                company: 'Tanımsız',
                parentCompany: '',
                obligations: Store.obligations.filter(x => x.projectName === o.projectName)
            });
            definedNames.add(o.projectName.toLowerCase());
        }
    });

    // Filter and sort
    let filteredList = projectList;
    if (searchTerm) {
        filteredList = filteredList.filter(p => p.name.toLowerCase().includes(searchTerm) || (p.company && p.company.toLowerCase().includes(searchTerm)));
    }
    filteredList.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    if (filteredList.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span>🏭</span>
                <p>Proje bulunamadı</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredList.map(p => `
        <div class="project-card" data-name="${p.name}">
            <div class="project-card-header">
                <div class="project-card-title">
                    <span style="font-size: 0.75rem; color: var(--text-muted); display: block; font-weight: normal;">${escapeHtml(p.company || '-')}</span>
                    ${escapeHtml(p.name)}
                </div>
                <div class="project-card-count">${p.obligations.length} Yükümlülük</div>
            </div>
            <div class="project-card-body">
                <p>${escapeHtml(p.obligations[0]?.obligationType || 'İşlem bekleyen yükümlülük yok.')}</p>
            </div>
            <div class="project-card-footer">
                <button class="btn btn-secondary btn-sm">Detayları Gör</button>
            </div>
        </div>
    `).join('');

    // Attach click listeners
    grid.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            const projectName = card.getAttribute('data-name');
            const event = new CustomEvent('show-project-detail', { detail: { projectName } });
            window.dispatchEvent(event);
        });
    });
}
