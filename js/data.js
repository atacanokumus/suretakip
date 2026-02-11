/**
 * Data management module for EPDK Süre Takip Platformu
 */

import { Store } from './store.js';
import {
    validateString, validateDate, parseExcelDate, generateId, formatDate, convertToDate, getStatus
} from './utils.js';
import { showToast } from './ui.js';
import { EMBEDDED_DATA } from '../embeddedData.js';

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
        const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
        if (sizeInMB > MAX_STORAGE_SIZE_MB) {
            console.warn(`Veri boyutu uyarısı: ${sizeInMB.toFixed(2)}MB`);
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
export async function syncToFirestore() {
    if (!auth.currentUser) return;

    try {
        const dataRef = doc(db, "daVinciData", "master");
        await setDoc(dataRef, {
            obligations: Store.obligations,
            jobs: Store.jobs || [],
            projects: Store.projects || [],
            // Users are stored in a separate collection
            lastUpdate: new Date().toISOString(),
            updatedBy: auth.currentUser.email
        });
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

    const dataRef = doc(db, "daVinciData", "master");
    onSnapshot(dataRef, (doc) => {
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

                localStorage.setItem('epdk_lastUpdate', data.lastUpdate);
                window.dispatchEvent(new CustomEvent('data-refreshed'));
            }
        }
    });
}

// ==========================================
// Data Migration Logic
// ==========================================

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

export function saveData(syncWithCloud = true) {
    const success = safeSetStorage(STORAGE_KEY, Store.obligations);
    if (success) {
        safeSetStorage('epdk_jobs', Store.jobs); // Also save jobs
        safeSetStorage('epdk_projects', Store.projects); // And projects
        localStorage.setItem('epdk_lastUpdate', new Date().toISOString());

        // Trigger global UI refresh (Phase 4)
        window.dispatchEvent(new CustomEvent('data-refreshed'));

        if (syncWithCloud && auth.currentUser) {
            syncToFirestore();
            // Backup reminder (Hard Copy Support)
            const lastBackup = localStorage.getItem('epdk_lastBackup');
            const now = new Date();
            if (!lastBackup || (now - new Date(lastBackup)) > 1000 * 60 * 60 * 24) {
                showToast('🛡️ Veriler senkronize edildi. Bir yerel Excel yedeği (Hard Copy) almak ister misiniz?', 'info');
            }
        }
    }
    return success;
    return success;
}

export function clearAllData() {
    Store.clear();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('epdk_jobs');
    localStorage.removeItem('epdk_projects');
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
                    const excelStatus = row[5] ? String(row[5]).trim().toLowerCase() : null;

                    if (projectName && dateResult.valid) {
                        // Smart Logic: Check if this item already exists and is 'completed'
                        const existing = Store.obligations.find(ex =>
                            ex.projectName === projectName &&
                            ex.obligationType === obligationType &&
                            formatDate(ex.deadline) === formatDate(dateResult.date)
                        );

                        let finalStatus = 'pending';
                        if (existing && existing.status === 'completed') {
                            finalStatus = 'completed';
                        } else if (excelStatus === 'completed' || excelStatus === 'tamamlandı' || excelStatus === 'tamam') {
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
