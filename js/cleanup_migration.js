/**
 * Tek seferlik veri güncellemesi (2026-10): GD Kontrolü ve Müzekkere/Olur
 * Hazırlama aşamalarının iş akışlarından kaldırılması + Gamze Durum
 * kullanıcısının pasifleştirilmesi.
 *
 * NEDEN OTOMATİK DEĞİL, DÜĞMEYLE?
 * Bu uygulamada localhost da CANLI Firestore'a bağlanır (js/firebase-config.js).
 * Diğer geçişler (data.js migrate*) açılışta kendiliğinden çalışır; bu ise
 * kayıtların aşama sırasını değiştirdiği için, kod canlıya çıkmadan önce
 * test amaçlı açılan bir localhost sekmesinin canlı veriyi sessizce
 * dönüştürmesini istemiyoruz. Ayarlar sayfasındaki kart önce NE değişeceğini
 * gösterir, sonra kullanıcı onaylarsa uygular.
 *
 * VERİ KORUMA
 *  - Hiçbir kayıt silinmez. Kaldırılan aşamanın girilmiş verisi job.archivedSteps
 *    altında saklanır.
 *  - Uygulamadan önce bir yedek Firestore'a (daVinciData/cleanup_backup_*) ve
 *    bir JSON dosyası olarak bilgisayara indirilir; "Geri Al" düğmesi bu
 *    yedekten iş akışı tanımlarını ve etkilenen kayıtların aşama verisini
 *    geri yükler.
 *  - İşlem idempotenttir: ikinci kez çalıştırıldığında yapacak bir şey yoktur.
 *  - Kullanıcı SİLİNMEZ; yalnızca atama listelerinden çıkarılır ve girişi
 *    engellenir (daVinciData/master.inactiveUsers + users/{email}.active=false).
 */

import { Store } from './store.js';
import { db, auth } from './firebase-config.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { saveData, flushCloudSync, saveUserProfile, safeSetStorage, logError } from './data.js';
import { ensureTadilSteps } from './jobs.js';
import { LEGACY_WORKFLOWS_BEFORE_CLEANUP } from './legacy_workflows_2026_10.js';
import { showToast } from './ui.js';
import { escapeHtml } from './utils.js';

const REMOVED_STEP_TYPES = {
    GD_KONTROL: 'GD Kontrolü',
    OLUR_MUZEKKERE_YAZIMI: 'Müzekkere / Olur Hazırlama'
};
const GUNDEM_TYPE = 'OLUR_IMZALANMASI_VE_GUNDEM';
const LAST_BACKUP_FIELD = 'lastCleanupBackupId';

// ---------------------------------------------------------------------------
// Planlama (salt okunur)
// ---------------------------------------------------------------------------

function normalizeText(s) {
    return String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
}

/** "Gamze Durum" hesapları: ad veya e-postada hem "gamze" hem "durum" geçenler. */
export function findGamzeDurumUsers() {
    return (Store.users || []).filter(u => {
        const hay = normalizeText(`${u.displayName || ''} ${u.email || ''}`);
        return hay.includes('gamze') && hay.includes('durum');
    });
}

function stepsConfFor(title) {
    const live = Store.workflows && Store.workflows[title];
    if (Array.isArray(live)) return live;
    return LEGACY_WORKFLOWS_BEFORE_CLEANUP[title] || null;
}

function titlesInPlay() {
    const titles = new Set(Object.keys(Store.workflows || {}));
    (Store.jobs || []).forEach(j => { if (j && j.title) titles.add(j.title); });
    return [...titles];
}

/** Eski diziden kaldırılacak tipleri çıkarır; yeni diziyi ve eski->yeni eşlemesini döndürür. */
function buildNewConf(oldConf) {
    const hadMuzekkere = oldConf.some(s => s && s.type === 'OLUR_MUZEKKERE_YAZIMI');
    const keptOldIdx = [];
    const removedOldIdx = [];
    const newConf = [];
    oldConf.forEach((s, i) => {
        if (!s) return;
        if (REMOVED_STEP_TYPES[s.type]) { removedOldIdx.push(i); return; }
        keptOldIdx.push(i);
        const copy = { ...s };
        if (hadMuzekkere && s.type === GUNDEM_TYPE) {
            copy.short = 'Olur/Gündem';
            copy.long = 'Olur İmzalanması / Gündeme Alınması';
        }
        newConf.push(copy);
    });
    newConf.forEach((s, i) => {
        const long = s.long || s.short || '';
        s.long = /^\d+\.\s*/.test(long) ? long.replace(/^\d+\.\s*/, `${i + 1}. `) : `${i + 1}. ${long}`;
    });
    return { newConf, keptOldIdx, removedOldIdx };
}

