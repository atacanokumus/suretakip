/**
 * Browser Notifications module for DaVinci Lisans Süre Takip Platformu
 * (Browser notifications disabled, handles Cloud Function email testing triggers)
 */

import { showToast } from './ui.js';

/**
 * Initializes notification permissions and checks for alerts (Disabled)
 */
export async function initNotifications() {
    // Browser notifications disabled by user request
    console.info("🔔 Tarayıcı bildirimleri devre dışı bırakıldı.");
}

/**
 * Scans obligations and triggers notifications (Disabled)
 */
export function checkAndNotify() {
    // Browser notifications disabled by user request
}

/**
 * Triggers a dummy notification to test permissions (Updated to trigger email tests directly)
 */
export function testNotifications() {
    // Trigger Real Email Tests via Cloud Function
    const FUNCTION_URL = "https://europe-west1-sure-takip.cloudfunctions.net/testEmail";

    showToast("📨 E-Posta testleri tetikleniyor...", "info");

    // Trigger Daily Mail (Real Data)
    fetch(`${FUNCTION_URL}?type=real`, { mode: 'cors' })
        .then(res => {
            console.log('Daily Mail Response:', res.status);
            if (res.ok) showToast("✅ Günlük Hatırlatma maili tetiklendi!", "success");
            else showToast("❌ Günlük mail hatası: " + res.status, "error");
        })
        .catch(err => showToast("🚨 Günlük mail bağlantı hatası: " + err.message, "error"));

    // Trigger Weekly Mail (Real Data)
    fetch(`${FUNCTION_URL}?type=weekly_real`, { mode: 'cors' })
        .then(res => {
            console.log('Weekly Mail Response:', res.status);
            if (res.ok) showToast("✅ Haftalık Rapor maili tetiklendi!", "success");
            else showToast("❌ Haftalık rapor hatası: " + res.status, "error");
        })
        .catch(err => showToast("🚨 Haftalık rapor bağlantı hatası: " + err.message, "error"));
}
