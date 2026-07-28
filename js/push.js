/**
 * Push notification bridge between the iOS shell and the backend.
 *
 * The native shell is not signed in to Firebase - authentication lives here, in
 * the web view. So the shell hands us its device token and this module
 * registers it using the logged-in user's ID token.
 */

import { auth, db } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showToast } from './ui.js';
import { Store } from './store.js';

const FN_BASE = 'https://europe-west1-sure-takip.cloudfunctions.net';

/** Token handed over by the shell; may arrive before login completes. */
let pendingToken = null;
let registeredToken = null;

export function isNativeShell() {
    return !!(window.SureTakipNative && window.SureTakipNative.platform === 'ios');
}

async function authedFetch(path, body) {
    const user = auth.currentUser;
    if (!user) throw new Error('Oturum açık değil.');
    const idToken = await user.getIdToken();

    const res = await fetch(`${FN_BASE}/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(body || {})
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`${res.status} ${detail}`.trim());
    }
    return res.json();
}

/**
 * Called by the native shell (see WebAppView.swift) once APNs/FCM hands it a
 * token. If the user hasn't logged in yet we hold it until they do.
 */
async function onNativeToken(token, device) {
    if (!token || token === registeredToken) return;
    pendingToken = { token, device };
    if (auth.currentUser) await flushPendingToken();
}

async function flushPendingToken() {
    if (!pendingToken) return;
    const { token, device } = pendingToken;
    try {
        await authedFetch('registerPushToken', { token, device });
        registeredToken = token;
        pendingToken = null;
        console.log('🔔 Push token kaydedildi.');
    } catch (err) {
        // Left in pendingToken so the next login attempt retries it.
        console.warn('Push token kaydedilemedi:', err.message);
    }
}

export function initPush() {
    // Expose the entry point the shell calls into.
    window.SureTakipPush = { onToken: onNativeToken };

    // The shell may have called before this module ran; it re-sends on load,
    // but also check the value it parks on the bridge object.
    if (window.SureTakipNative && window.SureTakipNative.pendingPushToken) {
        onNativeToken(window.SureTakipNative.pendingPushToken, window.SureTakipNative.deviceName);
    }

    auth.onAuthStateChanged((user) => {
        if (user) flushPendingToken();
    });

    initPushSettingsUI();
}

/**
 * Keeps the home-screen widget fresh while the app is in use. Push messages
 * carry the same snapshot so the widget also updates when the app is closed.
 */
export function syncWidgetSnapshot() {
    if (!isNativeShell() || !window.SureTakipNative.updateWidget) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = (Store.obligations || [])
        .filter(o => o.status !== 'completed' && !isNaN(new Date(o.deadline).getTime()))
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3)
        .map(o => ({
            p: String(o.projectName || '').slice(0, 40),
            t: String(o.obligationType || '').slice(0, 40),
            d: new Date(o.deadline).toISOString().slice(0, 10)
        }));

    const badge = (Store.obligations || []).filter(o => {
        if (o.status === 'completed') return false;
        const d = new Date(o.deadline);
        if (isNaN(d.getTime())) return false;
        d.setHours(0, 0, 0, 0);
        return d <= today;
    }).length;

    try {
        window.SureTakipNative.updateWidget(JSON.stringify({ badge, items: upcoming }));
    } catch (err) {
        console.warn('Widget guncellenemedi:', err.message);
    }
}

// ---------------------------------------------------------------------------
// Settings UI
// ---------------------------------------------------------------------------

const PUSH_KEYS = ['dailyDigest', 'newObligation', 'jobProgress'];

/** Current push preferences, defaulting to on. */
function readPushSettings(stored) {
    const p = (stored && stored.push) || {};
    return {
        dailyDigest: p.dailyDigest !== false,
        newObligation: p.newObligation !== false,
        jobProgress: p.jobProgress !== false
    };
}

function currentUiSettings() {
    const out = {};
    PUSH_KEYS.forEach(k => {
        const el = document.getElementById(`push_${k}`);
        out[k] = el ? el.checked : true;
    });
    return out;
}

async function initPushSettingsUI() {
    const panel = document.getElementById('pushSettingsCard');
    if (!panel) return;

    // Read straight from Firestore, matching js/settings.js - these live in
    // notificationSettings, which the Store doesn't mirror.
    let stored = {};
    try {
        const snap = await getDoc(doc(db, 'daVinciData', 'master'));
        if (snap.exists()) stored = snap.data().notificationSettings || {};
    } catch (err) {
        console.warn('Push ayarlari okunamadi:', err.message);
    }

    const current = readPushSettings(stored);
    PUSH_KEYS.forEach(key => {
        const el = document.getElementById(`push_${key}`);
        if (!el) return;
        el.checked = current[key];
        el.onchange = async () => {
            try {
                // Field-path write so this never clobbers daily/weekly.
                await updateDoc(doc(db, 'daVinciData', 'master'), {
                    'notificationSettings.push': currentUiSettings()
                });
                showToast('Bildirim ayarı kaydedildi.', 'success');
            } catch (err) {
                showToast('Ayar kaydedilemedi: ' + err.message, 'error');
                el.checked = !el.checked;
            }
        };
    });

    const sendBtn = document.getElementById('pushSendBtn');
    if (sendBtn) {
        sendBtn.onclick = async () => {
            const titleEl = document.getElementById('pushTitle');
            const bodyEl = document.getElementById('pushBody');
            const title = titleEl.value.trim();
            const body = bodyEl.value.trim();

            if (!title || !body) {
                showToast('Başlık ve mesaj gerekli.', 'error');
                return;
            }

            sendBtn.disabled = true;
            sendBtn.textContent = 'Gönderiliyor…';
            try {
                const res = await authedFetch('sendManualPush', { title, body });
                showToast(`📲 ${res.sent} cihaza gönderildi.`, 'success');
                titleEl.value = '';
                bodyEl.value = '';
            } catch (err) {
                showToast('Gönderilemedi: ' + err.message, 'error');
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = '📲 Bildirim Gönder';
            }
        };
    }

    const refreshBtn = document.getElementById('pushDevicesBtn');
    if (refreshBtn) refreshBtn.onclick = loadDeviceList;
}

async function loadDeviceList() {
    const list = document.getElementById('pushDeviceList');
    if (!list) return;
    list.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Yükleniyor…</p>';

    try {
        const user = auth.currentUser;
        const idToken = await user.getIdToken();
        const res = await fetch(`${FN_BASE}/listPushDevices`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            body: '{}'
        });
        const data = await res.json();

        if (!data.devices || !data.devices.length) {
            list.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Henüz kayıtlı cihaz yok. iOS uygulamasını açıp bildirimlere izin verin.</p>';
            return;
        }

        list.innerHTML = data.devices.map(d => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-glass); font-size: 13px;">
                <span style="color: var(--text-primary);">${d.email || 'Bilinmiyor'}</span>
                <span style="color: var(--text-muted); font-size: 11px;">${d.device || 'iPhone'}</span>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<p style="color: var(--danger); font-size: 13px;">Liste alınamadı: ${err.message}</p>`;
    }
}
