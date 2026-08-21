/**
 * Data management module for EPDK Süre Takip Platformu
 */

import { Store } from './store.js';
import {
    validateString, validateDate, parseExcelDate, generateId, formatDate, convertToDate, getStatus
} from './utils.js';
import { showToast } from './ui.js';
import { EMBEDDED_DATA } from '../embeddedData.js';
import { DEFAULT_WORKFLOWS } from './default_workflows.js';
import { TEA_SEED_DATA } from './tea_seed_data.js';

import { db, auth } from './firebase-config.js';
import {
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STORAGE_KEY = 'epdk_obligations';
const MAX_STORAGE_SIZE_MB = 5;
let unsubscribeFirestore = null;

export const DEFAULT_TEA_FEE_SETTINGS = {
    lastMwRate: 5800, newMwRate: 11600, vatRate: 0.20,
    recipientName: 'Tübitak Bilgem',
    bankBranch: 'Türkiye Cumhuriyeti Ziraat Bankası A.Ş. Gebze Kurumsal Şube',
    iban: 'TR96 0001 0020 8534 7551 9667 26'
};

// Set once this client has read the TEA collections back from Firestore (or
// legitimately established that there are none). Until then syncToFirestore
// leaves those fields untouched rather than overwriting them with an empty
// Store - see the guard in syncToFirestore.
let teaLoaded = false;

// ==========================================
// Safe Storage Operations
// ==========================================

export function safeGetStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        logError('LocalStorage okuma hatası', error, { key });
        return null;
    }
}

export function safeSetStorage(key, value) {
    try {
        const serialized = JSON.stringify(value);
        // Approximate the byte size from the string length instead of building a
        // Blob - the Blob copied the whole payload a second time on every save.
        const sizeInMB = serialized.length / (1024 * 1024);
        if (sizeInMB > MAX_STORAGE_SIZE_MB) {
            console.warn(`Veri boyutu uyarısı: ~${sizeInMB.toFixed(2)}MB`);
        }
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            showToast('Depolama alanı dolu! Eski verileri temizlemeyi deneyin.', 'error');
        } else {
            showToast('Veri kaydedilemedi. Lütfen tekrar deneyin.', 'error');
        }
        return false;
    }
}

export function logError(context, error, additionalData = {}) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        context,
        message: error.message,
        stack: error.stack,
        ...additionalData
    };
    console.error('Hata Detayı:', errorLog);
    try {
        const errors = JSON.parse(localStorage.getItem('epdk_error_log') || '[]');
        errors.unshift(errorLog);
        localStorage.setItem('epdk_error_log', JSON.stringify(errors.slice(0, 10)));
    } catch (e) { }
}

// ==========================================
// Firestore Sync Logic
// ==========================================

/**
 * Saves current store data to Firestore
 */
export async function syncToFirestore(customTimestamp) {
    if (!auth.currentUser) return;

    try {
        const dataRef = doc(db, "daVinciData", "master");
        const ts = customTimestamp || new Date().toISOString();
        const payload = {
            obligations: Store.obligations,
            jobs: Store.jobs || [],
            projects: Store.projects || [],
            workflows: Store.workflows || {},
            // Users are stored in a separate collection
            lastUpdate: ts,
            updatedBy: auth.currentUser.email
        };

        // Only send the TEA collections once this client has actually read them
        // back from Firestore. Without this guard a client that saved something
        // else (an obligation, a job) before its TEA load finished would push an
        // empty array over everyone's records - which is exactly how the 80
        // linked TEA applications were wiped on 2026-08-20.
        if (teaLoaded) {
            payload.teaApplications = Store.teaApplications || [];
            payload.teaFeeSettings = Store.teaFeeSettings || DEFAULT_TEA_FEE_SETTINGS;
        }

        // merge:true so a field this build doesn't know about is left alone
        // instead of being deleted. A plain setDoc replaces the whole document,
        // so any teammate still running an older build would silently drop
        // fields added after their build - the root cause of the same incident.
        await setDoc(dataRef, payload, { merge: true });
        if (!customTimestamp) {
            localStorage.setItem('epdk_lastUpdate', ts);
        }
        return true;
    } catch (error) {
        logError('Firestore yazma hatası', error);
        return false;
    }
}

