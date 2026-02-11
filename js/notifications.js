/**
 * Browser Notifications module for DaVinci Lisans Süre Takip Platformu
 */

import { Store } from './store.js';
import { getDaysUntil, getStatus } from './utils.js';
import { showToast } from './ui.js';

// Random Session ID to ensure tags are unique across different logins
const SESSION_ID = Math.floor(Math.random() * 1000000);

/**
 * Initializes notification permissions and checks for alerts
 */
export async function initNotifications() {
    if (!("Notification" in window)) {
        console.warn("Bu tarayıcı masaüstü bildirimlerini desteklemiyor.");
        return;
    }

    if (Notification.permission === "default") {
        await Notification.requestPermission();
    }

    // Delay initial check slightly to allow browser to stabilize and bypass silent-start blocks
    setTimeout(() => {
        console.log("🔔 Initial Notification Check Triggered...");
        checkAndNotify();
    }, 2500);
}

/**
 * Scans obligations and triggers notifications for 7-day and 1-day deadlines.
 * If no milestone is met, notifies about the single closest upcoming deadline.
 */
export function checkAndNotify() {
    if (Notification.permission !== "granted") return;

    // Filter and sort by date safely
    const upcoming = Store.obligations
        .filter(o => getStatus(o.deadline, o.status) !== 'completed')
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (upcoming.length === 0) return;

    // 1. Collect Milestone Alerts (7d, 3d, 1d, 0d)
    const milestoneIds = new Set();
    const milestoneDays = [7, 3, 1, 0];

    upcoming.forEach(o => {
        const days = getDaysUntil(o.deadline);
        if (milestoneDays.includes(days)) {
            sendNotification(o, days);
            milestoneIds.add(o.id);
        }
    });

    // 2. Collect 'Closest' Items (those on the first available date)
    // We notify these if they weren't already notified as a milestone (to avoid double popups)
    const firstDeadline = new Date(upcoming[0].deadline).toISOString().split('T')[0];

    upcoming.forEach(o => {
        const currentO_Deadline = new Date(o.deadline).toISOString().split('T')[0];
        if (currentO_Deadline === firstDeadline && !milestoneIds.has(o.id)) {
            const days = getDaysUntil(o.deadline);
            sendNotification(o, days, true);
        }
    });

    console.info(`🔔 Notification Check Finished: ${milestoneIds.size} milestones, 1 closest alert.`);
}

/**
 * Triggers a dummy notification to test permissions
 */
export function testNotifications() {
    if (!("Notification" in window)) {
        alert("Bu tarayıcı bildirimleri desteklemiyor.");
        return;
    }

    if (Notification.permission === "granted") {
        new Notification("🚀 DaVinci Bildirim Testi", {
            body: "Bildirimler başarıyla çalışıyor! Ayrıca GÜNLÜK ve HAFTALIK test mailleri de tetiklendi.",
            icon: 'assets/logo.png'
        });

        // Trigger Real Email Tests via Cloud Function
        const FUNCTION_URL = "https://europe-west1-sure-takip.cloudfunctions.net/testEmail";

        console.log("📨 Triggering email tests...");

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

    } else if (Notification.permission === "denied") {
        alert("⚠️ Bildirimler engellenmiş! Lütfen tarayıcı ayarlarından (adres çubuğundaki kilit ikonu) bildirimlere izin verin.");
    } else {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") testNotifications();
            else alert("Bildirim izni reddedildi.");
        });
    }
}

/**
 * Sends a native browser notification
 * @param {Object} obligation 
 * @param {number} days 
 * @param {boolean} isClosest - Whether this is a "closest deadline" alert
 */
function sendNotification(obligation, days, isClosest = false) {
    let title = "";
    if (isClosest) {
        title = "📌 Sıradaki Yükümlülük Hatırlatması";
    } else {
        if (days === 0) title = "🚨 ACİL: Son Gün Bugün!";
        else if (days === 1) title = "🚨 KRİTİK: Son 24 Saat!";
        else title = `⚠️ Yükümlülük Hatırlatması (${days} Gün)`;
    }

    const dayText = days < 0 ? `${Math.abs(days)} gün gecikmiş!` : (days === 0 ? "BUGÜN SON GÜN!" : `${days} gün kaldı`);
    const body = `${obligation.projectName}\n${obligation.obligationType}\n${obligation.obligationDescription}\nDurum: ${dayText}`;

    const notification = new Notification(title, {
        body: body,
        icon: 'assets/logo.png',
        tag: `alert_${obligation.id}_${SESSION_ID}`, // Unique per session to force re-firing
        renotify: true, // Alerts the user even if tag is same (for same-session triggers)
        requireInteraction: days <= 1 // Keep critical alerts visible
    });

    notification.onclick = () => {
        window.focus();
        const event = new CustomEvent('show-detail', { detail: { id: obligation.id } });
        window.dispatchEvent(event);
    };
}
