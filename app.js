import { auth } from './js/firebase-config.js';
import { Store } from './js/store.js';
import {
    initAuthStyles, checkAuthentication, authenticate, logout
} from './js/auth.js';
import {
    loadData, saveData, handleExcelImport, exportToExcel, backupToDaVinciArchive, clearAllData, fetchUsers, saveUserProfile
} from './js/data.js';
import { initSettingsManager } from './js/settings_manager.js';
import { initSettings } from './js/settings.js';
import {
    showToast, initNavigation, showApp, initModals, getExpertInfoHtml
} from './js/ui.js';
import {
    updateDashboard, updateUpcomingList
} from './js/dashboard.js';
import {
    updateObligationsTable, updateTypeFilter
} from './js/obligations.js';
import {
    updateProjectsGrid
} from './js/projects.js';
import {
    updateAnalytics, initAnalytics
} from './js/analytics.js';
import {
    updateJobsView, initJobsEventHandlers, refreshJobFilters
} from './js/jobs.js';
import {
    initNotifications, checkAndNotify, testNotifications
} from './js/notifications.js';
import {
    generateMeetingReport
} from './js/reports.js';
import {
    formatDateLong, formatDate, getStatus, getStatusText, getStatusLabel, escapeHtml, generateId, validateDate, validateString, convertToDate
} from './js/utils.js';
import { initEmojiPicker } from './js/emoji.js';

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log('ğŸš€ DaVinci App Initializing...');
    initAuthStyles();

    // Check auth
    checkAuthentication((user) => {
        console.log('ğŸ‘¤ Auth state changed:', user ? user.email : 'No user');
        if (user) {
            authorizedInit();
        } else {
            setupLoginForm();
        }
    });

    // Set current date in header
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = formatDateLong(new Date());

    try {
        initNavigation();
        initModals();
        initMobileMenu();
    } catch (e) {
        console.error('UI Basic Init Error:', e);
    }
}


/**
 * Initialize mobile hamburger menu toggle
 */
function initMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (!hamburgerBtn || !sidebar) return;

    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    });

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Close sidebar when a nav item is clicked (on mobile)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
            }
        });
    });
}

function initProfileHandlers() {
    const profileTrigger = document.getElementById('userProfileTrigger');
    const modal = document.getElementById('profileModal');
    const closeBtn = document.getElementById('profileModalClose');
    const form = document.getElementById('profileForm');
    const photoInput = document.getElementById('profilePhotoInput');
    const photoPreview = document.getElementById('profilePhotoPreview');

    let currentPhotoData = null; // Store base64 string

    if (profileTrigger) {
        profileTrigger.onclick = (e) => {
            e.preventDefault();
            if (!auth.currentUser) return;

            const email = auth.currentUser.email;
            const userProfile = Store.users.find(u => u.email === email);

            document.getElementById('profileEmail').value = email;
            document.getElementById('profileName').value = userProfile?.displayName || '';
            document.getElementById('profileTitle').value = userProfile?.title || '';

            // Set initial preview
            if (userProfile?.photoURL) {
                photoPreview.innerHTML = `<img src="${userProfile.photoURL}" class="preview-img">`;
                currentPhotoData = userProfile.photoURL;
            } else {
                photoPreview.innerHTML = '<span>ğŸ“·</span>';
                currentPhotoData = null;
            }

            modal.classList.add('show');
        };
    }

    if (photoInput && photoPreview) {
        photoInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                // Resize image to max 128x128px
                const resized = await resizeImage(file, 128);
                currentPhotoData = resized;
                photoPreview.innerHTML = `<img src="${resized}" class="preview-img">`;
            } catch (err) {
                console.error('Image resize error:', err);
                showToast('FotoÄŸraf iÅŸlenemedi.', 'error');
            }
        };
    }

    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.remove('show');
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Kaydediliyor...';
            btn.disabled = true;

            const profileData = {
                email: auth.currentUser.email,
                displayName: document.getElementById('profileName').value.trim(),
                title: document.getElementById('profileTitle').value.trim(),
                photoURL: currentPhotoData,
                uid: auth.currentUser.uid
            };

            const success = await saveUserProfile(profileData);

            btn.textContent = originalText;
            btn.disabled = false;

            if (success) {
                showToast('Profil gÃ¼ncellendi! âœ…', 'success');
                modal.classList.remove('show');
                // Trigger global refresh to update names in UI
                window.dispatchEvent(new CustomEvent('data-refreshed'));
            } else {
                showToast('Hata oluÅŸtu.', 'error');
            }
        };
    }
}