/**
 * Initializes real-time listener for Firestore
 */
export function initFirestoreSync() {
    if (!auth.currentUser) return;

    if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
    }

    const dataRef = doc(db, "daVinciData", "master");
    unsubscribeFirestore = onSnapshot(dataRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();

            // Sync Logic
            const lastLocalUpdate = localStorage.getItem('epdk_lastUpdate');
            const cloudUpdate = new Date(data.lastUpdate);
            const localUpdate = lastLocalUpdate ? new Date(lastLocalUpdate) : new Date(0);

            if (cloudUpdate > localUpdate) {
                // 1. Sync Obligations
                if (data.obligations) {
                    const parsedObligations = data.obligations.map(o => ({
                        ...o,
                        deadline: convertToDate(o.deadline),
                        createdAt: convertToDate(o.createdAt),
                        updatedAt: convertToDate(o.updatedAt)
                    }));
                    Store.setObligations(parsedObligations);
                    safeSetStorage(STORAGE_KEY, parsedObligations);
                }

                // 2. Sync Jobs (New Phase 2)
                if (data.jobs) {
                    const parsedJobs = data.jobs.map(j => ({
                        ...j,
                        dueDate: j.dueDate ? convertToDate(j.dueDate) : null,
                        createdAt: convertToDate(j.createdAt),
                        updatedAt: convertToDate(j.updatedAt),
                        completedAt: j.completedAt ? convertToDate(j.completedAt) : null,
                        history: (j.history || []).map(h => ({ ...h, date: convertToDate(h.date) }))
                    }));
                    Store.setJobs(parsedJobs);
                    safeSetStorage('epdk_jobs', parsedJobs);
                }

                // 3. Sync Projects (Phase 3)
                if (data.projects) {
                    Store.setProjects(data.projects);
                    safeSetStorage('epdk_projects', data.projects);
                }

                // 4. Sync Workflow Definitions (editable via the workflow builder)
                if (data.workflows) {
                    Store.setWorkflows(data.workflows);
                    safeSetStorage('epdk_workflows', data.workflows);
                }

                // 5. Sync TEA Applications (TÜBİTAK RAPSİM)
                if (data.teaApplications) {
                    Store.setTeaApplications(data.teaApplications);
                    safeSetStorage('epdk_teaApplications', data.teaApplications);
                    teaLoaded = true;
                }

                // 6. Sync TEA Fee Calculator unit prices
                if (data.teaFeeSettings) {
                    Store.setTeaFeeSettings(data.teaFeeSettings);
                    safeSetStorage('epdk_teaFeeSettings', data.teaFeeSettings);
                }

                localStorage.setItem('epdk_lastUpdate', data.lastUpdate);
                window.dispatchEvent(new CustomEvent('data-refreshed'));
            }
        }
    });
}

// ==========================================
// Data Migration Logic
// ==========================================

/**
 * One-time patch: "Önlisans Süre Uzatımı" and "Tesis Tamamlama Süre Uzatımı"
 * used to have an "EPDK_BASVURU_HAZIRLIK" (Başvuru Hazırlık) step right after
 * GD Kontrol - replaced with a "ZK_KONTROL" (ZK Kontrol) step at the same
 * position. Store.workflows is Firestore-backed and was already seeded
 * before this change shipped, so editing DEFAULT_WORKFLOWS alone wouldn't
 * reach it - this patches the live copy in place and persists, the same way
 * the TEA "result" field backfill below does. Same array position -> no
 * job.steps remapping needed (keyed by position, not type).
 */
