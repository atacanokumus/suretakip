
import { Store } from './store.js';
import { saveData } from './data.js';
import { generateId } from './utils.js';
import { showToast } from './ui.js';

/**
 * Initializes the Settings Data Management functionality
 */
export function initSettingsManager() {
    const tableBody = document.getElementById('settingsProjectsTableBody');
    const addBtn = document.getElementById('settingsAddProjectBtn');
    const importBtn = document.getElementById('bulkImportBtn');
    const processBtn = document.getElementById('processImportBtn');
    const toggleHeader = document.getElementById('toggleProjectTable');
    const projectContent = document.getElementById('projectTableContent');
    const resetBtn = document.getElementById('resetProjectsBtn');

    if (!tableBody) return;

    // Initial Render
    renderProjectsTable();

    // Event Listeners
    if (addBtn) {
        addBtn.onclick = () => openProjectModal();
    }

    if (importBtn) {
        importBtn.onclick = () => openBulkImportModal();
    }

    if (processBtn) {
        processBtn.onclick = processBulkImport;
    }

    if (toggleHeader && projectContent) {
        toggleHeader.onclick = () => {
            toggleHeader.classList.toggle('open');
            projectContent.classList.toggle('open');
        };
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            if (!confirm('Tüm kayıtlı proje ve uzman tanımlarını silmek istediğinize emin misiniz? (Bu işlem iş kayıtlarını silmez, sadece proje detaylarını sistemden kaldırır)')) return;
            Store.projects = [];
            saveData();
            renderProjectsTable();
            showToast('Tüm proje tanımları temizlendi.', 'success');
        };
    }

    // Export internal functions for global access
    window.editProject = editProject;
    window.deleteProject = deleteProject;
}