// Image Resize Helper
function resizeImage(file, maxWidth) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Return as Base64 (JPEG 0.7 quality)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');

    if (loginForm) {
        // Remove old listeners to avoid duplicates
        const newForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newForm, loginForm);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();


            const email = document.getElementById('emailInput').value;
            const password = document.getElementById('passwordInput').value;
            const remember = document.getElementById('rememberMe')?.checked ?? true;

            const success = await authenticate(email, password, remember);
            if (!success) {
                const errEl = document.getElementById('loginError');
                if (errEl) errEl.textContent = 'âŒ GiriÅŸ baÅŸarÄ±sÄ±z! LÃ¼tfen kontrol edin.';
                const container = document.querySelector('.login-container');
                container.style.animation = 'shake 0.5s';
                setTimeout(() => container.style.animation = '', 500);
            }
        });
    }
}

async function authorizedInit() {
    try {
        showApp();
        const userEmail = document.getElementById('userEmailDisplay');
        const footerAvatar = document.getElementById('footerUserAvatar');
        const footerName = document.getElementById('footerUserName');

        if (userEmail && auth.currentUser) userEmail.textContent = auth.currentUser.email;
        if (footerName && auth.currentUser) {
            // Show display name, fallback to email if empty
            const name = auth.currentUser.displayName;
            footerName.textContent = name || auth.currentUser.email;
        }

        // Load stored profile image if available
        const userProfile = Store.users.find(u => u.email === auth.currentUser.email);
        if (userProfile?.photoURL && footerAvatar) {
            footerAvatar.innerHTML = `<img src="${userProfile.photoURL}" class="preview-img">`;
        }
        if (userProfile?.displayName && footerName) {
            footerName.textContent = userProfile.displayName;
        }

        // Load data but don't let it block UI if it takes too long
        try {
            await loadData();
        } catch (e) {
            console.error('Data loading failed:', e);
        }

        // Initialize UI components even if data is still loading or partially failed
        refreshAllViews();
        setupEventHandlers();
        initJobsEventHandlers(); // Initialize Job Event Handlers


        // Background/Async tasks
        try {
            initNotifications();
            initAnalytics();
            fetchUsers(); // Fetch all users for dropdowns
            initProfileHandlers();
            initSettingsManager(); // Phase 3: Project Settings Manager
            initSettings(); // Notification Settings

            // Phase 27: Emoji Support
            setTimeout(() => {
                initEmojiPicker('obligationDescription');
                initEmojiPicker('notes');
                initEmojiPicker('jobDescription');
            }, 1000); // Slight delay to ensure DOM is ready and layout settled
        } catch (e) {
            console.warn('Init failed:', e);
        }

        // Listen for background cloud sync updates
        window.addEventListener('data-refreshed', () => {
            refreshAllViews();
        });
    } catch (criticalError) {
        console.error('Critical app init error:', criticalError);
        showToast('Uygulama baÅŸlatÄ±lÄ±rken bir sorun oluÅŸtu.', 'error');
    }

    // Auto-Action Handler (e.g. from Email Links)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'download_report') {
        console.log('ğŸ“¥ Auto-download triggered via URL...');
        const btn = document.getElementById('generateReportBtn');
        if (btn) {
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Wait a moment for UI to settle
            setTimeout(() => {
                showToast('E-postadan gelen istek Ã¼zerine rapor hazÄ±rlanÄ±yor...', 'info');
                btn.click();
            }, 1000);
        }
    }
}

function refreshAllViews() {
    try {
        updateDashboard();
        updateObligationsTable();
        updateProjectsGrid();
        updateJobsView(); // Update Jobs View
        refreshJobFilters(); // Phase 10: Refresh Job Filters
        updateAnalytics();
        updateDataStats();

        try {
            checkAndNotify();
        } catch (e) {
            console.warn('Notification check failed:', e);
        }
    } catch (e) {
        console.error('View refresh failed:', e);
    }
}

function updateDataStats() {
    const totalRecords = document.getElementById('totalRecords');
    const totalProjects = document.getElementById('totalProjects');
    const lastUpdate = document.getElementById('lastUpdate');

    if (totalRecords) totalRecords.textContent = Store.obligations.length;
    if (totalProjects) {
        totalProjects.textContent = (Store.projects || []).length;
    }
    if (lastUpdate) {
        const saved = localStorage.getItem('epdk_lastUpdate');
        lastUpdate.textContent = saved ? new Date(saved).toLocaleString('tr-TR') : '-';
    }
}