function migrateBasvuruHazirlikToZkKontrol() {
    const titles = ['Önlisans Süre Uzatımı', 'Tesis Tamamlama Süre Uzatımı'];
    let migrated = false;
    titles.forEach(title => {
        const steps = Store.workflows[title];
        if (!steps) return;
        const idx = steps.findIndex(s => s.type === 'EPDK_BASVURU_HAZIRLIK');
        if (idx === -1) return;
        steps[idx] = { type: 'ZK_KONTROL', short: 'ZK Kontrol', long: `${idx + 1}. ZK Kontrolü` };
        migrated = true;
    });
    if (migrated) {
        safeSetStorage('epdk_workflows', Store.workflows);
        syncToFirestore().catch(err => logError('ZK Kontrol iş akışı geçişi hatası', err));
    }
}

export async function loadData() {
    // 1. First try Firestore (Source of Truth for the Team)
    if (auth.currentUser) {
        try {
            const dataRef = doc(db, "daVinciData", "master");
            const snapshot = await getDoc(dataRef);
            if (snapshot.exists()) {
                const data = snapshot.data();

                // Load Obligations
                if (data.obligations && data.obligations.length > 0) {
                    const obligations = data.obligations.map(o => ({
                        ...o,
                        deadline: convertToDate(o.deadline),
                        createdAt: convertToDate(o.createdAt),
                        updatedAt: convertToDate(o.updatedAt)
                    }));
                    Store.setObligations(obligations);
                    safeSetStorage(STORAGE_KEY, obligations);
                }

                // Load Jobs
                if (data.jobs && data.jobs.length > 0) {
                    const jobs = data.jobs.map(j => ({
                        ...j,
                        dueDate: j.dueDate ? convertToDate(j.dueDate) : null,
                        createdAt: convertToDate(j.createdAt),
                        updatedAt: convertToDate(j.updatedAt),
                        completedAt: j.completedAt ? convertToDate(j.completedAt) : null,
                        history: (j.history || []).map(h => ({ ...h, date: convertToDate(h.date) }))
                    }));
                    Store.setJobs(jobs);
                    safeSetStorage('epdk_jobs', jobs);
                }

                // Load Projects
                if (data.projects && data.projects.length > 0) {
                    Store.setProjects(data.projects);
                    safeSetStorage('epdk_projects', data.projects);
                }

                // Load Workflow Definitions. If this Firestore document
                // predates the workflow builder, there's no "workflows" field
                // yet - seed it once from the built-in defaults and persist,
                // so every subsequent load (and every teammate) reads the same
                // editable copy instead of re-seeding independently.
                if (data.workflows && Object.keys(data.workflows).length > 0) {
                    Store.setWorkflows(data.workflows);
                    safeSetStorage('epdk_workflows', data.workflows);
                } else {
                    Store.setWorkflows({ ...DEFAULT_WORKFLOWS });
                    safeSetStorage('epdk_workflows', Store.workflows);
                    syncToFirestore().catch(err => logError('İş akışı tohumlama hatası', err));
                }
                migrateBasvuruHazirlikToZkKontrol();

                // Load TEA Applications. If this Firestore document predates the
                // TEA Başvuruları feature, there's no "teaApplications" field yet -
                // seed it once from the historical Excel import and persist, so
                // every subsequent load reads the same shared copy.
                if (data.teaApplications && data.teaApplications.length > 0) {
                    Store.setTeaApplications(data.teaApplications);
                    safeSetStorage('epdk_teaApplications', data.teaApplications);

                    // One-time backfill: some teammates already loaded the app
                    // after teaApplications was first seeded but before the
                    // "result" (olumlu/olumsuz) field existed, so their copy of
                    // the historical records is missing it. Patch the correct
                    // result back in by matching each record's seed id against
                    // TEA_SEED_DATA, and persist so everyone gets the fix
                    // without needing a fresh re-seed.
                    let backfilled = false;
                    const patched = Store.teaApplications.map(t => {
                        if (t.result) return t;
                        const seedIdx = t.id && t.id.startsWith('tea_seed_') ? parseInt(t.id.slice('tea_seed_'.length), 10) - 1 : -1;
                        const seedMatch = seedIdx >= 0 ? TEA_SEED_DATA[seedIdx] : null;
                        backfilled = true;
                        return { ...t, result: (seedMatch && seedMatch.result) || 'pending' };
                    });
                    if (backfilled) {
                        Store.setTeaApplications(patched);
                        safeSetStorage('epdk_teaApplications', patched);
                        syncToFirestore().catch(err => logError('TEA sonuç alanı düzeltme hatası', err));
                    }
                } else if (!data.teaSeededAt) {
                    // No records and this document has never been seeded: import
                    // the historical Excel data once. Keyed off teaSeededAt (not
                    // off the array being missing) so that an empty array is
                    // still handled - an empty array used to match neither this
                    // branch nor the one above, leaving the page permanently
                    // blank with no way to recover.
                    const seeded = TEA_SEED_DATA.map((item, idx) => ({
                        id: `tea_seed_${idx + 1}`,
                        projectName: item.projectName,
                        monthYear: item.monthYear,
                        label: item.label,
                        result: item.result || 'pending',
                        mfilesLink: '',
                        notes: '',
                        createdAt: new Date().toISOString(),
                        createdBy: null
                    }));
                    Store.setTeaApplications(seeded);
                    safeSetStorage('epdk_teaApplications', seeded);
                    teaLoaded = true;
                    setDoc(doc(db, "daVinciData", "master"), { teaSeededAt: new Date().toISOString() }, { merge: true })
                        .catch(err => logError('TEA tohumlama işareti yazılamadı', err));
                    syncToFirestore().catch(err => logError('TEA başvuruları tohumlama hatası', err));
                } else {
                    // Seeded before and genuinely empty (everything deleted by
                    // hand) - respect that instead of resurrecting the records.
                    Store.setTeaApplications([]);
                    safeSetStorage('epdk_teaApplications', []);
                }
                teaLoaded = true;

                // Load TEA Fee Calculator unit prices, if already customized.
                if (data.teaFeeSettings) {
                    Store.setTeaFeeSettings(data.teaFeeSettings);
                    safeSetStorage('epdk_teaFeeSettings', data.teaFeeSettings);
                }

                initFirestoreSync();
                // Also fetch users
                await fetchUsers();
                return { obligations: Store.obligations, jobs: Store.jobs, users: Store.users };
            }
        } catch (error) {
            logError('Firestore yükleme hatası', error);
        }
    }

    // 2. Fallback to LocalStorage
    try {
        // Load Obligations
        const savedObs = safeGetStorage(STORAGE_KEY);
        if (savedObs && Array.isArray(savedObs)) {
            const obligations = savedObs.map(o => ({
                ...o,
                deadline: convertToDate(o.deadline),
                createdAt: convertToDate(o.createdAt),
                updatedAt: convertToDate(o.updatedAt)
            }));
            Store.setObligations(obligations);
        }

        // Load Jobs
        const savedJobs = safeGetStorage('epdk_jobs');
        if (savedJobs && Array.isArray(savedJobs)) {
            const jobs = savedJobs.map(j => ({
                ...j,
                dueDate: j.dueDate ? convertToDate(j.dueDate) : null,
                createdAt: convertToDate(j.createdAt),
                updatedAt: convertToDate(j.updatedAt),
                completedAt: j.completedAt ? convertToDate(j.completedAt) : null,
                history: (j.history || []).map(h => ({ ...h, date: convertToDate(h.date) }))
            }));
            Store.setJobs(jobs);
        }

        // Load Projects
        const savedProjects = safeGetStorage('epdk_projects');
        if (savedProjects && Array.isArray(savedProjects)) {
            Store.setProjects(savedProjects);
        }

        // Load Workflow Definitions
        const savedWorkflows = safeGetStorage('epdk_workflows');
        if (savedWorkflows && Object.keys(savedWorkflows).length > 0) {
            Store.setWorkflows(savedWorkflows);
        } else {
            Store.setWorkflows({ ...DEFAULT_WORKFLOWS });
        }
        migrateBasvuruHazirlikToZkKontrol();

        // Load TEA Applications
        const savedTeaApplications = safeGetStorage('epdk_teaApplications');
        if (savedTeaApplications && Array.isArray(savedTeaApplications)) {
            Store.setTeaApplications(savedTeaApplications);
            teaLoaded = true;
        }

        // Load TEA Fee Calculator unit prices
        const savedTeaFeeSettings = safeGetStorage('epdk_teaFeeSettings');
        if (savedTeaFeeSettings) {
            Store.setTeaFeeSettings(savedTeaFeeSettings);
        }

        if (Store.obligations.length > 0 && auth.currentUser) initFirestoreSync();
        return { obligations: Store.obligations, jobs: Store.jobs };

    } catch (error) {
        logError('LocalStorage yükleme hatası', error);
    }

    // 3. Fallback to Embedded Project Data (Demo/Initial Data)
    if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.length > 0) {
        loadEmbeddedData();
    }

    if (auth.currentUser) initFirestoreSync();
    return { obligations: Store.obligations, jobs: Store.jobs };
}