function renderProjectsTable() {
    const tbody = document.getElementById('settingsProjectsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!Store.projects || Store.projects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-cell">Henüz proje tanımı yok.</td>
            </tr>
        `;
        return;
    }

    Store.projects.forEach(project => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${project.parentCompany || '-'}</td>
            <td>${project.company || '-'}</td>
            <td><strong>${project.name}</strong></td>
            <td>${project.licenseNo || '-'}</td>
            <td>${project.licenseDate || '-'}</td>
            <td>${project.expert?.name || '-'}</td>
            <td>
                ${project.expert?.name ? `
                    <div class="expert-contact-cell">
                        <small>📞 ${project.expert.phone || ''}</small><br>
                        <small>📧 ${project.expert.email || ''}</small>
                    </div>
                ` : '-'}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editProject('${project.id}')" title="Düzenle">✏️</button>
                    <button class="btn-icon danger" onclick="deleteProject('${project.id}')" title="Sil">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Opens modal for adding or editing a project
 * @param {string|null} projectId - If provided, edit mode
 */
async function openProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const form = document.getElementById('projectForm');
    const modalTitle = modal.querySelector('.modal-header h3');

    if (!modal || !form) return;

    // Reset Form
    form.reset();
    document.getElementById('projectId').value = '';

    if (projectId) {
        const project = Store.projects.find(p => p.id === projectId);
        if (project) {
            modalTitle.textContent = 'Proje Düzenle';
            document.getElementById('projectId').value = project.id;
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectCompany').value = project.company || '';
            document.getElementById('projectParentCompany').value = project.parentCompany || '';
            document.getElementById('projectLicenseNo').value = project.licenseNo || '';
            document.getElementById('projectLicenseDate').value = project.licenseDate || '';
            document.getElementById('expertName').value = project.expert?.name || '';
            document.getElementById('expertPhone').value = project.expert?.phone || '';
            document.getElementById('expertEmail').value = project.expert?.email || '';
        }
    } else {
        modalTitle.textContent = 'Yeni Proje Tanımla';
    }

    modal.classList.add('show');

    // Handle Close
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => modal.classList.remove('show');

    // Handle Submit
    form.onsubmit = (e) => {
        e.preventDefault();
        saveProjectFromModal();
        modal.classList.remove('show');
    };
}

function saveProjectFromModal() {
    const id = document.getElementById('projectId').value; // Hidden input
    const name = document.getElementById('projectName').value.trim();
    const company = document.getElementById('projectCompany').value.trim();
    const parent = document.getElementById('projectParentCompany').value.trim();
    const licenseNo = document.getElementById('projectLicenseNo').value.trim();
    const licenseDate = document.getElementById('projectLicenseDate').value.trim();
    const expertName = document.getElementById('expertName').value.trim();
    const expertPhone = document.getElementById('expertPhone').value.trim();
    const expertEmail = document.getElementById('expertEmail').value.trim();

    if (!name) {
        showToast('Proje adı zorunludur.', 'error');
        return;
    }

    const projectData = {
        name,
        company,
        parentCompany: parent,
        licenseNo,
        licenseDate,
        expert: {
            name: expertName,
            phone: expertPhone,
            email: expertEmail
        },
        updatedAt: new Date()
    };

    if (id) {
        // Edit
        const index = Store.projects.findIndex(p => p.id === id);
        if (index > -1) {
            Store.projects[index] = { ...Store.projects[index], ...projectData };
        }
    } else {
        // Add
        projectData.id = generateId();
        projectData.createdAt = new Date();
        Store.projects.push(projectData);
    }

    if (saveData()) {
        showToast('Proje başarıyla kaydedildi.', 'success');
        renderProjectsTable();
    }
}

function editProject(id) {
    openProjectModal(id);
}

function deleteProject(id) {
    if (!confirm('Bu proje tanımını silmek istediğinize emin misiniz?')) return;

    const initialLen = Store.projects.length;
    Store.projects = Store.projects.filter(p => p.id !== id);

    if (Store.projects.length < initialLen) {
        saveData();
        renderProjectsTable();
        showToast('Proje silindi.', 'success');
    }
}

// --- Bulk Import Logic (Phase 3.4) ---
function openBulkImportModal() {
    const modal = document.getElementById('bulkImportModal');
    const input = document.getElementById('bulkImportInput');
    if (modal && input) {
        // Clear and Pre-populate with current data
        // Format: Ana Şirket | Şirket | Proje Adı | Lisans No | Lisans Tarihi | Uzman | Uzman Telefonu | Uzman Maili
        let currentDataText = "";

        if (Store.projects && Store.projects.length > 0) {
            currentDataText = Store.projects.map(p => {
                const cols = [
                    p.parentCompany || '',
                    p.company || '',
                    p.name || '',
                    p.licenseNo || '',
                    p.licenseDate || '',
                    p.expert?.name || '',
                    p.expert?.phone || '',
                    p.expert?.email || ''
                ];
                return cols.join('\t');
            }).join('\n');
        }

        input.value = currentDataText;
        modal.classList.add('show');

        // Handle Close
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('show');
        }
    }
}

function processBulkImport() {
    const input = document.getElementById('bulkImportInput');
    if (!input || !input.value.trim()) {
        showToast('Lütfen veri yapıştırın.', 'error');
        return;
    }

    const lines = input.value.trim().split('\n');
    let addedCount = 0;
    let updatedCount = 0;

    // Check Clear All
    const clearCheck = document.getElementById('clearAllProjectsCheck');
    const shouldClear = clearCheck && clearCheck.checked;

    if (shouldClear) {
        // We'll replace the entire list
        Store.projects = [];
    }

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        // Detect separator
        const separator = line.includes('\t') ? '\t' : (line.includes('|') ? '|' : null);

        if (!separator) {
            const singleName = line.trim();
            if (singleName && !shouldClear) processSingleProject(singleName);
            return;
        }

        const parts = line.split(separator).map(s => s.trim());

        // Skip header if detected
        if (parts[0].toLowerCase().includes('ana şirket') || parts[0].toLowerCase().includes('ana firma')) {
            return;
        }

        if (parts.length < 3) return;

        const parentCompany = parts[0] || '';
        const company = parts[1] || '';
        const name = parts[2] || '';
        const licenseNo = parts[3] || '';
        const licenseDate = parts[4] || '';
        const expertName = parts[5] || '';
        const expertPhone = parts[6] || '';
        const expertEmail = parts[7] || '';

        if (!name) return;

        // Check if exists
        const existingIndex = Store.projects.findIndex(p => p.name.toLowerCase() === name.toLowerCase());

        const projectData = {
            parentCompany,
            company,
            name,
            licenseNo,
            licenseDate,
            expert: {
                name: expertName,
                phone: expertPhone,
                email: expertEmail
            },
            updatedAt: new Date()
        };

        if (existingIndex > -1) {
            // Update existing
            Store.projects[existingIndex] = { ...Store.projects[existingIndex], ...projectData };
            updatedCount++;
        } else {
            // Create new
            projectData.id = generateId();
            projectData.createdAt = new Date();
            Store.projects.push(projectData);
            addedCount++;
        }
    });

    // Helper for basic single column import
    function processSingleProject(name) {
        if (Store.projects.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
        Store.projects.push({
            id: generateId(),
            name: name,
            createdAt: new Date(),
            updatedAt: new Date(),
            expert: { name: '', phone: '', email: '' }
        });
        addedCount++;
    }

    if (addedCount > 0 || updatedCount > 0) {
        if (saveData()) {
            showToast(`${addedCount} yeni kayıt eklendi, ${updatedCount} kayıt güncellendi. ✅`, 'success');
            renderProjectsTable();
            document.getElementById('bulkImportModal').classList.remove('show');
        }
    } else {
        showToast('İşlenecek geçerli veri bulunamadı.', 'warning');
    }
}