// ==========================================
// Event Handlers
// ==========================================

function setupEventHandlers() {

    // Filters
    ['typeFilter', 'statusFilter', 'startDate', 'endDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateObligationsTable);
    });

    // Project Search (Live Filter)
    const projectSearch = document.getElementById('projectSearch');
    if (projectSearch) {
        projectSearch.addEventListener('input', updateProjectsGrid);
    }

    // Dashboard Stats Interactivity
    document.querySelectorAll('.clickable-card').forEach(card => {
        card.addEventListener('click', () => {
            const filter = card.getAttribute('data-filter');

            if (filter.includes('-jobs')) {
                // JOBS Logic
                const jobsNav = document.querySelector('.nav-item[data-page="jobs"]');
                const assigneeFilter = document.getElementById('jobAssigneeFilter');
                const statusFilter = document.getElementById('jobStatusFilter');

                if (jobsNav && assigneeFilter && statusFilter) {
                    if (filter === 'my-pending-jobs') {
                        assigneeFilter.value = 'me';
                        statusFilter.value = 'pending';
                    } else if (filter === 'all-pending-jobs') {
                        assigneeFilter.value = 'all';
                        statusFilter.value = 'pending';
                    }
                    jobsNav.click();
                    updateJobsView();
                }
            } else if (filter.includes('-obs')) {
                // OBLIGATIONS Logic
                const obligationsNav = document.querySelector('.nav-item[data-page="obligations"]');
                const statusFilter = document.getElementById('statusFilter');

                if (obligationsNav && statusFilter) {
                    if (filter === 'this-week-obs') {
                        statusFilter.value = 'thisWeek';
                    } else if (filter === 'this-month-obs') {
                        statusFilter.value = 'thisMonth';
                    }
                    obligationsNav.click();
                    updateObligationsTable();
                }
            }

            showToast(`Filtre uygulandÄ±: ${card.querySelector('.stat-label').textContent}`, 'info');
        });
    });

    // Reset filters when clicking 'Ana Sayfa' (default sidebar behavior)
    const anaSayfaNav = document.querySelector('.nav-item[data-page="dashboard"]');
    if (anaSayfaNav) {
        anaSayfaNav.addEventListener('click', () => {
            const statusFilter = document.getElementById('statusFilter');
            const typeFilter = document.getElementById('typeFilter');
            if (statusFilter) statusFilter.value = '';
            if (typeFilter) typeFilter.value = '';
            updateObligationsTable();
        });
    }

    // Add Obligation
    const addBtn = document.getElementById('addObligationBtn');
    const addModal = document.getElementById('addObligationModal');
    const addForm = document.getElementById('addObligationForm');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            // Populate Project Select (Phase 4)
            const projectSelect = document.getElementById('projectName');
            if (projectSelect) {
                const allProjects = (Store.projects || []).map(p => p.name).sort();
                projectSelect.innerHTML = '<option value="">Proje SeÃ§iniz...</option>' +
                    allProjects.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
            }
            addModal.classList.add('show');
        });
    }

    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newObligation = {
                id: generateId(),
                projectName: validateString(document.getElementById('projectName').value),
                projectLink: document.getElementById('projectLink').value,
                obligationType: validateString(document.getElementById('obligationType').value),
                obligationDescription: validateString(document.getElementById('obligationDescription').value),
                deadline: new Date(document.getElementById('deadline').value),
                notes: validateString(document.getElementById('notes').value),
                status: 'pending',
                comments: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            Store.obligations.push(newObligation);
            if (saveData()) {
                addModal.classList.remove('show');
                addForm.reset();
                refreshAllViews();
                showToast('YÃ¼kÃ¼mlÃ¼lÃ¼k baÅŸarÄ±yla eklendi', 'success');
            }
        });
    }

    // Detail View Event
    window.addEventListener('show-detail', (e) => {
        const id = e.detail.id;
        // Use loose equality (==) to handle String/Number ID mismatches
        const o = Store.obligations.find(item => item.id == id);
        if (o) showDetailModal(o);
        else console.warn('Obligation not found for ID:', id);
    });

    // Project Detail Event
    window.addEventListener('show-project-detail', (e) => {
        const projectName = e.detail.projectName;
        const projectObligations = Store.obligations.filter(o => o.projectName === projectName);
        showProjectModal(projectName, projectObligations);
    });

    // Excel Operations
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.onclick = (e) => {
            e.preventDefault();
            console.log('ğŸ“Š Export button clicked');
            exportToExcel();
        };
    }

    const reportBtn = document.getElementById('generateReportBtn');
    if (reportBtn) {
        reportBtn.addEventListener('click', async () => {
            try {
                showToast('Rapor hazÄ±rlanÄ±yor, lÃ¼tfen bekleyin...', 'info');
                reportBtn.disabled = true;
                await generateMeetingReport();
                showToast('Rapor baÅŸarÄ±yla oluÅŸturuldu!', 'success');
            } catch (e) {
                console.error('Report Error:', e);
                showToast('Rapor oluÅŸturulurken bir hata oluÅŸtu.', 'error');
            } finally {
                reportBtn.disabled = false;
            }
        });
    }

    const importBtn = document.getElementById('settingsImportBtn');
    if (importBtn) {
        importBtn.onclick = (e) => {
            e.preventDefault();
            // Create a temporary hidden input to trigger file selection
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx, .xls, .csv';
            input.style.display = 'none';
            document.body.appendChild(input);

            input.onchange = (ev) => {
                const file = ev.target.files[0];
                if (file) {
                    handleExcelImport(file, () => {
                        refreshAllViews();
                        showToast('Excel baÅŸarÄ±yla yÃ¼klendi!', 'success');
                    });
                }
                document.body.removeChild(input);
            };

            input.click();
        };
    }

    // Reset Data
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('TÃ¼m verileri silmek istediÄŸinize emin misiniz? Bu iÅŸlem geri alÄ±namaz.')) {
                clearAllData();
                refreshAllViews();
                showToast('TÃ¼m veriler temizlendi', 'info');
            }
        });
    }

    // Help Modal (Sidebar only as per user request)
    const sidebarHelpBtn = document.getElementById('sidebarHelpBtn');
    const helpModal = document.getElementById('helpModal');
    if (sidebarHelpBtn && helpModal) {
        sidebarHelpBtn.addEventListener('click', () => {
            helpModal.classList.add('show');
        });
    }

    document.getElementById('helpModalOk')?.addEventListener('click', () => {
        document.getElementById('helpModal')?.classList.remove('show');
    });
    document.getElementById('helpModalClose')?.addEventListener('click', () => {
        document.getElementById('helpModal')?.classList.remove('show');
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm('Ã‡Ä±kÄ±ÅŸ yapmak istediÄŸinize emin misiniz?')) {
                logout();
            }
        };
    }

    // Notification Test
    const testNotifyBtn = document.getElementById('testNotificationsBtn');
    if (testNotifyBtn) {
        testNotifyBtn.addEventListener('click', testNotifications);
    }

    // Master Backup (Hard Copy)
    const masterBtn = document.getElementById('masterBackupBtn');
    if (masterBtn) {
        masterBtn.onclick = (e) => {
            e.preventDefault();
            console.log('ğŸ›¡ï¸ Master Backup button clicked');
            // 1. JSON Backup (Safest)
            backupToDaVinciArchive();
            // 2. Excel Backup (Classic)
            setTimeout(() => {
                exportToExcel();
                showToast('ğŸ›¡ï¸ Master Yedek (Excel + ArÅŸiv) baÅŸarÄ±yla oluÅŸturuldu!', 'success');
            }, 1000);
        };
    }
}

