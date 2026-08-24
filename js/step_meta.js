/**
 * Aşama meta verisi: sorumluluk (biz / dış) ve Scrum zorluk puanı.
 *
 * İki katmanlı çözümleme:
 *   1. İş akışı tanımındaki adımın kendi `owner` / `difficulty` alanı
 *      (iş akışı düzenleyicisinden verilen, o tadil tipine özel değer)
 *   2. Store.stepMeta[type] - ayarlar sayfasından verilen genel değer
 *   3. STEP_META_DEFAULTS[type] - uygulamayla gelen makul varsayılan
 *
 * Sadece Store'a bağımlı; jobs.js'i import etmez (jobs.js bu modülü import
 * ettiği için döngüsel bağımlılık oluşmasın diye adım tanımı parametre olarak
 * geçirilir).
 */

import { Store } from './store.js';

/** Aksiyonu bizim (lisans birimi) almamız gereken aşama. */
export const OWNER_US = 'us';
/** Karşı taraftan (kurum, birim, imza makamı) dönüş beklenen aşama. */
export const OWNER_EXTERNAL = 'external';

/** Scrum planlama pokerindeki Fibonacci puanları. */
export const SCRUM_POINTS = [1, 2, 3, 5, 8, 13];

/** Puan -> insan okunur zorluk etiketi (rozetlerde ve tooltiplerde). */
export const DIFFICULTY_LABELS = {
    1: 'Çok Kolay',
    2: 'Kolay',
    3: 'Orta',
    5: 'Zor',
    8: 'Çok Zor',
    13: 'En Zor'
};

/** Meta verisi hiç bulunamayan (yeni oluşturulmuş özel) aşamalar için taban. */
export const FALLBACK_STEP_META = { owner: OWNER_US, difficulty: 3 };

/**
 * Uygulamayla gelen varsayılan atamalar.
 *
 * owner: aşamanın topu kimde - biz mi ilerleteceğiz, yoksa dışarıdan dönüş mü
 * bekliyoruz. difficulty: aşamanın bize maliyeti (Scrum puanı); tadil bedeli
 * istemek 1, başvuru hazırlamak 13.
 *
 * Bunlar yalnızca başlangıç değeri: Ayarlar > "Aşama Sorumluluk & Zorluk"
 * kartından hepsi tek tek değiştirilebilir, iş akışı düzenleyicisinden de
 * tadil tipine özel olarak ezilebilir.
 */
export const STEP_META_DEFAULTS = {
    // --- Bizim yürüttüğümüz kalemler ---
    TADIL_BEDELI: { owner: OWNER_US, difficulty: 1 },
    BILGI_NOTU_TALEBI: { owner: OWNER_US, difficulty: 2 },
    BASVURU: { owner: OWNER_US, difficulty: 13 },
    EPDK_BASVURU_HAZIRLIK: { owner: OWNER_US, difficulty: 8 },
    EPDK_BASVURU_YAPILMASI: { owner: OWNER_US, difficulty: 8 },
    EVRAK_EPDK_SUNULMASI: { owner: OWNER_US, difficulty: 2 },
    OZET_OZET_ISTEME: { owner: OWNER_US, difficulty: 1 },
    AO_HAZIRLIK: { owner: OWNER_US, difficulty: 8 },
    GD_KONTROL: { owner: OWNER_US, difficulty: 3 },
    ZK_KONTROL: { owner: OWNER_US, difficulty: 2 },
    YUKUMLULUK_TANIMLAMA: { owner: OWNER_US, difficulty: 3 },
    YUKUMLULUK_TAMAMLAMA: { owner: OWNER_US, difficulty: 8 },
    BELGE_TESLIM: { owner: OWNER_US, difficulty: 1 },
    DAGITIM: { owner: OWNER_US, difficulty: 1 },
    TEMINAT_IADESI: { owner: OWNER_US, difficulty: 2 },
    GENEL_SONUCLANDIRMA: { owner: OWNER_US, difficulty: 2 },

    // --- Dışarıdan dönüş beklediğimiz kalemler ---
    OZET_BIRIM_DONUSU: { owner: OWNER_EXTERNAL, difficulty: 2 },
    KURUM_GORUS_TEIAS_EIGM: { owner: OWNER_EXTERNAL, difficulty: 3 },
    KURUM_GORUS_TEIAS: { owner: OWNER_EXTERNAL, difficulty: 2 },
    KURUM_GORUS_EIGM: { owner: OWNER_EXTERNAL, difficulty: 2 },
    KURUM_GORUS_KDB: { owner: OWNER_EXTERNAL, difficulty: 2 },
    KDB_GORUS_CIKIS: { owner: OWNER_EXTERNAL, difficulty: 1 },
    KDB_GORUS_DONUS: { owner: OWNER_EXTERNAL, difficulty: 3 },
    OLUR_MUZEKKERE_YAZIMI: { owner: OWNER_EXTERNAL, difficulty: 5 },
    OLUR_IMZALANMASI_VE_GUNDEM: { owner: OWNER_EXTERNAL, difficulty: 3 },
    DERC_EDILME: { owner: OWNER_EXTERNAL, difficulty: 2 },
    MUHATAP_YETKILISI_TANIMLANMASI: { owner: OWNER_EXTERNAL, difficulty: 1 },
    GENEL_DEGERLENDIRME: { owner: OWNER_EXTERNAL, difficulty: 3 }
};

