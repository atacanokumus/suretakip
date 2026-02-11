
import { Store } from './store.js';
import { saveData } from './data.js';
import { generateId, formatDate, escapeHtml, getStatus, convertToDate, validateString } from './utils.js';
import {
    showToast, getExpertInfoHtml
} from './ui.js';
import { auth } from './firebase-config.js';
import { initEmojiPicker } from './emoji.js';

export function updateJobsView() {
    const listContainer = document.getElementById('jobsList');
    if (!listContainer) return;

    const assigneeFilter = document.getElementById('jobAssigneeFilter')?.value || 'all';
    const statusFilter = document.getElementById('jobStatusFilter')?.value || 'all';
    const projectFilter = document.getElementById('jobProjectFilter')?.value || 'all';

    let filteredJobs = Store.jobs || [];

    // Apply Assignee Filter
    if (assigneeFilter === 'me' && auth.currentUser) {
        filteredJobs = filteredJobs.filter(j => j.assignee === auth.currentUser.email);
    } else if (assigneeFilter !== 'all' && assigneeFilter !== 'me') {
        filteredJobs = filteredJobs.filter(j => j.assignee === assigneeFilter);
    }

    // Apply Project Filter
    if (projectFilter !== 'all') {
        filteredJobs = filteredJobs.filter(j => j.project === projectFilter);
    }

    // Apply Status Filter
    if (statusFilter === 'pending') {
        filteredJobs = filteredJobs.filter(j => j.status !== 'completed');
    } else if (statusFilter === 'completed') {
        filteredJobs = filteredJobs.filter(j => j.status === 'completed');
    }

    // Sort: 
    // If pending: Priority High > Medium > Low, then Due Date
    // If completed: Completed Date (Newest first)
    if (statusFilter === 'completed') {
        filteredJobs.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
    } else {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        filteredJobs.sort((a, b) => {
            if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return new Date(a.dueDate || '2100-01-01') - new Date(b.dueDate || '2100-01-01');
        });
    }

    listContainer.innerHTML = '';

    // Update Stats immediately
    updateJobStats();

    if (filteredJobs.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <span>💼</span>
                <p>Görüntülenecek iş bulunamadı.</p>
            </div>
        `;
        return;
    }

    if (statusFilter === 'completed') {
        const now = new Date();
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentJobs = filteredJobs.filter(j => new Date(j.completedAt) >= sevenDaysAgo);
        const olderJobs = filteredJobs.filter(j => new Date(j.completedAt) < sevenDaysAgo);

        if (recentJobs.length > 0) {
            const header = document.createElement('div');
            header.className = 'job-section-header';
            header.innerHTML = `📅 Geçtiğimiz 7 Günde Tamamlananlar (${recentJobs.length})`;
            listContainer.appendChild(header);

            recentJobs.forEach(job => listContainer.appendChild(createJobCard(job)));
        }

        if (olderJobs.length > 0) {
            const header = document.createElement('div');
            header.className = 'job-section-header';
            header.innerHTML = `🕰️ Daha Eski (${olderJobs.length})`;
            listContainer.appendChild(header);

            olderJobs.forEach(job => listContainer.appendChild(createJobCard(job)));
        }
    } else {
        filteredJobs.forEach(job => {
            const card = createJobCard(job);
            listContainer.appendChild(card);
        });
    }

}

function updateJobStats() {
    if (!Store.jobs) return;

    const myPending = Store.jobs.filter(j =>
        auth.currentUser && j.assignee === auth.currentUser.email && j.status !== 'completed'
    ).length;

    const allPending = Store.jobs.filter(j => j.status !== 'completed').length;
    const completed = Store.jobs.filter(j => j.status === 'completed').length;

    const elMy = document.getElementById('jobStatMyPending');
    const elAll = document.getElementById('jobStatAllPending');
    const elComp = document.getElementById('jobStatCompleted');

    if (elMy) elMy.textContent = myPending;
    if (elAll) elAll.textContent = allPending;
    if (elComp) elComp.textContent = completed;
}

function createJobCard(job) {
    const card = document.createElement('div');
    card.className = `job-card ${job.status === 'completed' ? 'completed' : ''}`;
    card.onclick = (e) => {
        // Prevent click if clicking checkbox or action buttons
        if (e.target.closest('.job-checkbox') || e.target.closest('.job-actions')) return;
        // Open Detail Modal
        showJobDetailModal(job);
    };

    const isOverdue = job.dueDate && new Date(job.dueDate) < new Date() && job.status !== 'completed';
    const isToday = job.dueDate && formatDate(job.dueDate) === formatDate(new Date());

    const assigneeName = Store.getUserName(job.assignee);
    const assigneePhoto = Store.getUserPhoto(job.assignee);
    const assigneeInitials = assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    // Avatar HTML
    const avatarHtml = assigneePhoto
        ? `<img src="${assigneePhoto}" class="avatar-img" alt="${assigneeInitials}">`
        : assigneeInitials;

    card.innerHTML = `
        <div class="job-header">
            <h3 class="job-title">${escapeHtml(job.title)}</h3>
            <div class="job-actions">
                <div class="job-checkbox ${job.status === 'completed' ? 'checked' : ''}" 
                     onclick="toggleJobStatus('${job.id}', event)">
                     ${job.status === 'completed' ? '✓' : ''}
                </div>
            </div>
        </div>
        
        <div class="job-body">
            ${job.project ? `<div class="job-project">🏭 ${escapeHtml(job.project)}</div>` : ''}
            <div class="job-priority-dot priority-${job.priority}" title="Öncelik: ${job.priority}"></div>
            <p class="job-description">${escapeHtml(job.description || 'Açıklama yok.')}</p>
        </div>

        <div class="job-footer">
            <div class="job-assignee" title="${job.assignee}">
                <div class="assignee-avatar">${avatarHtml}</div>
                <div class="assignee-text">
                    ${job.createdBy && job.createdBy !== job.assignee ?
            `<span class="creator-tag">${Store.getUserName(job.createdBy)}</span> ➝ ` : ''}
                    <span>${assigneeName}</span>
                </div>
            </div>
            ${job.dueDate ? `
                <div class="job-date ${isOverdue ? 'date-overdue' : (isToday ? 'date-today' : '')}">
                    📅 ${formatDate(job.dueDate)}
                </div>
            ` : ''}
        </div>
    `;
    return card;
}

// Global scope for onclick handlers
window.toggleJobStatus = function (id, event) {
    if (event) event.stopPropagation();

    const job = Store.jobs.find(j => j.id == id);
    if (!job) return;

    const newStatus = job.status === 'completed' ? 'pending' : 'completed';
    const success = Store.updateJob(id, {
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date() : null,
        updatedBy: auth.currentUser?.email
    });

    if (success && saveData()) {
        updateJobsView();

        // Confetti Effect if completed
        if (newStatus === 'completed') {
            showToast('İş tamamlandı! 🎉', 'success');
            triggerConfetti(event.clientX, event.clientY);
        }
    }
};

function triggerConfetti(x, y) {
    // Simple confetti using canvas-confetti if available, or just a console log for now
    // Since we don't have the library imported yet, we'll skip the visual effect or add it later
    console.log('🎉 Confetti at', x, y);
}

export function initJobsEventHandlers() {
    // Add Job Button
    const addBtn = document.getElementById('jobsPageAddBtn');
    const headerAddBtn = document.getElementById('addJobBtn');
    const modal = document.getElementById('addJobModal');
    const closeBtn = document.getElementById('addJobModalClose');
    const form = document.getElementById('addJobForm');

    const openModal = () => {
        // Populate Project List (Phase 9: Multi-Select)
        const projectList = document.getElementById('jobProjectList');
        if (projectList) {
            const allProjects = (Store.projects || []).map(p => p.name).sort();
            projectList.innerHTML = allProjects.map(p => {
                const pid = `p_${generateId()}`;
                return `
                <div class="multi-select-item">
                    <input type="checkbox" id="${pid}" value="${escapeHtml(p)}" class="project-checkbox">
                    <label for="${pid}">${escapeHtml(p)}</label>
                </div>
            `;
            }).join('');

            // Add change listener to projects to disable obligation if multiple selected
            const checkboxes = projectList.querySelectorAll('.project-checkbox');
            const obSelect = document.getElementById('jobObligation');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    const selectedCount = projectList.querySelectorAll('.project-checkbox:checked').length;
                    if (obSelect) {
                        obSelect.disabled = selectedCount > 1;
                        if (selectedCount > 1) obSelect.value = "";
                    }
                });
            });
        }

        // Populate Obligation Select
        const obligationSelect = document.getElementById('jobObligation');
        if (obligationSelect) {
            // Sort by Deadline (Nearest First)
            const sortedObs = [...Store.obligations]
                .filter(o => o.status !== 'completed') // Only pending obligations
                .sort((a, b) => {
                    const dateA = a.deadline ? new Date(a.deadline) : new Date('2099-12-31');
                    const dateB = b.deadline ? new Date(b.deadline) : new Date('2099-12-31');
                    return dateA - dateB;
                }); // Removed slice limit

            obligationSelect.innerHTML = '<option value="">Yükümlülük Seçiniz...</option>' +
                sortedObs.map(o => {
                    const dateStr = o.deadline ? formatDate(o.deadline) : 'Tarihsiz';
                    return `<option value="${o.id}">[${dateStr}] ${escapeHtml(o.projectName)} - ${escapeHtml(o.obligationType)}</option>`;
                }).join('');
            obligationSelect.disabled = false;
        }

        // Populate Assignee List (Phase 9: Multi-Select)
        const assigneeList = document.getElementById('jobAssigneeList');
        if (assigneeList) {
            let html = '';
            // Add current user first
            if (auth.currentUser) {
                html += `
                    <div class="multi-select-item">
                        <input type="checkbox" id="u_me" value="${auth.currentUser.email}" class="assignee-checkbox" checked>
                        <label for="u_me">Bana Ata (${Store.getUserName(auth.currentUser.email)})</label>
                    </div>`;
            }

            // Add other users
            Store.users.forEach(u => {
                if (u.email !== auth.currentUser?.email) {
                    const uid = `u_${generateId()}`;
                    html += `
                        <div class="multi-select-item">
                            <input type="checkbox" id="${uid}" value="${u.email}" class="assignee-checkbox">
                            <label for="${uid}">${escapeHtml(u.displayName || u.email)} (${u.title || 'Üye'})</label>
                        </div>`;
                }
            });
            assigneeList.innerHTML = html;
        }

        modal.classList.add('show');
    };

    if (addBtn) addBtn.onclick = openModal;
    if (headerAddBtn) headerAddBtn.onclick = openModal;

    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.remove('show');
    }

    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();

            const selectedProjects = Array.from(document.querySelectorAll('#jobProjectList .project-checkbox:checked')).map(cb => cb.value);
            const selectedAssignees = Array.from(document.querySelectorAll('#jobAssigneeList .assignee-checkbox:checked')).map(cb => cb.value);
            const relatedObligationId = document.getElementById('jobObligation')?.value || null;

            if (selectedProjects.length === 0) {
                showToast('Lütfen en az bir proje seçiniz.', 'warning');
                return;
            }
            if (selectedAssignees.length === 0) {
                showToast('Lütfen en az bir kişi seçiniz.', 'warning');
                return;
            }

            const title = validateString(document.getElementById('jobTitle').value);
            const priority = document.getElementById('jobPriority').value;
            const dueDateValue = document.getElementById('jobDueDate').value;
            const dueDate = dueDateValue ? new Date(dueDateValue) : null;
            const description = validateString(document.getElementById('jobDescription').value);

            let creationCount = 0;

            // COMBINATORIAL CREATION (Phase 9)
            selectedProjects.forEach(proj => {
                selectedAssignees.forEach(userEmail => {
                    const newJob = {
                        id: generateId(),
                        title: title,
                        project: proj,
                        relatedObligationId: selectedProjects.length === 1 ? relatedObligationId : null,
                        assignee: userEmail,
                        priority: priority,
                        dueDate: dueDate,
                        description: description,
                        status: 'pending',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        createdBy: auth.currentUser?.email,
                        history: [{ action: 'created', user: auth.currentUser?.email, date: new Date() }],
                        comments: []
                    };
                    Store.addJob(newJob);
                    creationCount++;
                });
            });

            if (saveData()) {
                modal.classList.remove('show');
                form.reset();
                updateJobsView();
                showToast(`${creationCount} adet iş başarıyla oluşturuldu 💼`, 'success');
            }
        };
    }

    // Filters
    ['jobAssigneeFilter', 'jobStatusFilter', 'jobProjectFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateJobsView);
    });

    // Bind Stat Cards for Filtering
    document.querySelectorAll('.stat-card[data-job-filter]').forEach(card => {
        card.onclick = () => {
            const filterType = card.getAttribute('data-job-filter');
            const statusSelect = document.getElementById('jobStatusFilter');
            const assigneeSelect = document.getElementById('jobAssigneeFilter');

            if (!statusSelect || !assigneeSelect) return;

            if (filterType === 'my-pending') {
                statusSelect.value = 'pending';
                assigneeSelect.value = 'me';
            } else if (filterType === 'all-pending') {
                statusSelect.value = 'pending';
                assigneeSelect.value = 'all';
            } else if (filterType === 'completed') {
                statusSelect.value = 'completed';
                assigneeSelect.value = 'all';
            }

            updateJobsView();

            document.querySelectorAll('.stat-card[data-job-filter]').forEach(c => c.classList.remove('active-filter'));
            card.classList.add('active-filter');
        };
    });

    // Populate Filters on Load
    refreshJobFilters();
}

/**
 * Populates the filter dropdowns dynamically from Store data
 */
export function refreshJobFilters() {
    // Project Filter
    const projectFilter = document.getElementById('jobProjectFilter');
    if (projectFilter) {
        const currentVal = projectFilter.value;
        const allProjects = (Store.projects || []).map(p => p.name).sort();
        projectFilter.innerHTML = '<option value="all">Tüm Projeler</option>' +
            allProjects.map(p => `<option value="${escapeHtml(p)}" ${p === currentVal ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
    }

    // Assignee Filter
    const assigneeFilterList = document.getElementById('jobAssigneeFilter');
    if (assigneeFilterList) {
        const currentVal = assigneeFilterList.value;
        let html = `
            <option value="all" ${currentVal === 'all' ? 'selected' : ''}>Tümü</option>
            <option value="me" ${currentVal === 'me' ? 'selected' : ''}>Bana Atananlar</option>
        `;

        Store.users.forEach(u => {
            if (u.email !== auth.currentUser?.email) {
                html += `<option value="${u.email}" ${u.email === currentVal ? 'selected' : ''}>${escapeHtml(u.displayName || u.email)}</option>`;
            }
        });
        assigneeFilterList.innerHTML = html;
    }
}

/**
 * Shows the Job Detail Modal using the generic modal structure
 */
function showJobDetailModal(jobData) {
    // Always fetch the latest version of the job from Store to avoid stale data
    // (The 'jobData' passed might be from an old render closure)
    const job = Store.jobs.find(j => j.id == jobData.id);

    if (!job) {
        console.error('Job not found in Store:', jobData.id);
        return;
    }

    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    // Make sure modal elements exist (they might be in index.html)
    if (!modal || !title || !body) return;

    title.textContent = 'İş Detayı';

    const completedInfo = job.completedAt ?
        `<div class="completion-info">
            ✅ <strong>Tamamlanma:</strong> ${new Date(job.completedAt).toLocaleString('tr-TR')} 
            <br><span class="text-muted">by ${Store.getUserName(job.updatedBy)}</span>
         </div>` : '';

    body.innerHTML = `
        <div class="job-detail-panel">
            <header class="detail-header">
                <span class="status-badge ${job.status}">${job.status === 'completed' ? 'Tamamlandı' : 'Yapılacak'}</span>
                <span class="priority-badge priority-${job.priority}">${job.priority.toUpperCase()}</span>
                <div class="header-actions" style="margin-left: auto;">
                    <button class="btn btn-sm btn-outline" id="editJobBtn">✏️ Düzenle</button>
                    <button class="btn btn-sm btn-outline" id="deleteJobBtn" style="color:red; border-color:red;">🗑️ Sil</button>
                </div>
                <h2>${escapeHtml(job.title)}</h2>
            </header>

            <div id="jobDetailContent">
                <!-- View Mode Content -->
                ${getExpertInfoHtml(job.project)}
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Proje:</label>
                        <p>${escapeHtml(job.project || 'Belirtilmemiş')}</p>
                    </div>
                    <div class="detail-item">
                        <label>Atanan:</label>
                        <div class="detail-assignee-row">
                            ${Store.getUserPhoto(job.assignee) ?
            `<img src="${Store.getUserPhoto(job.assignee)}" class="avatar-img-sm">` : ''}
                            <p>${Store.getUserName(job.assignee)}</p>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label>Termin:</label>
                        <p>${job.dueDate ? formatDate(job.dueDate) : 'Yok'}</p>
                    </div>
                </div>

                ${job.relatedObligationId ? `
                    <div class="detail-link-box">
                        <label>🔗 İlişkili Yükümlülük:</label>
                        <div class="linked-obligation" onclick="openLinkedObligation('${job.relatedObligationId}')">
                            ${getObligationName(job.relatedObligationId)}
                        </div>
                    </div>
                ` : ''}

                <div class="detail-description">
                    <label>Açıklama:</label>
                    <p>${escapeHtml(job.description || 'Açıklama yok.')}</p>
                </div>
            </div>

            ${completedInfo}

            <hr class="divider">

            <!-- Comments Section -->
            <div class="comments-section">
                <h3>💬 Yorumlar & Notlar</h3>
                <div class="comments-list" id="jobCommentsList">
                    ${(job.comments || []).length > 0 ? job.comments.map(c => `
                        <div class="comment-item">
                            <div class="comment-meta">
                                <div class="comment-user">
                                    ${Store.getUserPhoto(c.user) ?
                    `<img src="${Store.getUserPhoto(c.user)}" class="avatar-img-xs">` : ''}
                                    <strong>${Store.getUserName(c.user)}</strong>
                                </div>
                                <span>${new Date(c.timestamp).toLocaleString('tr-TR')}</span>
                            </div>
                            <div class="comment-text">${escapeHtml(c.text)}</div>
                        </div>
                    `).join('') : '<p class="no-comments">Henüz not eklenmemiş.</p>'}
                </div>

                <div class="add-comment-wrapper">
                    <textarea id="jobCommentInput" placeholder="Notunuzu buraya yazın..." rows="2"></textarea>
                    <button id="addJobCommentBtn" class="btn btn-primary btn-sm">Gönder</button>
                </div>
            </div>
        </div>
    `;

    // Add specific styles for this modal content if needed (inline or via class)
    // For now simpler HTML structure.

    modal.classList.add('show');

    // Bind Comment Button
    const sendBtn = document.getElementById('addJobCommentBtn');
    if (sendBtn) {
        sendBtn.onclick = () => {
            const input = document.getElementById('jobCommentInput');
            const text = input.value.trim();
            if (text) {
                addJobComment(job.id, text);
                // Refresh modal content
                const updatedJob = Store.jobs.find(j => j.id == job.id);
                if (updatedJob) showJobDetailModal(updatedJob);
            }
        };
    }

    // Initialize Emoji Picker for Comment Input
    setTimeout(() => initEmojiPicker('jobCommentInput'), 100);

    // Bind Edit Button
    const editBtn = document.getElementById('editJobBtn');
    if (editBtn) {
        editBtn.onclick = () => enableEditMode(job);
    }

    // Bind Delete Button
    const delBtn = document.getElementById('deleteJobBtn');
    if (delBtn) {
        delBtn.onclick = () => deleteJob(job.id);
    }
}

function enableEditMode(job) {
    const contentDiv = document.getElementById('jobDetailContent');
    if (!contentDiv) return;

    // Generate Select Options (Phase 4: Using defined projects)
    const projectOptions = (Store.projects || []).map(p => p.name).sort()
        .map(p => `<option value="${escapeHtml(p)}" ${p === job.project ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');

    const userOptions = Store.users
        .filter(u => u.email !== auth.currentUser?.email) // Other users
        .map(u => `<option value="${u.email}" ${u.email === job.assignee ? 'selected' : ''}>${escapeHtml(u.displayName || u.email)}</option>`).join('');

    const currentUserOption = auth.currentUser ?
        `<option value="${auth.currentUser.email}" ${auth.currentUser.email === job.assignee ? 'selected' : ''}>Bana Ata (${Store.getUserName(auth.currentUser.email)})</option>` : '';

    const obligationOptions = [...Store.obligations]
        .filter(o => o.status !== 'completed')
        .sort((a, b) => {
            const dateA = a.deadline ? new Date(a.deadline) : new Date('2099-12-31');
            const dateB = b.deadline ? new Date(b.deadline) : new Date('2099-12-31');
            return dateA - dateB;
        })
        .map(o => {
            const dateStr = o.deadline ? formatDate(o.deadline) : 'Tarihsiz';
            return `<option value="${o.id}" ${o.id === job.relatedObligationId ? 'selected' : ''}>[${dateStr}] ${escapeHtml(o.projectName)} - ${escapeHtml(o.obligationType)}</option>`;
        }).join('');

    contentDiv.innerHTML = `
        <div class="edit-mode-form">
            <div class="form-group">
                <label>Başlık</label>
                <input type="text" id="editJobTitle" value="${escapeHtml(job.title)}" class="form-input">
            </div>
            
            <div class="edit-grid">
                <div class="form-group">
                    <label>Proje</label>
                    <select id="editJobProject" class="form-select">
                        <option value="">Seçiniz...</option>
                        ${projectOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Atanan</label>
                    <select id="editJobAssignee" class="form-select">
                        ${currentUserOption}
                        ${userOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Termin</label>
                    <input type="date" id="editJobDueDate" value="${job.dueDate ? new Date(job.dueDate).toISOString().split('T')[0] : ''}" class="form-input">
                </div>
                 <div class="form-group">
                    <label>Öncelik</label>
                    <select id="editJobPriority" class="form-select">
                        <option value="low" ${job.priority === 'low' ? 'selected' : ''}>Düşük</option>
                        <option value="medium" ${job.priority === 'medium' ? 'selected' : ''}>Orta</option>
                        <option value="high" ${job.priority === 'high' ? 'selected' : ''}>Yüksek</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                 <label>Bağlı Yükümlülük</label>
                 <select id="editJobObligation" class="form-select">
                    <option value="">Yok</option>
                    ${obligationOptions}
                 </select>
            </div>

            <div class="form-group">
                <label>Açıklama</label>
                <textarea id="editJobDescription" rows="3" class="form-input">${escapeHtml(job.description || '')}</textarea>
            </div>

            <div class="edit-actions">
                <button id="cancelEditBtn" class="btn btn-secondary">İptal</button>
                <button id="saveEditBtn" class="btn btn-primary">Kaydet</button>
            </div>
        </div>
    `;

    document.getElementById('cancelEditBtn').onclick = () => showJobDetailModal(job);
    document.getElementById('saveEditBtn').onclick = () => saveJobEdit(job.id);

    // Initialize Emoji Picker for Edit Description
    setTimeout(() => initEmojiPicker('editJobDescription'), 100);
}

function saveJobEdit(jobId) {
    const title = validateString(document.getElementById('editJobTitle').value);
    const project = document.getElementById('editJobProject').value;
    const assignee = document.getElementById('editJobAssignee').value;
    const priority = document.getElementById('editJobPriority').value;
    const dueDateVal = document.getElementById('editJobDueDate').value;
    const relatedObligationId = document.getElementById('editJobObligation').value || null;
    const description = validateString(document.getElementById('editJobDescription').value);

    const updates = {
        title, project, assignee, priority, relatedObligationId, description,
        dueDate: dueDateVal ? new Date(dueDateVal) : null,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.email
    };

    const success = Store.updateJob(jobId, updates);
    if (success && saveData()) {
        showToast('İş güncellendi ✅', 'success');
        const updatedJob = Store.jobs.find(j => j.id == jobId);
        updateJobsView(); // Update list
        showJobDetailModal(updatedJob); // Return to view mode
    }
}

function deleteJob(jobId) {
    if (confirm('Bu işi silmek istediğinize emin misiniz?')) {
        const index = Store.jobs.findIndex(j => j.id == jobId);
        if (index > -1) {
            Store.jobs.splice(index, 1);
            saveData();
            updateJobsView();
            document.getElementById('modalOverlay').classList.remove('show');
            showToast('İş silindi.', 'info');
        }
    }
}

function addJobComment(jobId, text) {
    const job = Store.jobs.find(j => j.id == jobId);
    if (!job) return;

    const newComment = {
        user: auth.currentUser?.email || 'Anonim',
        text: text,
        timestamp: new Date().toISOString()
    };

    const comments = Array.isArray(job.comments) ? [...job.comments] : [];
    comments.push(newComment);

    const success = Store.updateJob(jobId, { comments, updatedAt: new Date() });
    if (success && saveData()) {
        showToast('Not eklendi! 📝', 'success');
    }
}


window.openLinkedObligation = function (id) {
    // Close job modal first (optional but cleaner)
    document.getElementById('modalOverlay').classList.remove('show');

    // Trigger existing event listener in app.js
    window.dispatchEvent(new CustomEvent('show-detail', { detail: { id: id } }));
};
