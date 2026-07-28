/**
 * Push notification delivery for the iOS shell.
 *
 * Device tokens live in their own `pushTokens/{token}` collection rather than
 * inside daVinciData/master: that document is rewritten wholesale on every save
 * (last-write-wins), so anything stored there would be lost the moment two
 * people edited at once.
 *
 * Registration goes through an HTTPS function that verifies a Firebase ID
 * token, because the native shell itself is not signed in - authentication
 * happens inside the web view, which is what calls this.
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getMessaging } = require("firebase-admin/messaging");

const REGION = "europe-west1";
const TOKENS = "pushTokens";

// Bulk edits (an Excel import, a batch update) must not turn into a burst of
// dozens of pushes; past this many changes we send one summary instead.
const MAX_INDIVIDUAL_NOTIFICATIONS = 3;

const db = () => getFirestore();

// ---------------------------------------------------------------------------
// CORS + auth helpers
// ---------------------------------------------------------------------------

function applyCors(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return true;
    }
    return false;
}

/** Returns the decoded Firebase user, or null if the caller isn't signed in. */
async function requireUser(req) {
    const header = req.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    try {
        return await getAuth().verifyIdToken(match[1]);
    } catch (err) {
        console.warn("Gecersiz ID token:", err.message);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

async function getSettings() {
    const snap = await db().doc("daVinciData/master").get();
    const data = snap.exists ? snap.data() : {};
    const push = (data.notificationSettings || {}).push || {};
    return {
        dailyDigest: push.dailyDigest !== false,
        newObligation: push.newObligation !== false,
        jobProgress: push.jobProgress !== false
    };
}

/**
 * Number to show on the app icon: everything already due or overdue.
 * Sent with every push so the badge stays truthful without the app running.
 */
function computeBadge(data) {
    const obligations = (data && data.obligations) || [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return obligations.filter((o) => {
        if (o.status === "completed") return false;
        const d = new Date(o.deadline);
        if (isNaN(d.getTime())) return false;
        d.setUTCHours(0, 0, 0, 0);
        return d <= today;
    }).length;
}

/**
 * Compact snapshot the iOS side stores in its App Group so the home-screen
 * widget can refresh without the app being opened. Kept tiny - the whole APNs
 * payload has a 4KB ceiling.
 */
function widgetSnapshot(data) {
    const obligations = (data && data.obligations) || [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return obligations
        .filter((o) => o.status !== "completed" && !isNaN(new Date(o.deadline).getTime()))
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3)
        .map((o) => ({
            p: String(o.projectName || "").slice(0, 40),
            t: String(o.obligationType || "").slice(0, 40),
            d: new Date(o.deadline).toISOString().slice(0, 10)
        }));
}

async function getTokens() {
    const snap = await db().collection(TOKENS).get();
    return snap.docs.map((d) => d.id);
}

/**
 * Drops tokens APNs told us are dead. Without this the collection fills with
 * tokens from reinstalled/retired devices and every send reports failures.
 */
async function pruneDeadTokens(tokens, responses) {
    const dead = [];
    responses.forEach((r, i) => {
        const code = r.error && r.error.code;
        if (code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-argument") {
            dead.push(tokens[i]);
        }
    });
    if (!dead.length) return;
    const batch = db().batch();
    dead.forEach((t) => batch.delete(db().collection(TOKENS).doc(t)));
    await batch.commit();
    console.log(`🧹 ${dead.length} gecersiz token silindi.`);
}

/**
 * @param {string} title
 * @param {string} body
 * @param {object} [opts] { badge, snapshot, type }
 */
async function sendToAllDevices(title, body, opts = {}) {
    const tokens = await getTokens();
    if (!tokens.length) {
        console.log("📭 Kayitli cihaz yok, push atlandi.");
        return { sent: 0, failed: 0 };
    }

    const data = {};
    if (opts.type) data.type = String(opts.type);
    if (opts.snapshot) data.snapshot = JSON.stringify(opts.snapshot);

    const message = {
        tokens,
        notification: { title, body },
        data,
        apns: {
            payload: {
                aps: {
                    sound: "default",
                    // content-available lets the app update its badge/widget
                    // data even when the user doesn't tap the notification.
                    "content-available": 1,
                    ...(typeof opts.badge === "number" ? { badge: opts.badge } : {})
                }
            },
            headers: { "apns-priority": "10" }
        }
    };

    const result = await getMessaging().sendEachForMulticast(message);
    await pruneDeadTokens(tokens, result.responses);
    console.log(`📲 Push: ${result.successCount} basarili, ${result.failureCount} basarisiz.`);
    return { sent: result.successCount, failed: result.failureCount };
}

// ---------------------------------------------------------------------------
// HTTPS: token registration (called by the web app inside the shell)
// ---------------------------------------------------------------------------

exports.registerPushToken = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (applyCors(req, res)) return;

    const user = await requireUser(req);
    if (!user) {
        res.status(401).json({ error: "Oturum acmaniz gerekiyor." });
        return;
    }

    const { token, device } = req.body || {};
    if (!token || typeof token !== "string") {
        res.status(400).json({ error: "token gerekli." });
        return;
    }

    await db().collection(TOKENS).doc(token).set({
        email: user.email || null,
        uid: user.uid,
        device: typeof device === "string" ? device.slice(0, 80) : null,
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ Push token kaydedildi: ${user.email}`);
    res.json({ ok: true });
});

/** Lets a user turn push off for the device they're holding. */
exports.unregisterPushToken = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (applyCors(req, res)) return;

    const user = await requireUser(req);
    if (!user) {
        res.status(401).json({ error: "Oturum acmaniz gerekiyor." });
        return;
    }

    const { token } = req.body || {};
    if (!token) {
        res.status(400).json({ error: "token gerekli." });
        return;
    }
    await db().collection(TOKENS).doc(token).delete();
    res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// HTTPS: manual push from the settings screen
// ---------------------------------------------------------------------------

exports.sendManualPush = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (applyCors(req, res)) return;

    const user = await requireUser(req);
    if (!user) {
        res.status(401).json({ error: "Oturum acmaniz gerekiyor." });
        return;
    }

    const title = String((req.body || {}).title || "").trim();
    const body = String((req.body || {}).body || "").trim();
    if (!title || !body) {
        res.status(400).json({ error: "Baslik ve mesaj gerekli." });
        return;
    }

    const snap = await db().doc("daVinciData/master").get();
    const data = snap.exists ? snap.data() : {};

    const result = await sendToAllDevices(title, body, {
        type: "manual",
        badge: computeBadge(data),
        snapshot: widgetSnapshot(data)
    });

    console.log(`📢 Manuel push gonderildi (${user.email}): ${title}`);
    res.json({ ok: true, ...result });
});

/** Device list for the settings screen. */
exports.listPushDevices = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (applyCors(req, res)) return;

    const user = await requireUser(req);
    if (!user) {
        res.status(401).json({ error: "Oturum acmaniz gerekiyor." });
        return;
    }

    const snap = await db().collection(TOKENS).get();
    res.json({
        devices: snap.docs.map((d) => ({
            token: d.id.slice(0, 12) + "…",
            email: d.data().email,
            device: d.data().device,
            updatedAt: d.data().updatedAt ? d.data().updatedAt.toDate().toISOString() : null
        }))
    });
});

// ---------------------------------------------------------------------------
// Firestore trigger: new obligations and tadil progress
// ---------------------------------------------------------------------------

/** Map of job id -> a signature of its workflow progress. */
function jobProgressMap(jobs) {
    const map = new Map();
    (jobs || []).forEach((j) => {
        if (!j || !j.id) return;
        const steps = j.steps || {};
        const doneCount = Object.keys(steps).filter((k) => steps[k] && steps[k].completed).length;
        map.set(j.id, { step: j.currentStep || 1, doneCount, status: j.status, project: j.project, title: j.title });
    });
    return map;
}

exports.onMasterDataChanged = onDocumentWritten(
    { document: "daVinciData/master", region: REGION },
    async (event) => {
        const before = event.data.before.exists ? event.data.before.data() : null;
        const after = event.data.after.exists ? event.data.after.data() : null;
        // Nothing to compare against on first write / deletion.
        if (!before || !after) return;

        const settings = await getSettings();
        const badge = computeBadge(after);
        const snapshot = widgetSnapshot(after);

        // --- New obligations ---
        if (settings.newObligation) {
            const beforeIds = new Set((before.obligations || []).map((o) => o.id));
            const added = (after.obligations || []).filter((o) => o && o.id && !beforeIds.has(o.id));

            if (added.length > MAX_INDIVIDUAL_NOTIFICATIONS) {
                await sendToAllDevices(
                    "📋 Yeni yükümlülükler eklendi",
                    `${added.length} yeni yükümlülük tanımlandı.`,
                    { type: "obligation_bulk", badge, snapshot }
                );
            } else {
                for (const o of added) {
                    await sendToAllDevices(
                        "📋 Yeni yükümlülük",
                        `${o.projectName || "Proje"} — ${o.obligationType || ""}`.trim(),
                        { type: "obligation_new", badge, snapshot }
                    );
                }
            }
        }

        // --- Tadil progress ---
        if (settings.jobProgress) {
            const beforeJobs = jobProgressMap(before.jobs);
            const changes = [];

            jobProgressMap(after.jobs).forEach((now, id) => {
                const was = beforeJobs.get(id);
                if (!was) return; // brand new job, not a "progress" event
                if (now.step !== was.step || now.doneCount !== was.doneCount || now.status !== was.status) {
                    changes.push(now);
                }
            });

            if (changes.length > MAX_INDIVIDUAL_NOTIFICATIONS) {
                await sendToAllDevices(
                    "⚡ Tadillerde ilerleme",
                    `${changes.length} tadilde aşama güncellendi.`,
                    { type: "job_bulk", badge, snapshot }
                );
            } else {
                for (const j of changes) {
                    const label = j.status === "completed"
                        ? "🟢 Tadil tamamlandı"
                        : "⚡ Tadilde ilerleme";
                    const detail = j.status === "completed"
                        ? `${j.project || ""} — ${j.title || ""}`.trim()
                        : `${j.project || ""} — ${j.title || ""} (Aşama ${j.step}/13)`.trim();
                    await sendToAllDevices(label, detail, { type: "job_progress", badge, snapshot });
                }
            }
        }
    }
);

// ---------------------------------------------------------------------------
// Used by the 08:00 digest in index.js
// ---------------------------------------------------------------------------

/**
 * Mirrors the weekday morning e-mail as a push. Called from checkDeadlines so
 * both channels fire off exactly the same computed lists.
 */
async function sendDigestPush(data, { todayAndOverdue, upcoming, aoTasks, gdTasks }) {
    const settings = await getSettings();
    if (!settings.dailyDigest) {
        console.log("🔕 Gunluk ozet push'u ayarlardan kapali.");
        return;
    }

    const parts = [];
    if (todayAndOverdue.length) parts.push(`${todayAndOverdue.length} bugün/gecikmiş`);
    if (upcoming.length) parts.push(`${upcoming.length} bu hafta`);
    const pending = aoTasks.length + gdTasks.length;
    if (pending) parts.push(`${pending} bekleyen yazı`);
    if (!parts.length) return;

    await sendToAllDevices(
        "📅 Günlük Özet",
        parts.join(" · "),
        { type: "daily_digest", badge: computeBadge(data), snapshot: widgetSnapshot(data) }
    );
}

module.exports.sendDigestPush = sendDigestPush;
module.exports.sendToAllDevices = sendToAllDevices;
module.exports.computeBadge = computeBadge;
module.exports.widgetSnapshot = widgetSnapshot;