export function loadEmbeddedData() {
    if (!EMBEDDED_DATA) return;

    const obligations = EMBEDDED_DATA.map(item => ({
        id: item.id || generateId(),
        projectName: item.projectName,
        projectLink: item.projectLink,
        obligationType: item.obligationType,
        obligationDescription: item.obligationDescription,
        deadline: parseExcelDate(item.deadline),
        notes: item.notes,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    })).filter(o => o.deadline !== null);

    Store.setObligations(obligations);
    saveData(false); // Don't push demo data to cloud automatically
}

// Rapid successive edits (ticking several matrix cells, typing a date) used to
// fire one full-document Firestore write each. Coalesce them into a single
// write shortly after the user stops - local state and the UI update instantly.
const CLOUD_SYNC_DEBOUNCE_MS = 800;
let cloudSyncTimer = null;
let backupReminderShown = false;

function scheduleCloudSync() {
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
        cloudSyncTimer = null;
        // Reuse the timestamp already written to localStorage so the onSnapshot
        // listener recognises this write as our own and skips the echo re-render.
        syncToFirestore(localStorage.getItem('epdk_lastUpdate') || new Date().toISOString());
    }, CLOUD_SYNC_DEBOUNCE_MS);
}

/** Flushes any pending cloud write immediately (e.g. before logout/unload). */
export function flushCloudSync() {
    if (!cloudSyncTimer) return;
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
    return syncToFirestore(localStorage.getItem('epdk_lastUpdate') || new Date().toISOString());
}

