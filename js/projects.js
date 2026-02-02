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

    // Group by project
    const projects = {};
    Store.obligations.forEach(o => {
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
                <p>Proje bulunamadı</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = projectList.map(p => `
        <div class="project-card" data-name="${p.name}">
            <div class="project-card-header">
                <div class="project-card-title">
                    ${p.link ? `<a href="${p.link}" target="_blank" onclick="event.stopPropagation()">${escapeHtml(p.name)}</a>` : escapeHtml(p.name)}
                </div>
                <div class="project-card-count">${p.obligations.length} Yükümlülük</div>
            </div>
            <div class="project-card-body">
                <p>${escapeHtml(p.obligations[0]?.obligationType || '')}...</p>
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