function hasContent(stepData) {
    return !!stepData && Object.values(stepData).some(v => {
        if (Array.isArray(v)) return v.length > 0;
        if (v && typeof v === 'object') return Object.keys(v).length > 0;
        return !!v;
    });
}

/**
 * Bir kaydın yeni adım verisini ve imlecini hesaplar (kaydı DEĞİŞTİRMEZ).
 * @returns {{ok:boolean, reason?:string, steps?:Object, currentStep?:number, archived?:Object}}
 */
function planJob(job, oldConf, mapping) {
    const oldSteps = job.steps || {};
    const oldLen = oldConf.length;
    if (!oldSteps[`step${oldLen}`] || oldSteps[`step${oldLen + 1}`]) {
        return { ok: false, reason: 'aşama sayısı iş akışıyla uyuşmuyor' };
    }

    const { newConf, keptOldIdx, removedOldIdx } = mapping;
    const steps = {};
    keptOldIdx.forEach((oldIdx, newIdx) => {
        if (oldSteps[`step${oldIdx + 1}`]) steps[`step${newIdx + 1}`] = oldSteps[`step${oldIdx + 1}`];
    });

    const archived = {};
    removedOldIdx.forEach(oldIdx => {
        const data = oldSteps[`step${oldIdx + 1}`];
        if (hasContent(data)) {
            archived[oldConf[oldIdx].type] = {
                ...data,
                _archivedAt: new Date().toISOString(),
                _reason: `${REMOVED_STEP_TYPES[oldConf[oldIdx].type]} aşaması iş akışından kaldırıldı`
            };
        }
    });

    // İmleç: eski imlecin SOLUNDA kalan korunan adım sayısı + 1. İmleç kaldırılan
    // bir adımdaysa bu, doğrudan bir sonraki korunan adıma denk gelir.
    const oldCur = Math.max(1, job.currentStep || 1);
    const keptBefore = keptOldIdx.filter(i => i + 1 < oldCur).length;
    let currentStep = Math.min(keptBefore + 1, newConf.length);
    if (job.status === 'completed') {
        currentStep = newConf.length;
    } else {
        // Kaldırılan adımın ardındaki adım zaten tamamlanmışsa ilk açık adıma ilerle.
        while (currentStep < newConf.length && steps[`step${currentStep}`]?.completed) currentStep++;
    }
    return { ok: true, steps, currentStep, archived };
}

/**
 * Ne değişecek? Salt okunur; hiçbir şeyi değiştirmez.
 */
export function analyzeCleanup() {
    const workflows = [];
    const jobs = [];
    const skipped = [];

    titlesInPlay().forEach(title => {
        const oldConf = stepsConfFor(title);
        if (!oldConf || !oldConf.some(s => s && REMOVED_STEP_TYPES[s.type])) return;

        const mapping = buildNewConf(oldConf);
        const inLive = Array.isArray(Store.workflows && Store.workflows[title]);
        const titleJobs = [];
        const titleSkipped = [];

        (Store.jobs || []).forEach(job => {
            if (!job || job.title !== title) return;
            const plan = planJob(job, oldConf, mapping);
            if (!plan.ok) {
                titleSkipped.push({ id: job.id, project: job.project, title, reason: plan.reason });
                return;
            }
            titleJobs.push({
                id: job.id,
                project: job.project,
                title,
                currentBefore: job.currentStep || 1,
                currentAfter: plan.currentStep,
                archivedTypes: Object.keys(plan.archived)
            });
        });

        // Canlıda kaydı olmayan (varsayılana düşen) bir tip için, eski şekilde
        // hâlâ taşınacak kayıt yoksa yapılacak bir şey kalmamıştır: aksi halde
        // güncelleme uygulandıktan sonra da "bekliyor" görünürdü.
        if (!inLive && titleJobs.length === 0) return;

        workflows.push({
            title,
            removed: mapping.removedOldIdx.map(i => REMOVED_STEP_TYPES[oldConf[i].type]),
            before: oldConf.length,
            after: mapping.newConf.length,
            inLive
        });
        jobs.push(...titleJobs);
        skipped.push(...titleSkipped);
    });

    const gamze = findGamzeDurumUsers().map(u => ({
        email: u.email,
        displayName: u.displayName || u.email,
        alreadyInactive: Store.isUserInactive(u.email),
        openJobs: (Store.jobs || []).filter(j => j.assignee === u.email && j.status !== 'completed').length
    }));

    const needsWork = workflows.length > 0 || gamze.some(u => !u.alreadyInactive);
    return { workflows, jobs, skipped, users: gamze, needsWork };
}