export function saveData(syncWithCloud = true) {
    const success = safeSetStorage(STORAGE_KEY, Store.obligations);
    if (success) {
        safeSetStorage('epdk_jobs', Store.jobs); // Also save jobs
        safeSetStorage('epdk_projects', Store.projects); // And projects
        safeSetStorage('epdk_teaApplications', Store.teaApplications); // And TEA applications
        safeSetStorage('epdk_teaFeeSettings', Store.teaFeeSettings); // And TEA fee calculator unit prices
        const timestamp = new Date().toISOString();
        localStorage.setItem('epdk_lastUpdate', timestamp);

        // Trigger global UI refresh (Phase 4)
        window.dispatchEvent(new CustomEvent('data-refreshed'));

        if (syncWithCloud && auth.currentUser) {
            scheduleCloudSync();
            // Backup reminder (Hard Copy Support) - once per session, not on
            // every save, which previously spawned a toast on each click.
            if (!backupReminderShown) {
                const lastBackup = localStorage.getItem('epdk_lastBackup');
                const now = new Date();
                if (!lastBackup || (now - new Date(lastBackup)) > 1000 * 60 * 60 * 24) {
                    backupReminderShown = true;
                    showToast('🛡️ Veriler senkronize edildi. Bir yerel Excel yedeği (Hard Copy) almak ister misiniz?', 'info');
                }
            }
        }
    }
    return success;
}

