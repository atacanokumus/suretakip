/**
 * Firebase Cloud Functions for Email Notifications
 * DaVinci Süre Takip Platformu
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { Resend } = require("resend");
const TeamsAIHelper = require("./teams_ai_helper");
const { WORKFLOW_STAGE_LABELS } = require("./workflow_labels");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Push notifications for the iOS shell. Required after initializeApp() so the
// admin SDK is ready when push.js grabs Firestore/Auth/Messaging handles.
const push = require("./push");

exports.registerPushToken = push.registerPushToken;
exports.unregisterPushToken = push.unregisterPushToken;
exports.sendManualPush = push.sendManualPush;
exports.listPushDevices = push.listPushDevices;
exports.onMasterDataChanged = push.onMasterDataChanged;

// Resend & Gemini API Keys (loaded via process.env)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const aiHelper = GEMINI_API_KEY ? new TeamsAIHelper(GEMINI_API_KEY) : null;

// Target email (must match the email you used to sign up for Resend in Sandbox mode)
const TARGET_EMAIL = "atacan.okumus@gmail.com";
const FROM_EMAIL = "DaVinci Süre Takip <onboarding@resend.dev>";

/**
 * Helper: Parse input into a Date object (Basic parsing)
 */
function parseRawDate(value) {
    if (!value) return null;
    if (value.toDate && typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string') {
        // Try DD.MM.YYYY
        const parts = value.split('.');
        if (parts.length === 3) {
            // Create UTC midnight directly from components
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(Date.UTC(year, month, day));
        }
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Helper: Normalize any date to Istanbul Calendar Date (UTC Midnight)
 * This ensures "12 Feb 2026 00:00 Istanbul" becomes "12 Feb 2026 00:00 UTC"
 * effectively stripping timezone and keeping the calendar date constant.
 */
function getIstanbulDate(dateInput) {
    const d = parseRawDate(dateInput) || new Date(); // Default to now if null/invalid, but usually we pass specific dates

    // Format to Istanbul timezone parts
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    // YYYY-MM-DD
    const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(d);

    // Return UTC midnight of that Istanbul date
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
}

/**
 * Helper: Get today's date in Istanbul (UTC Midnight)
 */
function getTodayIstanbul() {
    return getIstanbulDate(new Date());
}

/**
 * Helper: Calculate days until deadline
 */
function getDaysUntil(deadline) {
    if (!deadline) return 999;

    // Normalize both to Istanbul Calendar Date (UTC Midnight)
    const d = getIstanbulDate(deadline);
    const today = getTodayIstanbul();

    const diffTime = d.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Helper: Format date in Turkish (Consistent with Istanbul Date)
 */
function formatDate(date) {
    if (!date) return '-';
    // Normalize to Istanbul date first (UTC Midnight)
    const d = getIstanbulDate(date);

    const day = d.getUTCDate();
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();

    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    return `${day.toString().padStart(2, '0')} ${monthNames[month]} ${year}`;
}

// Keep parseDate for backward compatibility if needed elsewhere, but alias it
const parseDate = parseRawDate;

/**
 * Generate HTML email for milestone alert
 */
function generateMilestoneEmail(obligation, daysLeft) {
    const urgencyColor = daysLeft === 0 ? '#ef4444' : daysLeft === 1 ? '#f59e0b' : '#6366f1';
    const urgencyText = daysLeft === 0 ? '🚨 BUGÜN SON GÜN!' :
        daysLeft === 1 ? '⚠️ Son 24 Saat!' :
            `📅 ${daysLeft} Gün Kaldı`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #000000; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; }
            .header { text-align: center; margin-bottom: 24px; }
            .urgency { background: ${urgencyColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
            .project { font-size: 24px; font-weight: bold; margin: 16px 0; color: #6366f1; }
            .detail { background: #ffffff; padding: 16px; border-radius: 12px; margin: 16px 0; border: 1px solid #e2e8f0; }
            .label { color: #64748b; font-size: 12px; text-transform: uppercase; }
            .value { font-size: 16px; margin-top: 4px; color: #000000; }
            .footer { text-align: center; margin-top: 24px; color: #64748b; font-size: 12px; }
            .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="urgency">${urgencyText}</span>
                <div class="project">${obligation.projectName}</div>
            </div>
            
            <div class="detail">
                <div class="label">Yükümlülük Türü</div>
                <div class="value">${obligation.obligationType}</div>
            </div>
            
            <div class="detail">
                <div class="label">Açıklama</div>
                <div class="value">${obligation.obligationDescription}</div>
            </div>
            
            <div class="detail">
                <div class="label">Son Tarih</div>
                <div class="value" style="color: ${urgencyColor}; font-weight: bold;">${formatDate(obligation.deadline)}</div>
            </div>
            
            <div style="text-align: center;">
                <a href="https://sure-takip.web.app" class="btn">Platforma Git →</a>
            </div>
            
            <div class="footer">
                Bu e-posta DaVinci Süre Takip Platformu tarafından otomatik olarak gönderilmiştir.
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate HTML for weekly report (Simplified with Download Button)
 */
function generateWeeklyReportEmail(obligations) {
    // Calendar Week Logic (Monday to Sunday)
    const now = new Date();
    // Force Turkey time zone for calculation if needed, but for now rely on server time (UTC) or offset
    // To be safe, we'll use local calculations but be aware of UTC offset in Cloud Functions

    const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
    // Adjust so 0 is Monday, 6 is Sunday
    // if day is Sunday (0), currentDay should be 6. If Mon (1), 0.
    const currentDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const startOfThisWeek = new Date(now);
    startOfThisWeek.setHours(0, 0, 0, 0);
    startOfThisWeek.setDate(now.getDate() - currentDay);

    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
    endOfThisWeek.setHours(23, 59, 59, 999);

    const startOfNextWeek = new Date(endOfThisWeek);
    startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
    startOfNextWeek.setHours(0, 0, 0, 0);

    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);

    console.log(`Debug Week: This[${startOfThisWeek.toISOString()}-${endOfThisWeek.toISOString()}] Next[${startOfNextWeek.toISOString()}-${endOfNextWeek.toISOString()}]`);

    const thisWeek = obligations.filter(o => {
        const d = parseDate(o.deadline);
        if (!d) return false;
        // Normalize d to start of day for fairer comparison or just compare timestamps
        const inRange = d >= startOfThisWeek && d <= endOfThisWeek;
        // console.log(`Debug Ob: ${o.projectName} Date:${d.toISOString()} InThisWeek:${inRange}`);
        return inRange;
    });

    const nextWeek = obligations.filter(o => {
        const d = parseDate(o.deadline);
        return d && d >= startOfNextWeek && d <= endOfNextWeek;
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #000000; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; text-align: center; }
            h1 { color: #6366f1; margin-bottom: 24px; }
            .stat-box { background: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #6366f1; }
            .btn { display: inline-block; background: #6366f1; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 10px; }
            .footer { color: #64748b; font-size: 12px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 Haftalık Yükümlülük Raporu</h1>
            <p style="color: #cbd5e1; margin-bottom: 30px;">Haftalık raporunuz hazır. Detayları görüntülemek ve güncel raporu PDF olarak indirmek için aşağıdaki butona tıklayın.</p>
            
            <div class="stat-box">
                <div style="font-size: 36px; font-weight: bold; color: #a855f7;">${obligations.length}</div>
                <div style="color: #64748b;">Toplam Aktif Yükümlülük</div>
                <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
                    <span style="color: #f59e0b;">Bu Hafta: ${thisWeek.length}</span> • 
                    <span style="color: #34d399;">Gelecek Hafta: ${nextWeek.length}</span>
                </div>
            </div>

            <!-- Magic Link to Trigger Report Download -->
            <a href="https://sure-takip.web.app/?action=download_report" class="btn">
                📥 Raporu İndir ve Görüntüle
            </a>
            
            <div class="footer">
                Bu buton sizi uygulamaya yönlendirecek ve rapor otomatik olarak inmeye başlayacaktır.
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Stages tracked on the prelicence extension matrix, and the field each one
 * keeps its date in. Mirrors MATRIX_STEPS in js/jobs.js.
 */
const PRELICENCE_STAGES = [
    { key: "step1", field: "date", label: "1. Özet İsteme" },
    { key: "step2", field: "izinlerDate", label: "2. Birim Görüş Dönüşü" },
    { key: "step3", field: "date", label: "3. AO Hazırlık" },
    { key: "step4", field: "date", label: "4. GD Kontrol" },
    { key: "step5", field: "date", label: "5. EPDK Başvuru Hazırlık" },
    { key: "step6", field: "date", label: "6. EPDK Başvuru" },
    { key: "step8", field: "kdbTarih", label: "7-8. KDB Görüşü" },
    { key: "step11", field: "date", label: "9-11. Derç Edilme" }
];

/**
 * Every amendment currently in progress, with the stage it sits on.
 *
 * Deliberately has no date window: unlike the other two blocks this is a
 * "where does everything stand right now" list, not a deadline warning.
 *
 * Membership mirrors the Tadiller & Süreç Takibi page exactly - unstarted
 * prelicence matrix rows are excluded, because those are future plans rather
 * than live work and would otherwise add ~30 rows of noise.
 */
function collectActiveJobs(data) {
    const jobs = data.jobs || [];
    const companyByProject = new Map(
        (data.projects || []).map((p) => [p.name, p.company || ""])
    );

    return jobs
        .filter((j) => {
            if (!j || j.status === "completed") return false;
            // Started prelicence extensions count; untouched ones don't.
            if (isPrelicenceMatrixJob(j)) {
                const steps = j.steps || {};
                return Object.keys(steps).some((k) => steps[k] && steps[k].completed);
            }
            return true;
        })
        .map((j) => {
            const title = j.title || "";
            const labels = WORKFLOW_STAGE_LABELS[title] || [];
            const step = j.currentStep || 1;
            const label = labels[step - 1];
            return {
                company: companyByProject.get(j.project) || "—",
                project: j.project || "—",
                // Extensions carry the specific licence article in subTitle
                // (e.g. "T15 TESİS TAMAMLAMA"), which is what distinguishes
                // two extensions on the same project.
                type: isPrelicenceMatrixJob(j) && j.subTitle ? `${title} (${j.subTitle})` : title,
                stage: label ? `${step}. ${label}` : `Aşama ${step}`,
                totalStages: labels.length || null
            };
        })
        .sort((a, b) => {
            // Projects with no company on file sort last rather than leading
            // the table with a column of dashes.
            const aUnknown = a.company === "—";
            const bUnknown = b.company === "—";
            if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
            return a.company.localeCompare(b.company, "tr") ||
                a.project.localeCompare(b.project, "tr");
        });
}

/** Rows that come from the prelicence matrix (same test as js/jobs.js). */
function isPrelicenceMatrixJob(job) {
    if (!job) return false;
    if (job.matrixRow) return true;
    const t = job.title || "";
    return t.includes("Süre Uzatımı") || t.includes("Süre Uzatım") || t.includes("İLERLEME RAPORLARI");
}

/**
 * Prelicence matrix stages falling due within the next 7 days, or already
 * overdue.
 *
 * These are deliberately NOT modelled as obligations: ~30 projects x ~10
 * stages would dump ~300 rows into the obligations list for work that already
 * has its own page and its own workflow. The digest reports them as a separate
 * block instead, so the two are read and judged independently.
 */
function collectPrelicenceStageItems(jobs) {
    const items = [];

    (jobs || []).forEach((job) => {
        if (!isPrelicenceMatrixJob(job) || job.status === "completed") return;
        const steps = job.steps || {};

        PRELICENCE_STAGES.forEach((stage) => {
            const step = steps[stage.key];
            if (!step || step.completed) return;

            const raw = step[stage.field] || step.date || step.plannedDate;
            if (!raw) return;

            const days = getDaysUntil(raw);
            if (!Number.isFinite(days) || days > 7) return;

            items.push({
                project: job.project || "",
                title: job.subTitle || job.title || "",
                stage: stage.label,
                days
            });
        });
    });

    // Most urgent first, overdue at the top.
    items.sort((a, b) => a.days - b.days);
    return items;
}

/**
 * Builds the daily digest: the computed lists, the subject line and the HTML.
 *
 * This exists as one function because the digest previously had two separate
 * implementations - the real 08:00 send in checkDeadlines, and a different one
 * behind testEmail?type=real ("Günlük Analiz Raporu") that ignored the 7-day
 * window and just listed the nearest 10 obligations. The test button therefore
 * never showed what would actually be sent, which makes testing worthless.
 * Both paths now call this.
 *
 * @returns {{subject: string, html: string, counts: object, isEmpty: boolean,
 *            todayAndOverdue: Array, upcomingNext7Days: Array,
 *            aoTasks: Array, gdTasks: Array, prelicenceItems: Array}}
 */
function buildDailyDigest(data) {
    const obligations = data.obligations || [];
    const jobs = data.jobs || [];
    const todayAndOverdue = [];
    const upcomingNext7Days = [];

    obligations.forEach((o) => {
        if (o.status === 'completed') return;
        const days = getDaysUntil(o.deadline);
        if (!Number.isFinite(days)) return;
        if (days <= 0) {
            todayAndOverdue.push({ ...o, days });
        } else if (days <= 7) {
            upcomingNext7Days.push({ ...o, days });
        }
    });

    todayAndOverdue.sort((a, b) => a.days - b.days);
    upcomingNext7Days.sort((a, b) => a.days - b.days);

    // Writing tasks sitting on the current stage of an extension.
    const aoTasks = [];
    const gdTasks = [];
    jobs.forEach((j) => {
        if (j.status === 'completed') return;
        const currentStep = j.currentStep || 1;
        const sData = (j.steps || {})[`step${currentStep}`] || {};
        if (j.title && j.title.includes('Süre Uzatımı')) {
            if (currentStep === 3 && !sData.completed && !sData.aoDone) aoTasks.push(j);
            else if (currentStep === 4 && !sData.completed && !sData.gdDone) gdTasks.push(j);
        }
    });

    const prelicenceItems = collectPrelicenceStageItems(jobs);
    // No date filter: this block reports current status, not deadlines.
    const activeJobs = collectActiveJobs(data);

    const isEmpty = todayAndOverdue.length === 0 && upcomingNext7Days.length === 0 &&
        aoTasks.length === 0 && gdTasks.length === 0 && prelicenceItems.length === 0;

    const renderRow = (o) => `
        <tr>
            <td style="padding:10px; border-bottom:1px solid #eee;"><strong>${o.projectName}</strong></td>
            <td style="padding:10px; border-bottom:1px solid #eee;">${o.obligationType}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; color:${o.days <= 0 ? '#ef4444' : '#f59e0b'};">
                <strong>${o.days === 0 ? 'BUGÜN' : (o.days < 0 ? Math.abs(o.days) + ' gün geçti' : o.days + ' gün kaldı')}</strong>
            </td>
        </tr>`;

    const renderActiveJobRow = (j) => `
        <tr>
            <td style="padding:10px; border-bottom:1px solid #eee; font-size:13px; color:#6b7280;">${j.company}</td>
            <td style="padding:10px; border-bottom:1px solid #eee;"><strong>${j.project}</strong></td>
            <td style="padding:10px; border-bottom:1px solid #eee; font-size:13px;">${j.type}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; color:#8b5cf6; font-size:13px; font-weight:600;">
                ${j.stage}${j.totalStages ? ` <span style="color:#9ca3af; font-weight:400;">/ ${j.totalStages}</span>` : ''}
            </td>
        </tr>`;

    const renderPrelicenceRow = (p) => `
        <tr>
            <td style="padding:10px; border-bottom:1px solid #eee;"><strong>${p.project}</strong><br>
                <span style="color:#6b7280; font-size:12px;">${p.title}</span></td>
            <td style="padding:10px; border-bottom:1px solid #eee; color:#0ea5e9; font-size:13px;">${p.stage}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; color:${p.days <= 0 ? '#ef4444' : '#f59e0b'};">
                <strong>${p.days === 0 ? 'BUGÜN' : (p.days < 0 ? Math.abs(p.days) + ' gün geçti' : p.days + ' gün kaldı')}</strong>
            </td>
        </tr>`;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; color: #1f2937;">
            <h2 style="color: #6366f1; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px;">📅 Günlük Özet Hatırlatıcı</h2>

            ${aoTasks.length > 0 ? `
                <div style="background: #eef2ff; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 8px; margin-top: 16px;">
                    <h3 style="color: #4338ca; margin: 0 0 8px 0; font-size: 15px;">✏️ Atacan Okumuş - Hazırlanacak Yazılar (AO)</h3>
                    <ul style="margin: 0; padding-left: 18px; color: #374151; font-size: 13px;">
                        ${aoTasks.map(j => `<li style="margin-bottom: 4px;"><strong>${j.project}</strong> — ${j.title} (Başvuru Yazısı Hazırlığı)</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${gdTasks.length > 0 ? `
                <div style="background: #fdf2f8; border-left: 4px solid #ec4899; padding: 12px 16px; border-radius: 8px; margin-top: 16px;">
                    <h3 style="color: #be185d; margin: 0 0 8px 0; font-size: 15px;">🔍 Gamze Durum - Kontrol Edilecek Yazılar (GD)</h3>
                    <ul style="margin: 0; padding-left: 18px; color: #374151; font-size: 13px;">
                        ${gdTasks.map(j => `<li style="margin-bottom: 4px;"><strong>${j.project}</strong> — ${j.title} (Yazı Kontrolü & Onay)</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- BLOCK 1: obligations -->
            ${todayAndOverdue.length > 0 ? `
                <h3 style="color: #ef4444; margin-top: 24px;">🚨 Bugün ve Gecikmiş Yükümlülükler (${todayAndOverdue.length})</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    ${todayAndOverdue.map(renderRow).join('')}
                </table>
            ` : ''}

            ${upcomingNext7Days.length > 0 ? `
                <h3 style="color: #f59e0b; margin-top: 24px;">🗓️ Önümüzdeki 7 Gün — Yükümlülükler (${upcomingNext7Days.length})</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    ${upcomingNext7Days.map(renderRow).join('')}
                </table>
            ` : ''}

            ${todayAndOverdue.length === 0 && upcomingNext7Days.length === 0 ? `
                <p style="color:#6b7280; font-size:13px; margin-top:24px;">
                    Önümüzdeki 7 gün içinde vadesi gelen yükümlülük yok.
                </p>
            ` : ''}

            <!-- BLOCK 2: status of every live amendment, no date window -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 3px solid #e5e7eb;">
                <h3 style="color: #8b5cf6; margin: 0 0 4px 0;">⚡ Aktif Tadiller ve Bulundukları Aşamalar (${activeJobs.length})</h3>
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 12px 0;">
                    Devam eden tüm tadil süreçleri ve son durumları. Tarih kısıtı yoktur.
                </p>
                ${activeJobs.length > 0 ? `
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <th style="text-align:left; padding:8px 10px; background:#f9fafb; color:#6b7280; font-size:11px; text-transform:uppercase; border-bottom:2px solid #e5e7eb;">Şirket</th>
                            <th style="text-align:left; padding:8px 10px; background:#f9fafb; color:#6b7280; font-size:11px; text-transform:uppercase; border-bottom:2px solid #e5e7eb;">Proje</th>
                            <th style="text-align:left; padding:8px 10px; background:#f9fafb; color:#6b7280; font-size:11px; text-transform:uppercase; border-bottom:2px solid #e5e7eb;">Tadil Çeşidi</th>
                            <th style="text-align:left; padding:8px 10px; background:#f9fafb; color:#6b7280; font-size:11px; text-transform:uppercase; border-bottom:2px solid #e5e7eb;">Bulunduğu Aşama</th>
                        </tr>
                        ${activeJobs.map(renderActiveJobRow).join('')}
                    </table>
                ` : `
                    <p style="color:#6b7280; font-size:13px; margin:0;">Devam eden aktif tadil bulunmuyor.</p>
                `}
            </div>

            <!-- BLOCK 3: prelicence extension stages, judged separately -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 3px solid #e5e7eb;">
                <h3 style="color: #0ea5e9; margin: 0 0 4px 0;">🔄 Önümüzdeki 7 Gün — Önlisans Süre Uzatımı İş Kalemleri (${prelicenceItems.length})</h3>
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 12px 0;">
                    Bu kalemler yükümlülük değildir; önlisans süre uzatımı matrisinden gelir ve ayrı değerlendirilir.
                </p>
                ${prelicenceItems.length > 0 ? `
                    <table style="width: 100%; border-collapse: collapse;">
                        ${prelicenceItems.map(renderPrelicenceRow).join('')}
                    </table>
                ` : `
                    <p style="color:#6b7280; font-size:13px; margin:0;">
                        Önümüzdeki 7 gün içinde vadesi gelen önlisans süre uzatımı aşaması yok.
                    </p>
                `}
            </div>

            <div style="margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 8px; font-size: 14px; text-align: center;">
                Bu mail e-posta kotanızı korumak için toplu olarak gönderilmiştir.<br>
                <a href="https://sure-takip.web.app" style="color: #6366f1; text-decoration: none; font-weight: bold;">Platforma Git ➝</a>
            </div>
        </div>
    `;

    const obligationCount = todayAndOverdue.length + upcomingNext7Days.length + aoTasks.length + gdTasks.length;
    // The three blocks are counted separately on purpose and never summed:
    // they answer different questions (deadlines, current status, extensions).
    const subject = `📅 Günlük Özet: ${obligationCount} yükümlülük · ${activeJobs.length} aktif tadil · ${prelicenceItems.length} önlisans aşaması`;

    return {
        subject,
        html,
        isEmpty,
        counts: {
            todayAndOverdue: todayAndOverdue.length,
            upcoming7: upcomingNext7Days.length,
            ao: aoTasks.length,
            gd: gdTasks.length,
            activeJobs: activeJobs.length,
            prelicence: prelicenceItems.length
        },
        todayAndOverdue,
        upcomingNext7Days,
        aoTasks,
        gdTasks,
        activeJobs,
        prelicenceItems
    };
}

/**
 * SCHEDULED FUNCTION: Daily Deadline Check (Consolidated)
 * Runs every day at 08:00 AM Turkey time
 * Runs EVERY HOUR to check if it's time to send the report
 */
exports.checkDeadlines = onSchedule({
    schedule: "0 * * * *", // Run every hour
    timeZone: "Europe/Istanbul",
    region: "europe-west1"
}, async (event) => {
    console.log("⏰ Hourly Trigger (Daily Check): Checking conditions...");

    try {
        const dataRef = db.doc("daVinciData/master");
        const snapshot = await dataRef.get();

        if (!snapshot.exists) {
            console.log("❌ No data found in Firestore");
            return;
        }

        const data = snapshot.data();
        let settings = data.notificationSettings || {};

        // --- Backward Compatibility & Migration ---
        let dailySettings = { days: [1, 2, 3, 4, 5], hour: 8 }; // Default

        if (settings.daily) {
            // New format found
            dailySettings = settings.daily;
        } else if (settings.days && Array.isArray(settings.days)) {
            // Old format found
            dailySettings = { days: settings.days, hour: settings.hour || 8 };
        }

        // Get Current Istanbul Time
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Istanbul',
            hour: 'numeric',
            hour12: false
        });

        // Calculate Istanbul Time from UTC
        // Note: In Cloud Functions, system time is UTC. toLocaleString with timeZone gives correct local time string.
        const istanbulLink = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
        const currentDay = istanbulLink.getDay(); // 0-6
        const currentHour = istanbulLink.getHours(); // 0-23

        console.log(`Debug Time: UTC(${now.toISOString()}) -> IST(Day:${currentDay}, Hour:${currentHour})`);
        console.log(`Daily Settings: Days[${dailySettings.days}], Hour[${dailySettings.hour}]`);

        // Check if today is a scheduled day
        if (!dailySettings.days.includes(currentDay)) {
            console.log("🚫 Today is not a scheduled day for DAILY report. Skipping.");
            return;
        }

        // Check if current hour matches scheduled hour
        if (currentHour !== dailySettings.hour) {
            console.log(`⏳ Not the right time for DAILY report. (Current: ${currentHour}, Scheduled: ${dailySettings.hour})`);
            return;
        }

        console.log("✅ Daily Schedule Match! Proceeding to check deadlines...");

        // --- 2. Build the digest (shared with testEmail?type=real) ---
        const digest = buildDailyDigest(data);
        console.log(`📊 Digest: ${JSON.stringify(digest.counts)}`);

        if (digest.isEmpty) {
            console.log("📭 No deadlines, AO/GD tasks or prelicence stages. Skipping email to save quota.");
            return;
        }

        // --- 3. Send Email ---
        const { todayAndOverdue, upcomingNext7Days, aoTasks, gdTasks, prelicenceItems } = digest;
        const info = await resend.emails.send({
            from: FROM_EMAIL,
            to: TARGET_EMAIL,
            subject: digest.subject,
            html: digest.html
        });

        console.log(`🎉 Consolidated Daily Email Sent!`, info);

        // --- 5. Same digest as a push, off the same computed lists ---
        try {
            await push.sendDigestPush(data, {
                todayAndOverdue,
                upcoming: upcomingNext7Days,
                aoTasks,
                gdTasks,
                prelicenceItems
            });
        } catch (pushErr) {
            // A push failure must never cost us the e-mail, which already sent.
            console.error("⚠️ Gunluk ozet push hatasi:", pushErr);
        }
    } catch (error) {
        console.error("❌ Error in checkDeadlines:", error);
    }
});

/**
 * SCHEDULED FUNCTION: Weekly Report
 * Runs EVERY HOUR to check if it's time to send the weekly report
 */
exports.sendWeeklyReport = onSchedule({
    schedule: "0 * * * *", // Run every hour
    timeZone: "Europe/Istanbul",
    region: "europe-west1"
}, async (event) => {
    console.log("📊 Hourly Trigger (Weekly Check): Checking conditions...");

    try {
        const dataRef = db.doc("daVinciData/master");
        const snapshot = await dataRef.get();

        if (!snapshot.exists) {
            return;
        }

        const data = snapshot.data();
        let settings = data.notificationSettings || {};

        // --- Settings Logic ---
        // Default: Monday (1) at 08:00
        let weeklySettings = { days: [1], hour: 8 };

        if (settings.weekly) {
            // New format: check for 'days' array
            if (settings.weekly.days && Array.isArray(settings.weekly.days)) {
                weeklySettings = settings.weekly;
            }
            // Old format: check for 'day' number
            else if (settings.weekly.day !== undefined) {
                weeklySettings = {
                    days: [settings.weekly.day],
                    hour: settings.weekly.hour || 8
                };
            }
        }

        // Get Current Istanbul Time
        const now = new Date();
        const istanbulLink = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
        const currentDay = istanbulLink.getDay(); // 0-6
        const currentHour = istanbulLink.getHours(); // 0-23

        console.log(`Weekly Settings: Days[${weeklySettings.days}], Hour[${weeklySettings.hour}]`);

        // Check Schedule
        if (!weeklySettings.days.includes(currentDay)) {
            console.log(`🚫 Today is not a scheduled day for WEEKLY report. (Current Day: ${currentDay}, Scheduled: ${weeklySettings.days})`);
            return;
        }

        if (currentHour !== weeklySettings.hour) {
            console.log(`⏳ Not the right time for WEEKLY report. (Current Hour: ${currentHour}, Scheduled: ${weeklySettings.hour})`);
            return;
        }

        console.log("✅ Weekly Schedule Match! Generating report...");

        const obligations = (data.obligations || []).filter(o => o.status !== 'completed');
        obligations.sort((a, b) => parseDate(a.deadline) - parseDate(b.deadline));

        await resend.emails.send({
            from: FROM_EMAIL,
            to: TARGET_EMAIL,
            subject: `📊 Haftalık Yükümlülük Raporu - ${formatDate(new Date())}`,
            html: generateWeeklyReportEmail(obligations)
        });

        console.log("✅ Weekly Report Sent!");
    } catch (error) {
        console.error("❌ Error in sendWeeklyReport:", error);
    }
});

/**
 * HTTPS FUNCTION: Manual Test Trigger
 */
exports.testEmail = onRequest({
    region: "europe-west1",
    cors: true
}, async (req, res) => {
    const type = req.query.type;

    try {
        if (type === 'daily') {
            const dummyObligation = {
                projectName: "Ankara Rüzgar Santrali",
                obligationType: "Üretim Lisansı Harç Ödemesi",
                obligationDescription: "Yıllık lisans harcı ödemesinin EPDK hesabına yatırılması gerekmektedir.",
                deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            };
            const sendResult = await resend.emails.send({
                from: FROM_EMAIL,
                to: TARGET_EMAIL,
                subject: `📅 Hatırlatma: ${dummyObligation.projectName} - 3 Gün Kaldı`,
                html: generateMilestoneEmail(dummyObligation, 3)
            });
            console.log("📨 Daily milestone email attempt:", sendResult);
            res.json({ success: true, message: "Daily milestone test email sent!", result: sendResult });

        } else if (type === 'weekly') {
            const dummyObligations = [
                {
                    projectName: "İzmir Güneş Santrali",
                    obligationType: "ÇED Raporu Sunumu",
                    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    projectName: "Bursa Biyogaz",
                    obligationType: "Rapor",
                    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            await resend.emails.send({
                from: FROM_EMAIL,
                to: TARGET_EMAIL,
                subject: `📊 Haftalık Yükümlülük Raporu - ${formatDate(new Date())} (Örnek)`,
                html: generateWeeklyReportEmail(dummyObligations)
            });
            res.json({ success: true, message: "Weekly report test email sent with DOWNLOAD LINK!" });

        } else if (type === 'weekly_real') {
            // Real Weekly Report (Actual Firestore Data)
            const dataRef = db.doc("daVinciData/master");
            const snapshot = await dataRef.get();
            let obligations = [];
            if (snapshot.exists) {
                const data = snapshot.data();
                obligations = (data.obligations || []).filter(o => o.status !== 'completed');
            }
            obligations.sort((a, b) => parseDate(a.deadline) - parseDate(b.deadline));

            const sendResult = await resend.emails.send({
                from: FROM_EMAIL,
                to: TARGET_EMAIL,
                subject: `📊 Haftalık Yükümlülük Raporu - ${formatDate(new Date())}`,
                html: generateWeeklyReportEmail(obligations)
            });
            console.log("📨 REAL weekly report attempt:", sendResult);
            res.json({ success: true, message: "REAL weekly report sent!", result: sendResult, count: obligations.length });

        } else if (type === 'check_json') {
            // Debug Mode: Check counts without sending email
            const dataRef = db.doc("daVinciData/master");
            const snapshot = await dataRef.get();
            let obligations = [];
            if (snapshot.exists) {
                const data = snapshot.data();
                obligations = (data.obligations || []).filter(o => o.status !== 'completed');
            }

            // Re-use logic from generateWeeklyReportEmail (manually here to return JSON)
            const now = new Date();
            const dayOfWeek = now.getDay();
            const currentDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

            const startOfThisWeek = new Date(now);
            startOfThisWeek.setHours(0, 0, 0, 0);
            startOfThisWeek.setDate(now.getDate() - currentDay);

            const endOfThisWeek = new Date(startOfThisWeek);
            endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
            endOfThisWeek.setHours(23, 59, 59, 999);

            const startOfNextWeek = new Date(endOfThisWeek);
            startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
            startOfNextWeek.setHours(0, 0, 0, 0);

            const endOfNextWeek = new Date(startOfNextWeek);
            endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
            endOfNextWeek.setHours(23, 59, 59, 999);

            const thisWeek = obligations.filter(o => {
                const d = parseDate(o.deadline);
                return d && d >= startOfThisWeek && d <= endOfThisWeek;
            });
            const nextWeek = obligations.filter(o => {
                const d = parseDate(o.deadline);
                return d && d >= startOfNextWeek && d <= endOfNextWeek;
            });

            const debugInfo = obligations.map(o => ({
                name: o.projectName,
                deadline: o.deadline,
                parsed: parseDate(o.deadline),
                inThis: (parseDate(o.deadline) >= startOfThisWeek && parseDate(o.deadline) <= endOfThisWeek)
            }));

            res.json({
                success: true,
                counts: { total: obligations.length, thisWeek: thisWeek.length, nextWeek: nextWeek.length },
                debug: debugInfo.slice(0, 5), // Show first 5 for debug
                ranges: { thisStart: startOfThisWeek, thisEnd: endOfThisWeek }
            });

        } else if (type === 'real' || type === 'report') {
            // Real data, and deliberately the EXACT same builder the 08:00
            // scheduled send uses. This branch used to have its own layout
            // ("Günlük Analiz Raporu": nearest 10 obligations, no 7-day window,
            // no prelicence block), so the test button never previewed what
            // would actually be delivered.
            const snapshot = await db.doc("daVinciData/master").get();
            if (!snapshot.exists) {
                res.status(404).json({ error: "daVinciData/master bulunamadi." });
                return;
            }

            const digest = buildDailyDigest(snapshot.data());
            const sendResult = await resend.emails.send({
                from: FROM_EMAIL,
                to: TARGET_EMAIL,
                subject: `[TEST] ${digest.subject}`,
                html: digest.html
            });
            console.log("📨 TEST daily digest sent:", digest.counts);
            res.json({ success: true, message: "Real report sent", counts: digest.counts, result: sendResult });

        } else {
            // Default
            res.json({ success: true, message: "Provide ?type=daily/weekly/real" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * HTTPS FUNCTION: Microsoft Teams Outgoing Webhook
 * Receives messages, extracts tasks with AI, and saves to Firestore.
 */
exports.teamsWebhook = onRequest({
    region: "europe-west1",
    invoker: "public",
    cors: true
}, async (req, res) => {
    console.log(`📡 Incoming Teams Hook: ${req.method} content-type: ${req.get('content-type')}`);
    console.log("Headers:", JSON.stringify(req.headers));
    console.log("Body:", JSON.stringify(req.body));

    // Standardize verification response for Teams
    // Teams sends POST with empty body or different headers to check availability
    if (req.method !== 'POST' || !req.body || Object.keys(req.body).length === 0) {
        console.log("📡 Teams Verification Ping received.");
        return res.status(200).send("OK"); // Simple OK is often more robust for Teams verification
    }

    const rawText = req.body?.text || "";
    const cleanText = rawText.replace(/<at>.*?<\/at>/g, "").trim();

    if (!cleanText) {
        return res.json({ type: "message", text: "🤖 Mesaj algılanamadı." });
    }

    if (!aiHelper) {
        return res.json({ type: "message", text: "⚠️ Gemini API Anahtarı eksik. Lütfen kurulumu tamamlayın." });
    }

    try {
        const dataRef = db.doc("daVinciData/master");
        const snapshot = await dataRef.get();
        const data = snapshot.exists ? snapshot.data() : { projects: [], users: [], jobs: [] };

        const projects = data.projects || [];
        const users = data.users || [];

        // 1. Extract Task with AI
        const extracted = await aiHelper.extractTask(cleanText, projects, users);

        if (!extracted) {
            return res.json({ type: "message", text: "🔍 Üzgünüm, mesajdan iş detaylarını çıkaramadım. Lütfen proje ve isim belirttiğinizden emin olun." });
        }

        // 2. Add to Jobs
        const newJob = {
            id: Date.now().toString(),
            ...extracted,
            createdAt: new Date().toISOString(),
            createdBy: "MS Teams Bot",
            creator: "DaVinci Assistant"
        };

        const currentJobs = data.jobs || [];
        currentJobs.push(newJob);

        await dataRef.update({
            jobs: currentJobs,
            lastUpdate: new Date().toISOString()
        });

        // 3. Respond to Teams
        const responseText = `✅ **İş Kaydedildi!**\n\n` +
            `🔹 **Başlık:** ${newJob.title}\n` +
            `🔹 **Proje:** ${newJob.projectName}\n` +
            `🔹 **Sorumlu:** ${newJob.assignee}\n` +
            `🔹 **Tarih:** ${newJob.dueDate}\n\n` +
            `Detayları platformda görebilirsiniz.`;

        res.json({ type: "message", text: responseText });

    } catch (error) {
        console.error("Teams Webhook Error:", error);
        res.json({ type: "message", text: "🚨 Bir hata oluştu: " + error.message });
    }
});