// ==========================================
// Specialized Modals (Detail View)
// ==========================================

function showDetailModal(o) {
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const status = getStatus(o.deadline, o.status);

    // Safe date for input field
    let deadlineISO = '';
    try {
        const d = convertToDate(o.deadline);
        if (!isNaN(d.getTime())) {
            deadlineISO = d.toISOString().split('T')[0];
        } else {
            deadlineISO = new Date().toISOString().split('T')[0];
        }
    } catch (e) {
        deadlineISO = new Date().toISOString().split('T')[0];
    }

    title.textContent = 'Yükümlülük Detayı';
    body.innerHTML = `
        <div class="premium-detail-panel">
            <header class="panel-hero">
                <div class="hero-labels">
                    <span class="status-badge ${status}">${getStatusLabel(status)}</span>
                    ${o.status === 'completed' ? '<span class="status-badge success">✅ Tamamlandı</span>' : ''}
                </div>
                <h1 class="hero-title">${o.projectLink ? `<a href="${o.projectLink}" target="_blank">${escapeHtml(o.projectName)}</a>` : escapeHtml(o.projectName)}</h1>
            </header>
            
            <div class="panel-grid-container">
                <!-- Project Metadata Card (Phase 4) -->
                ${getExpertInfoHtml(o.projectName)}

                <!-- Data Sheets Group -->
                <div class="data-grid">
                    <div class="glass-card">
                        <label>📂 YÜKÜMLÜLÜK TÜRÜ</label>
                        <p>${escapeHtml(o.obligationType)}</p>
                    </div>
                    <div class="glass-card">
                        <label>📅 SON TARİH</label>
                        <p>${formatDate(o.deadline)}</p>
                    </div>
                    <div class="glass-card">
                        <label>⏳ KALAN SÜRE</label>
                        <p class="${status}">${getStatusText(o.deadline, o.status)}</p>
                    </div>
                    <div class="glass-card">
                        <label>🛠️ İŞLEM DURUMU</label>
                        <p>${o.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}</p>
                    </div>
                </div>

                <!-- Description Block -->
                <div class="glass-card full-width">
                    <label>📝 DETAYLI AÇIKLAMA</label>
                    <div class="rich-text">
                        ${escapeHtml(o.obligationDescription)}
                    </div>
                </div>

                <!-- Messaging Engine -->
                <div class="chat-section">
                    <div class="section-title">
                        <span>💬 Yorumlar & Yazışmalar</span>
                    </div>
                    <div id="commentsThread" class="chat-thread">
                        ${(o.comments || []).length > 0 ? o.comments.map(c => `
                            <div class="chat-bubble">
                                <div class="bubble-meta">
                                    <span class="user">${escapeHtml(c.user.split('@')[0])}</span>
                                    <span class="time">${new Date(c.timestamp).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div class="bubble-text">${escapeHtml(c.text)}</div>
                            </div>
                        `).join('') : '<p class="no-data">Henüz yazışma bulunmuyor.</p>'}
                    </div>
                    <div class="chat-input-wrapper">
                        <textarea id="commentReplyInput" placeholder="Mesajınızı buraya yazın..." rows="2"></textarea>
                        <button id="sendCommentBtn" class="premium-btn">
                            <span>🚀</span> Gönder
                        </button>
                    </div>
                </div>

                <!-- Date Adjustment UI (Hidden by toggle) -->
                <div id="editDateContainer" class="glass-card edit-panel">
                    <label>Tarihi Güncelle</label>
                    <div class="inline-form">
                        <input type="date" id="newDeadlineInput" class="glass-input" value="${deadlineISO}">
                        <button id="confirmDateBtn" class="premium-btn small">Güncelle</button>
                    </div>
                </div>
            </div>

            <footer class="panel-actions">
                ${o.status !== 'completed' ? `
                    <button id="markCompleteBtn" class="premium-btn success-btn">
                        <span>✅</span> Tamamlandı Olarak İşaretle
                    </button>
                ` : `
                    <button id="markPendingBtn" class="premium-btn warning-btn">
                        <span>🔄</span> Bekleyene Al
                    </button>
                `}
                <button id="toggleEditDateBtn" class="premium-btn secondary-btn">
                    <span>📅</span> Tarihi Değiştir
                </button>
            </footer>

            <div class="panel-footer-meta">
                <span>Oluşturulma: ${new Date(o.createdAt).toLocaleString('tr-TR')}</span>
                ${o.updatedBy ? `<span> • Son Güncelleme: ${o.updatedBy}</span>` : ''}
            </div>

        </div>
    `;

    // Add Action Listeners with optional chaining to prevent errors
    document.getElementById('markCompleteBtn')?.addEventListener('click', () => {
        updateObligationStatus(o.id, 'completed');
        modal.classList.remove('show');
    });

    document.getElementById('markPendingBtn')?.addEventListener('click', () => {
        updateObligationStatus(o.id, 'pending');
        modal.classList.remove('show');
    });

    document.getElementById('toggleEditDateBtn')?.addEventListener('click', () => {
        document.getElementById('editDateContainer')?.classList.toggle('active');
    });

    document.getElementById('confirmDateBtn')?.addEventListener('click', () => {
        const newDate = document.getElementById('newDeadlineInput').value;
        if (newDate) {
            updateObligationDeadline(o.id, new Date(newDate));
            modal.classList.remove('show');
        }
    });

    document.getElementById('sendCommentBtn')?.addEventListener('click', () => {
        const text = document.getElementById('commentReplyInput').value.trim();
        if (text) {
            updateObligationComment(o.id, text);
            // Don't close modal, just refresh the detail view or re-render comments
            const oUpdated = Store.obligations.find(item => item.id == o.id);
            if (oUpdated) showDetailModal(oUpdated);
        }
    });

    // Initialize Emoji Picker for Comment Reply
    setTimeout(() => initEmojiPicker('commentReplyInput'), 100);

    modal.classList.add('show');
}

/**
 * Adds a comment to an obligation
 */
function updateObligationComment(id, text) {
    const o = Store.obligations.find(item => item.id == id);
    if (o) {
        const newComment = {
            user: auth.currentUser?.email || 'Anonim',
            text: text,
            timestamp: new Date().toISOString()
        };

        const comments = Array.isArray(o.comments) ? [...o.comments] : [];
        comments.push(newComment);

        const success = Store.updateObligation(id, { comments });
        if (success && saveData()) {
            showToast('Yorum gönderildi! 🚀', 'success');
        }
    }
}

/**
 * Updates an obligation's status
 */
function updateObligationStatus(id, newStatus) {
    const success = Store.updateObligation(id, {
        status: newStatus,
        updatedBy: auth.currentUser?.email || 'Unknown'
    });

    if (success) {
        if (saveData()) {
            refreshAllViews();
            showToast(newStatus === 'completed' ? 'Yükümlülük tamamlandı! 🎉' : 'Yükümlülük bekleyene alındı.', 'success');
        }
    }
}

/**
 * Updates an obligation's deadline
 */
function updateObligationDeadline(id, newDate) {
    const success = Store.updateObligation(id, {
        deadline: newDate,
        updatedBy: auth.currentUser?.email || 'Unknown'
    });

    if (success) {
        if (saveData()) {
            refreshAllViews();
            showToast('Tarih başarıyla güncellendi.', 'success');
        }
    }
}

function showProjectModal(projectName, obligations) {
    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    // Also fetch jobs for this project
    const jobs = Store.jobs.filter(j => j.project === projectName);

    // Filtering: Show only future obligations (or today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter out past obligations (keep if deadline is today or future, OR if it's already completed just to show recent? User said "future ones". Let's stick to >= today)
    // Actually, user said: "current date -> future". So hide items having deadline < today.
    // However, we might want to see Completed items? The user implied seeing relevant ones.
    // Let's filter: deadline >= today.
    const filteredObs = obligations.filter(o => {
        const d = new Date(o.deadline);
        return d >= today;
    });

    // Sorting: Date (Ascending) - Closest first
    const sortedObs = [...filteredObs].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const sortedJobs = [...jobs].sort((a, b) => new Date(a.dueDate || '2100-01-01') - new Date(b.dueDate || '2100-01-01'));

    title.textContent = projectName;
    body.innerHTML = `
        <div class="project-detail">
            ${getExpertInfoHtml(projectName)}

            <div class="project-sections-grid">
                <!-- Obligations Section -->
                <div class="project-section">
                    <h3 class="section-header">
                        <span>📜</span> Yükümlülükler (${sortedObs.length})
                    </h3>
                    <div class="project-list-container">
                        ${sortedObs.length > 0 ? sortedObs.map(o => `
                            <div class="project-item-card status-${getStatus(o.deadline, o.status)}" onclick="window.openLinkedObligation('${o.id}')">
                                <div class="item-header">
                                    <span class="type-badge">${escapeHtml(o.obligationType)}</span>
                                    <div class="header-right-group">
                                        <span class="date-badge">${formatDate(o.deadline)}</span>
                                        <div class="mini-status-toggle ${o.status === 'completed' ? 'checked' : ''}" 
                                             onclick="event.stopPropagation(); window.toggleProjectObStatus('${o.id}')"
                                             title="Durumu Değiştir">
                                            ${o.status === 'completed' ? '✓' : ''}
                                        </div>
                                    </div>
                                </div>
                                <p class="item-desc">${escapeHtml(o.obligationDescription)}</p>
                                <div class="item-footer">
                                    <span class="status-text">${getStatusLabel(getStatus(o.deadline, o.status))}</span>
                                </div>
                            </div>
                        `).join('') : '<p class="empty-text">Bu projeye ait yükümlülük bulunmuyor.</p>'}
                    </div>
                </div>

                <!-- Jobs Section -->
                <div class="project-section">
                    <h3 class="section-header">
                        <span>💼</span> İşler / Görevler (${sortedJobs.length})
                    </h3>
                    <div class="project-list-container">
                        ${sortedJobs.length > 0 ? sortedJobs.map(j => `
                            <div class="project-item-card job-card-mini ${j.status}" onclick="window.openLinkedJob('${j.id}')">
                                <div class="item-header">
                                    <span class="priority-dot priority-${j.priority}"></span>
                                    <div class="header-right-group">
                                        <div class="assignee-mini">
                                            ${Store.getUserPhoto(j.assignee) ? `<img src="${Store.getUserPhoto(j.assignee)}">` : '👤'}
                                        </div>
                                        <div class="mini-status-toggle ${j.status === 'completed' ? 'checked' : ''}" 
                                             onclick="event.stopPropagation(); window.toggleProjectJobStatus('${j.id}')"
                                             title="Durumu Değiştir">
                                            ${j.status === 'completed' ? '✓' : ''}
                                        </div>
                                    </div>
                                </div>
                                <span class="job-title">${escapeHtml(j.title)}</span>
                                <div class="item-footer">
                                    <span class="date-badge">${j.dueDate ? formatDate(j.dueDate) : 'Tarihsiz'}</span>
                                </div>
                            </div>
                        `).join('') : '<p class="empty-text">Bu projeye atanmış iş bulunmuyor.</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
    modal.classList.add('show');
}

// Helper to open job from project modal
window.openLinkedJob = function (id) {
    const job = Store.jobs.find(j => j.id == id);
    if (job) {
        window.dispatchEvent(new CustomEvent('show-job-detail', { detail: { id } }));
    }
};


// Quick Actions for Project Modal
window.toggleProjectObStatus = function (id) {
    const o = Store.obligations.find(x => x.id == id);
    if (o) {
        const newStatus = o.status === 'completed' ? 'pending' : 'completed';
        updateObligationStatus(id, newStatus);

        // Confetti if completing
        if (newStatus === 'completed') {
            const card = document.querySelector(`.project-item-card[onclick*="${id}"]`);
            const btn = card?.querySelector('.mini-status-toggle');
            if (btn) {
                const rect = btn.getBoundingClientRect();
                triggerConfetti(rect.left + 10, rect.top + 10);
            }
        }

        // Refresh modal if open
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle && modalTitle.textContent === o.projectName) {
            // Re-open/Refresh modal with latest data
            const updatedObs = Store.obligations.filter(x => x.projectName === o.projectName);
            // Delay slightly to let confetti trigger
            setTimeout(() => showProjectModal(o.projectName, updatedObs), 50);
        }
    }
};

window.toggleProjectJobStatus = function (id) {
    const j = Store.jobs.find(x => x.id == id);
    if (j) {
        // Use existing toggle logic but handle refresh manually if needed
        const newStatus = j.status === 'completed' ? 'pending' : 'completed';
        Store.updateJob(id, {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date() : null,
            updatedBy: auth.currentUser?.email
        });
        saveData();
        updateJobsView(); // Update background list
        showToast('İş durumu güncellendi.', 'success');

        // Confetti if completing
        if (newStatus === 'completed') {
            const card = document.querySelector(`.project-item-card[onclick*="${id}"]`);
            const btn = card?.querySelector('.mini-status-toggle');
            if (btn) {
                const rect = btn.getBoundingClientRect();
                triggerConfetti(rect.left + 10, rect.top + 10);
            }
        }

        // Refresh modal
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle && modalTitle.textContent === j.project) {
            const updatedObs = Store.obligations.filter(x => x.projectName === j.project);
            setTimeout(() => showProjectModal(j.project, updatedObs), 50);
        }
    }
};


// Simple JS Confetti implementation
function triggerConfetti(x, y) {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.classList.add('confetti-particle');
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';

        // Random direction
        const angle = Math.random() * 360;
        const velocity = 50 + Math.random() * 100;
        const tx = Math.cos(angle * Math.PI / 180) * velocity;
        const ty = Math.sin(angle * Math.PI / 180) * velocity;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        document.body.appendChild(particle);

        // Remove after animation
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}

