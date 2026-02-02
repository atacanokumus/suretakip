/**
 * Data management module for EPDK Süre Takip Platformu
 */

import { Store } from './store.js';
import {
    validateString, validateDate, parseExcelDate, generateId, formatDate
} from './utils.js';
import { showToast } from './ui.js';

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
// Data Migration Logic
// ==========================================

export function loadData() {
    try {
        const saved = safeGetStorage(STORAGE_KEY);
        if (saved && Array.isArray(saved)) {
            const obligations = saved.map(o => {
                try {
                    return {
                        ...o,
                        projectName: validateString(o.projectName, 200),
                        obligationType: validateString(o.obligationType, 200),
                        obligationDescription: validateString(o.obligationDescription, 500),
                        notes: validateString(o.notes, 1000),
                        deadline: new Date(o.deadline),
                        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
                        updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date()
                    };
                } catch (e) {
                    return null;
                }
            }).filter(o => o !== null && o.deadline && !isNaN(o.deadline.getTime()));
            Store.setObligations(obligations);
        } else if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.length > 0) {
            loadEmbeddedData();
        }
    } catch (error) {
        logError('loadData', error);
        if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.length > 0) {
            loadEmbeddedData();
        }
    }
    return Store.obligations;
}

export function loadEmbeddedData() {
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
    saveData();
}

export function saveData() {
    const success = safeSetStorage(STORAGE_KEY, Store.obligations);
    if (success) {
        try {
            localStorage.setItem('epdk_lastUpdate', new Date().toISOString());
        } catch (e) { }
    }
    return success;
}

export function clearAllData() {
    Store.clear();
    localStorage.removeItem(STORAGE_KEY);
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
                        newObligations.push({
                            id: generateId(),
                            projectName: validateString(projectName, 200),
                            projectLink,
                            obligationType,
                            obligationDescription,
                            deadline: dateResult.date,
                            notes,
                            status: 'pending',
                            createdAt: new Date(),
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
    if (Store.obligations.length === 0) {
        showToast('Dışa aktarılacak veri yok', 'error');
        return;
    }

    const exportData = Store.obligations.map(o => ({
        'Proje': o.projectName,
        'Yükümlülük Türü': o.obligationType,
        'Yükümlülük': o.obligationDescription,
        'Son Tarih': formatDate(o.deadline),
        'Notlar': o.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yükümlülükler');
    XLSX.writeFile(wb, `EPDK_Sureler_${formatDate(new Date())}.xlsx`);
    showToast('Excel dosyası indirildi', 'success');
}