// ---------------------------------------------------------------------------
// Çözümleme
// ---------------------------------------------------------------------------

function normalizeOwner(value) {
    return value === OWNER_EXTERNAL ? OWNER_EXTERNAL : (value === OWNER_US ? OWNER_US : null);
}

function normalizeDifficulty(value) {
    const n = Number(value);
    return SCRUM_POINTS.includes(n) ? n : null;
}

/** Bir aşama tipi için genel (tüm iş akışlarında geçerli) ayar. */
export function getTypeMeta(type) {
    const custom = (Store.stepMeta || {})[type] || {};
    const fallback = STEP_META_DEFAULTS[type] || FALLBACK_STEP_META;
    return {
        owner: normalizeOwner(custom.owner) || fallback.owner,
        difficulty: normalizeDifficulty(custom.difficulty) || fallback.difficulty
    };
}

/**
 * Bir iş akışı adımının etkin meta verisi.
 *
 * @param {{type: string, owner?: string, difficulty?: number}} stepConf
 * @returns {{owner: string, difficulty: number, ownerOverridden: boolean, difficultyOverridden: boolean}}
 */
export function resolveStepMeta(stepConf) {
    const type = stepConf?.type;
    const base = getTypeMeta(type);
    const ownerOverride = normalizeOwner(stepConf?.owner);
    const difficultyOverride = normalizeDifficulty(stepConf?.difficulty);
    return {
        owner: ownerOverride || base.owner,
        difficulty: difficultyOverride || base.difficulty,
        ownerOverridden: !!ownerOverride,
        difficultyOverridden: !!difficultyOverride
    };
}

export function isOurStep(stepConf) {
    return resolveStepMeta(stepConf).owner === OWNER_US;
}

export function getOwnerLabel(owner) {
    return owner === OWNER_EXTERNAL ? 'Dış Taraf' : 'Biz (Lisans Birimi)';
}

export function getOwnerIcon(owner) {
    return owner === OWNER_EXTERNAL ? '⏳' : '🙋';
}

// ---------------------------------------------------------------------------
// Scrum ağırlıklı ilerleme
// ---------------------------------------------------------------------------

/**
 * Adım sayısı yerine Scrum puanlarına göre ilerleme.
 *
 * 10 adımlık bir tadilde "tadil bedeli" (1 puan) ile "başvuru hazırlama"
 * (13 puan) aynı %10'u temsil etmesin diye; tamamlanan puan / toplam puan.
 *
 * @param {object} job
 * @param {Array} stepsConf - getWorkflowSteps(job) çıktısı
 */
export function getWeightedProgress(job, stepsConf) {
    const conf = stepsConf || [];
    let done = 0;
    let total = 0;
    const isJobCompleted = job?.status === 'completed';

    conf.forEach((stepConf, idx) => {
        const points = resolveStepMeta(stepConf).difficulty;
        total += points;
        if (isJobCompleted || job?.steps?.[`step${idx + 1}`]?.completed) done += points;
    });

    if (total === 0) return { percent: isJobCompleted ? 100 : 0, done: 0, total: 0 };
    return { percent: Math.round((done / total) * 100), done, total };
}

// ---------------------------------------------------------------------------
// Akıllı sıralama yardımcıları
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Bir adım nesnesinin içindeki en yeni ISO tarihi (iç içe alanlar dahil). */
function latestDateIn(obj, acc) {
    if (!obj) return acc;
    if (typeof obj === 'string') {
        if (ISO_DATE_RE.test(obj)) {
            const d = new Date(obj);
            if (!isNaN(d.getTime()) && (!acc || d > acc)) return d;
        }
        return acc;
    }
    if (typeof obj === 'object') {
        let best = acc;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) best = latestDateIn(obj[key], best);
        }
        return best;
    }
    return acc;
}

/**
 * Tadilin mevcut aşamasına ne zaman girdiği - yani en son ne zaman kıpırdadığı.
 *
 * Mevcut aşamaya kadar (o aşama dahil) girilmiş tarihlerin en yenisi. Hiç tarih
 * yoksa kaydın oluşturulma tarihine düşer. Akıllı sıralamada "en eski" olan en
 * üste çıkar: en uzun süredir bekleyen iş.
 *
 * @returns {Date|null}
 */
export function getCurrentStageDate(job) {
    if (!job) return null;
    const current = Math.max(1, job.currentStep || 1);
    let latest = null;
    for (let i = 1; i <= current; i++) {
        latest = latestDateIn(job.steps?.[`step${i}`], latest);
    }
    if (latest) return latest;

    const fallback = job.updatedAt || job.createdAt;
    if (!fallback) return null;
    const d = fallback instanceof Date ? fallback : new Date(fallback);
    return isNaN(d.getTime()) ? null : d;
}

/** Mevcut aşamanın üzerinden geçen gün sayısı (tarih yoksa null). */
export function getStageWaitingDays(job) {
    const d = getCurrentStageDate(job);
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - target) / (1000 * 60 * 60 * 24)));
}
