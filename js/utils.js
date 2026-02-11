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
 * Safely converts various formats to a Date object, handling Firestore Timestamps
 * @param {*} value 
 * @returns {Date}
 */
export function convertToDate(value) {
    if (!value) return new Date();
    if (value instanceof Date) return value;

    // Firestore Timestamp check
    if (typeof value.toDate === 'function') {
        return value.toDate();
    }

    // Firestore Timestamp object format (seconds, nanoseconds)
    if (value.seconds !== undefined) {
        return new Date(value.seconds * 1000);
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Parses an Excel date (serial number or various string formats)
 */
export function parseExcelDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;

    // Handle Firestore Timestamps here too just in case
    if (typeof value.toDate === 'function') return value.toDate();
    if (value.seconds !== undefined) return new Date(value.seconds * 1000);

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
 * Checks if a date is within the current calendar week (Monday to Sunday)
 * @param {Date|string|number} date 
 * @returns {boolean}
 */
export function isInThisCalendarWeek(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    const today = now.getDay(); // 0 is Sunday, 1 is Monday...

    // Calculate Monday of this week (00:00:00)
    const monday = new Date(now);
    const diffToMonday = (today === 0 ? -6 : 1) - today;
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    // Calculate Sunday of this week (23:59:59)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return d >= monday && d <= sunday;
}

/**
 * Checks if a date is within the previous calendar week (Monday to Sunday)
 * @param {Date|string|number} date 
 * @returns {boolean}
 */
export function isInLastCalendarWeek(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    const today = now.getDay();

    // Calculate Monday of this week
    const thisMonday = new Date(now);
    const diffToMonday = (today === 0 ? -6 : 1) - today;
    thisMonday.setDate(now.getDate() + diffToMonday);
    thisMonday.setHours(0, 0, 0, 0);

    // Last Monday is 7 days before this Monday
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    // Last Sunday is 1 day before this Monday
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    lastSunday.setHours(23, 59, 59, 999);

    return d >= lastMonday && d <= lastSunday;
}

/**
 * Checks if a date is within the current calendar month
 * @param {Date|string|number} date 
 * @returns {boolean}
 */
export function isInThisCalendarMonth(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

/**
 * Checks if a date is within the next calendar week (Monday to Sunday)
 * @param {Date|string|number} date 
 * @returns {boolean}
 */
export function isInNextCalendarWeek(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    const today = now.getDay();

    // Calculate Monday of this week
    const thisMonday = new Date(now);
    const diffToMonday = (today === 0 ? -6 : 1) - today;
    thisMonday.setDate(now.getDate() + diffToMonday);
    thisMonday.setHours(0, 0, 0, 0);

    // Next Monday is 7 days after this Monday
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);

    // Next Sunday is 13 days after this Monday
    const nextSunday = new Date(thisMonday);
    nextSunday.setDate(thisMonday.getDate() + 13);
    nextSunday.setHours(23, 59, 59, 999);

    return d >= nextMonday && d <= nextSunday;
}

/**
 * Gets status key based on calendar periods and deadline
 * @param {Date|string|number} date 
 * @param {string} currentStatus
 * @returns {string}
 */
export function getStatus(date, currentStatus = 'pending') {
    const d = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Auto-complete: Anything in the past is completed
    if (d < now || currentStatus === 'completed') return 'completed';
    if (isInThisCalendarWeek(date)) return 'this-week';
    if (isInThisCalendarMonth(date)) return 'this-month';

    return 'upcoming';
}

/**
 * Gets localized status human-readable text
 * @param {Date|string|number} date 
 * @param {string} currentStatus
 * @returns {string}
 */
export function getStatusText(date, currentStatus = 'pending') {
    const status = getStatus(date, currentStatus);
    if (status === 'completed') return 'Tamamlandı ✅';

    const days = getDaysUntil(date);
    if (days === 0) return 'Bugün!';
    if (days === 1) return 'Yarın';

    if (isInThisCalendarWeek(date)) return `Bu Hafta (${days} gün)`;
    if (isInThisCalendarMonth(date)) return `Bu Ay (${days} gün)`;

    return `${days} gün kaldı`;
}

/**
 * Gets localized status label
 * @param {string} status 
 * @returns {string}
 */
export function getStatusLabel(status) {
    switch (status) {
        case 'completed': return '🔵 Tamamlandı';
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