// ---------------------------------------------------------------------------
// Uygulama
// ---------------------------------------------------------------------------

function jsonSafe(value) {
    return JSON.parse(JSON.stringify(value === undefined ? null : value));
}

function downloadJson(filename, payload) {
    try {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Güncellemeyi uygular. Önce yedeği ALIR; yedek yazılamazsa hiçbir şeye dokunmaz.
 * @returns {Promise<{ok:boolean, error?:string, summary?:Object}>}
 */
export async function applyCleanup() {
    if (!auth.currentUser) return { ok: false, error: 'Oturum açık değil.' };

    // Eski şekilli (ör. 13 anahtarlı) kayıtları, iş akışı değişmeden ÖNCE normal
    // şekline getir - ensureTadilSteps'in bilinen geçişleri.
    const affectedTitles = new Set();
    titlesInPlay().forEach(title => {
        const conf = stepsConfFor(title);
        if (conf && conf.some(s => s && REMOVED_STEP_TYPES[s.type])) affectedTitles.add(title);
    });
    (Store.jobs || []).forEach(job => {
        if (job && affectedTitles.has(job.title)) {
            try { ensureTadilSteps(job); } catch (e) { logError('Geçiş öncesi normalleştirme', e); }
        }
    });

    const plan = analyzeCleanup();
    if (!plan.needsWork) return { ok: true, summary: { workflows: 0, jobs: 0, users: 0 } };

    // ---- 1) Yedek ---------------------------------------------------------
    const stamp = new Date().toISOString();
    const backupId = `cleanup_backup_${stamp.replace(/[:.]/g, '-')}`;
    const affectedIds = new Set(plan.jobs.map(j => String(j.id)));
    const backup = {
        createdAt: stamp,
        createdBy: auth.currentUser.email,
        note: 'GD Kontrolü / Müzekkere aşamalarını kaldırma + Gamze Durum pasifleştirme öncesi yedek',
        workflows: jsonSafe(Store.workflows || {}),
        inactiveUsersBefore: jsonSafe(Store.inactiveUsers || []),
        usersTouched: jsonSafe(plan.users.map(u => u.email)),
        jobs: jsonSafe((Store.jobs || [])
            .filter(j => affectedIds.has(String(j.id)))
            .map(j => ({
                id: j.id, title: j.title, project: j.project,
                steps: j.steps || {}, currentStep: j.currentStep || 1,
                archivedSteps: j.archivedSteps || null
            })))
    };
    try {
        await setDoc(doc(db, 'daVinciData', backupId), backup);
        await setDoc(doc(db, 'daVinciData', 'master'), { [LAST_BACKUP_FIELD]: backupId }, { merge: true });
    } catch (err) {
        logError('Güncelleme yedeği yazılamadı', err);
        return { ok: false, error: 'Yedek Firestore\'a yazılamadı; güvenlik için hiçbir değişiklik yapılmadı.' };
    }
    // Bilgisayara tam kopya (tüm tadiller + iş akışları + yükümlülükler).
    downloadJson(`DaVinci_Guncelleme_Oncesi_Yedek_${stamp.slice(0, 10)}.json`, {
        version: 'cleanup-2026-10',
        exportDate: stamp,
        createdBy: auth.currentUser.email,
        workflows: jsonSafe(Store.workflows || {}),
        jobs: jsonSafe(Store.jobs || []),
        obligations: jsonSafe(Store.obligations || []),
        users: jsonSafe(Store.users || [])
    });

    // ---- 2) İş akışı tanımları + kayıtlar ------------------------------------
    const newWorkflows = { ...(Store.workflows || {}) };
    let migratedJobs = 0;
    plan.workflows.forEach(w => {
        const oldConf = stepsConfFor(w.title);
        const mapping = buildNewConf(oldConf);

        (Store.jobs || []).forEach(job => {
            if (!job || job.title !== w.title) return;
            const jp = planJob(job, oldConf, mapping);
            if (!jp.ok) return; // şekli uyuşmayan kayıta dokunma
            const archivedSteps = { ...(job.archivedSteps || {}), ...jp.archived };
            const patch = { steps: jp.steps, currentStep: jp.currentStep };
            // Firestore `undefined` alan değerini reddeder: yalnızca arşivlenecek
            // bir şey varsa anahtarı hiç ekleme.
            if (Object.keys(archivedSteps).length) patch.archivedSteps = archivedSteps;
            Store.updateJob(job.id, patch);
            migratedJobs++;
        });

        // Canlı kaydı olmayan tipler varsayılana (zaten temiz) düşmeye devam eder;
        // yalnızca canlıda tanımlı olanları güncelle.
        if (w.inLive) newWorkflows[w.title] = mapping.newConf;
    });
    Store.setWorkflows(newWorkflows);
    safeSetStorage('epdk_workflows', Store.workflows);

    // ---- 3) Kullanıcılar --------------------------------------------------
    let deactivated = 0;
    const inactive = new Set((Store.inactiveUsers || []).map(e => String(e).toLowerCase()));
    for (const u of plan.users) {
        if (u.alreadyInactive) continue;
        inactive.add(String(u.email).toLowerCase());
        deactivated++;
        // Profil belgesindeki bayrak en iyi gayretle yazılır (kurallar izin
        // vermezse sorun değil: asıl kaynak master.inactiveUsers).
        saveUserProfile({ email: u.email, active: false, deactivatedAt: stamp }).catch(() => {});
    }
    Store.inactiveUsers = [...inactive];
    try {
        await setDoc(doc(db, 'daVinciData', 'master'), { inactiveUsers: Store.inactiveUsers }, { merge: true });
    } catch (err) {
        logError('Pasif kullanıcı listesi yazılamadı', err);
    }

    // ---- 4) Bulut ---------------------------------------------------------
    saveData();
    await flushCloudSync();

    return { ok: true, summary: { workflows: plan.workflows.length, jobs: migratedJobs, users: deactivated, backupId } };
}

/** Son güncellemeyi yedekten geri yükler. */
export async function undoLastCleanup() {
    if (!auth.currentUser) return { ok: false, error: 'Oturum açık değil.' };
    try {
        const masterSnap = await getDoc(doc(db, 'daVinciData', 'master'));
        const backupId = masterSnap.exists() ? masterSnap.data()[LAST_BACKUP_FIELD] : null;
        if (!backupId) return { ok: false, error: 'Geri yüklenecek bir yedek bulunamadı.' };
        const snap = await getDoc(doc(db, 'daVinciData', backupId));
        if (!snap.exists()) return { ok: false, error: 'Yedek belgesi bulunamadı.' };
        const backup = snap.data();

        Store.setWorkflows(backup.workflows || Store.workflows);
        safeSetStorage('epdk_workflows', Store.workflows);

        (backup.jobs || []).forEach(b => {
            // null (undefined değil): Firestore undefined değeri kabul etmez.
            Store.updateJob(b.id, {
                steps: b.steps,
                currentStep: b.currentStep,
                archivedSteps: b.archivedSteps || null
            });
        });

        Store.inactiveUsers = backup.inactiveUsersBefore || [];
        await setDoc(doc(db, 'daVinciData', 'master'), { inactiveUsers: Store.inactiveUsers }, { merge: true });
        for (const email of (backup.usersTouched || [])) {
            if (!Store.inactiveUsers.includes(String(email).toLowerCase())) {
                saveUserProfile({ email, active: true }).catch(() => {});
            }
        }
        saveData();
        await flushCloudSync();
        return { ok: true };
    } catch (err) {
        logError('Güncelleme geri alınamadı', err);
        return { ok: false, error: 'Geri alma sırasında hata oluştu: ' + err.message };
    }
}

// ---------------------------------------------------------------------------
// Ayarlar sayfasındaki kart
// ---------------------------------------------------------------------------

const isLocalHost = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

function renderPlan(plan) {
    if (!plan.needsWork) {
        return `<p style="color:#10b981; font-weight:600;">✅ Güncelleme uygulanmış. Yapılacak bir şey kalmadı.</p>`;
    }
    const wf = plan.workflows.map(w => `
        <li><strong>${escapeHtml(w.title)}</strong>: ${w.removed.map(escapeHtml).join(', ')} kaldırılacak
        (${w.before} → ${w.after} aşama)${w.inLive ? '' : ' <em>(varsayılan tanım)</em>'}</li>`).join('');
    const jobsWithArchive = plan.jobs.filter(j => j.archivedTypes.length).length;
    const users = plan.users.length
        ? plan.users.map(u => `<li><strong>${escapeHtml(u.displayName)}</strong> (${escapeHtml(u.email)}) —
            ${u.alreadyInactive ? 'zaten pasif' : 'pasif yapılacak'}${u.openJobs ? `; üzerinde <strong>${u.openJobs}</strong> açık tadil atanmış (atamaları değişmez)` : ''}</li>`).join('')
        : '<li style="color:var(--text-muted);">"Gamze Durum" adlı bir kullanıcı bulunamadı.</li>';
    const skipped = plan.skipped.length
        ? `<p style="color:#f59e0b; font-size:12px;">⚠️ ${plan.skipped.length} kaydın aşama şekli beklenenden farklı; bunlara dokunulmayacak.</p>` : '';
    return `
        <div style="font-size:13px; line-height:1.55;">
            <strong>İş akışları (${plan.workflows.length})</strong>
            <ul style="margin:6px 0 12px 18px;">${wf || '<li style="color:var(--text-muted);">Değişecek iş akışı yok.</li>'}</ul>
            <strong>Etkilenen tadil kayıtları: ${plan.jobs.length}</strong>
            <span style="color:var(--text-muted);"> — girilmiş verisi olan ${jobsWithArchive} kaydın kaldırılan aşama verisi silinmeden arşivlenecek.</span>
            ${skipped}
            <div style="margin-top:12px;"><strong>Kullanıcılar</strong></div>
            <ul style="margin:6px 0 0 18px;">${users}</ul>
        </div>`;
}

export function renderCleanupCard() {
    const host = document.getElementById('cleanupMigrationBody');
    if (!host) return;

    let plan;
    try {
        plan = analyzeCleanup();
    } catch (e) {
        logError('Güncelleme analizi', e);
        host.innerHTML = '<p style="color:#ef4444;">Önizleme hazırlanamadı. Sayfayı yenileyip tekrar deneyin.</p>';
        return;
    }

    const localWarn = isLocalHost()
        ? `<div style="background:rgba(245,158,11,0.12); border-left:3px solid #f59e0b; padding:10px 12px; border-radius:6px; margin-bottom:14px; font-size:12px;">
              ⚠️ Şu an <strong>localhost</strong>'tasınız ama uygulama <strong>canlı veritabanına</strong> bağlı.
              "Uygula"ya basarsanız değişiklik canlıya da yansır. Yalnızca önizlemeyi görmek güvenlidir.
           </div>` : '';

    host.innerHTML = `
        ${localWarn}
        ${renderPlan(plan)}
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
            <button class="btn btn-primary" id="cleanupApplyBtn" ${plan.needsWork ? '' : 'disabled'}>✅ Güncellemeyi Uygula (önce yedek alınır)</button>
            <button class="btn btn-secondary" id="cleanupRefreshBtn">🔄 Önizlemeyi Yenile</button>
            <button class="btn btn-secondary" id="cleanupUndoBtn">↩️ Son Güncellemeyi Geri Al</button>
        </div>
        <p id="cleanupStatus" style="font-size:12px; color:var(--text-muted); margin-top:10px;"></p>`;

    const status = (msg) => { const el = document.getElementById('cleanupStatus'); if (el) el.textContent = msg; };

    document.getElementById('cleanupRefreshBtn').onclick = () => renderCleanupCard();

    const applyBtn = document.getElementById('cleanupApplyBtn');
    applyBtn.onclick = async () => {
        const ok = confirm(
            `${plan.workflows.length} iş akışı, ${plan.jobs.length} tadil kaydı ve ` +
            `${plan.users.filter(u => !u.alreadyInactive).length} kullanıcı güncellenecek.\n\n` +
            'Önce otomatik yedek alınır (ayrıca bilgisayarınıza bir JSON dosyası inecek). Devam edilsin mi?'
        );
        if (!ok) return;
        applyBtn.disabled = true;
        status('Yedek alınıyor ve güncelleme uygulanıyor...');
        const res = await applyCleanup();
        if (res.ok) {
            showToast('Güncelleme tamamlandı. Eski aşama verileri arşivlendi.', 'success');
            window.dispatchEvent(new CustomEvent('data-refreshed'));
        } else {
            showToast(res.error || 'Güncelleme uygulanamadı.', 'error');
        }
        renderCleanupCard();
    };

    document.getElementById('cleanupUndoBtn').onclick = async () => {
        if (!confirm('Son güncelleme yedekten geri alınacak. Güncellemeden SONRA o tadillerde yapılan aşama değişiklikleri de eski haline döner. Devam edilsin mi?')) return;
        status('Geri alınıyor...');
        const res = await undoLastCleanup();
        showToast(res.ok ? 'Güncelleme geri alındı.' : (res.error || 'Geri alınamadı.'), res.ok ? 'success' : 'error');
        if (res.ok) window.dispatchEvent(new CustomEvent('data-refreshed'));
        renderCleanupCard();
    };
}

// Salt-okunur yardımcılar, yalnızca otomatik testler için.
export const __testing = { buildNewConf, planJob, stepsConfFor };