// Don't lose a debounced write if the tab is closed mid-edit.
window.addEventListener('beforeunload', () => {
    if (cloudSyncTimer) flushCloudSync();
});

export function clearAllData() {
    Store.clear();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('epdk_jobs');
    localStorage.removeItem('epdk_projects');
    localStorage.removeItem('epdk_teaApplications');
    localStorage.removeItem('epdk_lastUpdate');
}

// ==========================================
// Excel Operations
// ==========================================

export function handleExcelImport(file, callback) {
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => showToast('Dosya okunamadı.', 'error');
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            const isHeaderRow = (row) => {
                if (!row || row.length === 0) return false;
                const firstCell = String(row[0]).toLowerCase();
                return firstCell.includes('proje') || firstCell.includes('santral') || firstCell.includes('ad');
            };

            const parseProjectCell = (cell) => {
                const cellStr = String(cell);
                const hyperlinkMatch = cellStr.match(/=HYPERLINK\("([^"]+)"\s*,\s*"([^"]+)"\)/i);
                if (hyperlinkMatch) return { name: hyperlinkMatch[2], link: hyperlinkMatch[1] };
                return { name: cellStr, link: null };
            };

            const startRow = isHeaderRow(jsonData[0]) ? 1 : 0;
            const newObligations = [];
            let skippedRows = 0;

            for (let i = startRow; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || !row[0]) continue;

                try {
                    const projectCell = row[0] || '';
                    const { name: projectName, link: projectLink } = parseProjectCell(projectCell);
                    const obligationType = validateString(row[1], 200);
                    const obligationDescription = validateString(row[2], 500);
                    const dateResult = validateDate(row[3]);
                    const notes = validateString(row[4], 1000);

                    if (projectName && dateResult.valid) {
                        // Smart Logic: Check if this item already exists and is 'completed'
                        // Try strict match first (name + type + date)
                        let existing = Store.obligations.find(ex =>
                            ex.projectName === projectName &&
                            ex.obligationType === obligationType &&
                            formatDate(ex.deadline) === formatDate(dateResult.date)
                        );
                        // Fallback: match by name + type only (date format may differ)
                        if (!existing) {
                            existing = Store.obligations.find(ex =>
                                ex.projectName === projectName &&
                                ex.obligationType === obligationType &&
                                ex.status === 'completed'
                            );
                        }
                        // Fallback 2: case-insensitive project name match
                        if (!existing) {
                            existing = Store.obligations.find(ex =>
                                ex.projectName.trim().toLowerCase() === projectName.trim().toLowerCase() &&
                                ex.obligationType === obligationType &&
                                ex.status === 'completed'
                            );
                        }

                        // Check if ANY column contains exactly the completion keywords
                        const hasCompletedKeyword = row.some(cell => {
                            if (!cell) return false;
                            const s = String(cell).trim().toLowerCase();
                            return s === 'tamamlandı' || s === 'tamamlandi' || s === 'completed' || s === 'tamam';
                        });

                        let finalStatus = 'pending';
                        if (existing && existing.status === 'completed') {
                            finalStatus = 'completed';
                        } else if (hasCompletedKeyword) {
                            finalStatus = 'completed';
                        }

                        newObligations.push({
                            id: generateId(),
                            projectName: validateString(projectName, 200),
                            projectLink,
                            obligationType,
                            obligationDescription,
                            deadline: dateResult.date,
                            notes,
                            status: finalStatus,
                            comments: existing ? (existing.comments || []) : [],
                            createdAt: existing ? existing.createdAt : new Date(),
                            updatedAt: new Date()
                        });
                    } else {
                        skippedRows++;
                    }
                } catch (err) {
                    skippedRows++;
                }
            }

            Store.setObligations(newObligations);
            if (saveData()) {
                if (callback) callback();
                let message = `${newObligations.length} kayıt yüklendi`;
                if (skippedRows > 0) message += `. ${skippedRows} satır atlandı.`;
                showToast(message, 'success');
            }
        } catch (error) {
            showToast('Excel dosyası işlenirken hata oluştu.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

export function exportToExcel() {
    console.log('📊 exportToExcel started...');
    if (Store.obligations.length === 0) {
        showToast('Dışa aktarılacak veri yok', 'error');
        return;
    }

    try {
        const XLSX = window.XLSX;
        if (!XLSX) {
            console.error('❌ XLSX library not found in window scope!');
            showToast('Excel kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.', 'error');
            return;
        }

        const exportData = Store.obligations.map(o => {
            let commentsStr = (o.notes || '');
            if (Array.isArray(o.comments) && o.comments.length > 0) {
                const thread = o.comments.map(c => `[${formatDate(c.timestamp)} - ${c.user.split('@')[0]}]: ${c.text}`).join(' | ');
                commentsStr = commentsStr ? `${commentsStr} || Geçmiş: ${thread}` : thread;
            }

            return {
                'Proje': o.projectName,
                'Yükümlülük Türü': o.obligationType,
                'Yükümlülük': o.obligationDescription,
                'Son Tarih': formatDate(o.deadline),
                'Notlar': commentsStr,
                'Durum': getStatus(o.deadline, o.status) === 'completed' ? 'Tamamlandı' : 'Bekliyor'
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Yükümlülükler');
        XLSX.writeFile(wb, `EPDK_Sureler_${formatDate(new Date())}.xlsx`);
        console.log('✅ Excel export successful');
        showToast('Excel dosyası indirildi', 'success');
    } catch (error) {
        console.error('❌ Export error:', error);
        showToast('Dışa aktarma sırasında bir hata oluştu.', 'error');
    }
}

/**
 * Creates a "Master System Backup" (Hard Copy) in JSON format.
 * This is more reliable for data recovery than Excel.
 */
export function backupToDaVinciArchive() {
    console.log('🛡️ backupToDaVinciArchive started...');
    if (Store.obligations.length === 0) {
        showToast('Yedeklenecek veri yok', 'error');
        return;
    }

    try {
        const backupData = {
            version: "2.0",
            exportDate: new Date().toISOString(),
            createdBy: auth.currentUser?.email || 'System',
            data: {
                obligations: Store.obligations,
                jobs: Store.jobs || []
            }
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `DaVinci_Master_Yedek_${formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        localStorage.setItem('epdk_lastBackup', new Date().toISOString());
        console.log('✅ JSON backup successful');
        showToast('🛡️ Master Sistem Yedeği indirildi!', 'success');
    } catch (error) {
        console.error('❌ Backup error:', error);
        showToast('Yedek oluşturulurken bir hata oluştu.', 'error');
    }
}

/**
 * Fetches all users from the 'users' collection
 */
export async function fetchUsers() {
    try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const users = [];
        snapshot.forEach(doc => {
            users.push(doc.data());
        });

        if (users.length > 0) {
            Store.setUsers(users);
            console.log('👥 Users loaded:', users.length);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

/**
 * Saves or updates a user profile
 */
export async function saveUserProfile(profile) {
    if (!profile.email) return false;

    // Sanitize email for ID lookup
    try {
        const userRef = doc(db, "users", profile.email);
        await setDoc(userRef, {
            ...profile,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        // Update local store immediately
        const existingIndex = Store.users.findIndex(u => u.email === profile.email);
        if (existingIndex >= 0) {
            Store.users[existingIndex] = { ...Store.users[existingIndex], ...profile };
        } else {
            Store.users.push(profile);
        }

        return true;
    } catch (error) {
        console.error('Error saving user profile:', error);
        return false;
    }
}
