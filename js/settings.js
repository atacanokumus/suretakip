
import { Store } from './store.js';
import { showToast } from './ui.js';
import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function initSettings() {
    const saveBtn = document.getElementById('saveNotificationSettingsBtn');

    // Accordion Logic
    const dailyHeader = document.getElementById('dailySettingsHeader');
    const weeklyHeader = document.getElementById('weeklySettingsHeader');

    if (dailyHeader && weeklyHeader) {
        dailyHeader.addEventListener('click', () => {
            document.getElementById('dailySettingsItem').classList.add('active');
            document.getElementById('weeklySettingsItem').classList.remove('active');
        });

        weeklyHeader.addEventListener('click', () => {
            document.getElementById('weeklySettingsItem').classList.add('active');
            document.getElementById('dailySettingsItem').classList.remove('active');
        });
    }

    if (!saveBtn) return;

    // Load initial settings
    await loadSettings();

    // Attach save handler
    saveBtn.addEventListener('click', async () => {
        await saveSettings();
    });
}

async function loadSettings() {
    try {
        const docRef = doc(db, "daVinciData", "master");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            let settings = data.notificationSettings || {};

            // --- Backward Compatibility & Defaults ---
            // If old format (days array exists at root), migrate to 'daily' object structure
            if (settings.days && Array.isArray(settings.days)) {
                settings = {
                    daily: { days: settings.days, hour: settings.hour || 8 },
                    weekly: { days: [1], hour: 8 } // Default weekly (Mon)
                };
            } else {
                // Ensure defaults
                if (!settings.daily) settings.daily = { days: [1, 2, 3, 4, 5], hour: 8 };
                if (!settings.weekly) settings.weekly = { days: [1], hour: 8 }; // Changed to days array

                // Construct migration from old single-day weekly format if needed
                if (settings.weekly.day !== undefined && !settings.weekly.days) {
                    settings.weekly.days = [settings.weekly.day];
                    delete settings.weekly.day;
                }
            }

            // --- Populate UI ---

            // 1. Daily Settings
            document.querySelectorAll('input[name="notifyDay"]').forEach(cb => {
                const dayVal = parseInt(cb.value);
                cb.checked = settings.daily.days.includes(dayVal);
            });
            const dailyHourSelect = document.getElementById('notifyHour');
            if (dailyHourSelect) dailyHourSelect.value = settings.daily.hour;

            // 2. Weekly Settings (Now Multi-Day)
            document.querySelectorAll('input[name="weeklyReportDay"]').forEach(cb => {
                const dayVal = parseInt(cb.value);
                cb.checked = settings.weekly.days.includes(dayVal);
            });

            const weeklyHourSelect = document.getElementById('weeklyReportHour');
            if (weeklyHourSelect) weeklyHourSelect.value = settings.weekly.hour;
        }
    } catch (error) {
        console.error("Error loading settings:", error);
        showToast("Ayarlar yüklenirken hata oluştu.", "error");
    }
}

async function saveSettings() {
    const saveBtn = document.getElementById('saveNotificationSettingsBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Kaydediliyor...";
    saveBtn.disabled = true;

    try {
        // --- 1. Get Daily Settings ---
        const dailyDays = [];
        document.querySelectorAll('input[name="notifyDay"]:checked').forEach(cb => {
            dailyDays.push(parseInt(cb.value));
        });
        const dailyHour = parseInt(document.getElementById('notifyHour').value);

        // --- 2. Get Weekly Settings ---
        const weeklyDays = [];
        document.querySelectorAll('input[name="weeklyReportDay"]:checked').forEach(cb => {
            weeklyDays.push(parseInt(cb.value));
        });
        const weeklyHour = parseInt(document.getElementById('weeklyReportHour').value);

        const settings = {
            daily: {
                days: dailyDays,
                hour: dailyHour
            },
            weekly: {
                days: weeklyDays, // Array of days
                hour: weeklyHour
            }
        };

        const docRef = doc(db, "daVinciData", "master");
        await updateDoc(docRef, {
            notificationSettings: settings,
            lastSettingsUpdate: new Date().toISOString()
        });

        // Also update local Store if needed, or just toast
        showToast("Bildirim ayarları kaydedildi! ✅", "success");

    } catch (error) {
        console.error("Error saving settings:", error);
        showToast("Ayarlar kaydedilemedi.", "error");
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}
