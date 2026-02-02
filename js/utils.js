/**
 * General utility functions for EPDK Süre Takip Platformu
 */

// ==========================================
// String & HTML Utilities
// ==========================================

/**
 * Escapes HTML characters to prevent XSS
 * @param {string} text 
 * @returns {string}
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Validates and sanitizes a string input
 * @param {*} input 
 * @param {number} maxLength 
 * @returns {string}
 */
export function validateString(input, maxLength = 500) {
    if (input === null || input === undefined) return '';
    const str = String(input).trim();
    const sanitized = str.replace(/[<>]/g, '');
    return sanitized.substring(0, maxLength);
}

/**
 * Generates a unique ID
 * @returns {string}
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==========================================
// Date Utilities
// ==========================================

/**
 * Formats a date as DD.MM.YYYY
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

/**
 * Formats a date as DD Month YYYY
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function formatDateLong(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Parses an Excel date (serial number or various string formats)
 * @param {*} value 
 * @returns {Date|null}
 */
export function parseExcelDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    }
    if (typeof value === 'string') {
        const formats = [
            /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            /(\d{4})-(\d{1,2})-(\d{1,2})/
        ];
        for (const format of formats) {
            const match = value.match(format);
            if (match) {
                if (format === formats[2]) {
                    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                } else {
                    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                }
            }
        }
        const parsed = new Date(value);
        if (!isNaN(parsed)) return parsed;
    }
    return null;
}

/**
 * Validates a date value
 * @param {*} value 
 * @returns {{valid: boolean, date: Date|null, error: string|null}}
 */
export function validateDate(value) {
    if (!value) return { valid: false, date: null, error: 'Tarih boş olamaz' };
    const parsed = parseExcelDate(value);
    if (!parsed || isNaN(parsed.getTime())) {
        return { valid: false, date: null, error: 'Geçersiz tarih formatı' };
    }
    const year = parsed.getFullYear();
    if (year < 1900 || year > 2100) {
        return { valid: false, date: null, error: 'Tarih mantıklı aralıkta değil' };
    }
    return { valid: true, date: parsed, error: null };
}

/**
 * Calculates days between now and target date
 * @param {Date|string|number} date 
 * @returns {number}
 */
export function getDaysUntil(date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

/**
 * Gets status key based on days until deadline
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function getStatus(date) {
    const days = getDaysUntil(date);
    if (days < 0) return 'overdue';
    if (days <= 7) return 'this-week';
    if (days <= 30) return 'this-month';
    return 'upcoming';
}

/**
 * Gets localized status human-readable text
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function getStatusText(date) {
    const days = getDaysUntil(date);
    if (days < 0) return `${Math.abs(days)} gün gecikti`;
    if (days === 0) return 'Bugün!';
    if (days === 1) return 'Yarın';
    return `${days} gün kaldı`;
}

/**
 * Gets localized status label
 * @param {string} status 
 * @returns {string}
 */
export function getStatusLabel(status) {
    switch (status) {
        case 'overdue': return '🔴 Gecikmiş';
        case 'this-week': return '🟠 Bu Hafta';
        case 'this-month': return '🟡 Bu Ay';
        default: return '🟢 Yaklaşan';
    }
}

/**
 * Gets quarter for a date
 * @param {Date|string|number} date 
 * @returns {number}
 */
export function getQuarter(date) {
    const month = new Date(date).getMonth();
    return Math.floor(month / 3) + 1;
}

/**
 * Gets current quarter
 * @returns {number}
 */
export function getCurrentQuarter() {
    return getQuarter(new Date());
}
