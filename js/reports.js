import { Store } from './store.js';
import { formatDate, getStatusText, getStatus, isInThisCalendarWeek, isInLastCalendarWeek, isInNextCalendarWeek, isInThisCalendarMonth, escapeHtml } from './utils.js';

/**
 * Jobs created through the normal "Tadil Başvurusu" flow always have
 * dueDate = null (see js/jobs.js addJobForm handler - "Workflow based"), so a
 * forecast that only looked at job.dueDate silently excluded almost every
 * pending tadil from the 12-month intensity chart. This resolves the best
 * available forecast date for a pending job, in priority order:
 *   1) an explicit dueDate, if one was ever set,
 *   2) the project's license/construction expiry (the real deadline driving
 *      "Önlisans Süre Uzatımı" / "Tesis Tamamlama" jobs),
 *   3) the latest planned/actual date entered anywhere in the job's workflow
 *      steps (users fill these in as they go, so the furthest one is the
 *      best guess at when the job will conclude).
 * Returns null when nothing usable is found, rather than falling back to a
 * past date like createdAt/updatedAt, which would misreport an undated job
 * as due "this month".
 */
function getJobForecastDate(job) {
    if (job.dueDate) {
        const d = new Date(job.dueDate);
        if (!isNaN(d.getTime())) return d;
    }

    const project = Store.projects.find(p => p.name === job.project);
    const expiry = project?.licenceExpiry || project?.constructionDeadline;
    if (expiry) {
        const d = new Date(expiry);
        if (!isNaN(d.getTime())) return d;
    }

    let latest = null;
    (function traverse(obj) {
        if (!obj || typeof obj !== 'object') return;
        for (const key in obj) {
            const val = obj[key];
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                const d = new Date(val);
                if (!isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
            } else if (typeof val === 'object') {
                traverse(val);
            }
        }
    })(job.steps);

    return latest;
}

const { jsPDF } = window.jspdf;

let reportCountdown = null;

function startReportTimer() {
    const timerText = document.getElementById('reportTimerText');
    const overlay = document.getElementById('reportLoadingOverlay');
    if (!timerText || !overlay) return;

    overlay.classList.remove('hidden');
    let timeLeft = 5;
    timerText.textContent = `Tahmini süre: ${timeLeft}s`;

    if (reportCountdown) clearInterval(reportCountdown);

    reportCountdown = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            timerText.textContent = "Tamamlanmak üzere...";
            clearInterval(reportCountdown);
        } else {
            timerText.textContent = `Tahmini süre: ${timeLeft}s`;
        }
    }, 1000);
}

function stopReportTimer() {
    if (reportCountdown) clearInterval(reportCountdown);
    const overlay = document.getElementById('reportLoadingOverlay');
    if (overlay) {
        overlay.classList.add('hiding');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('hiding');
        }, 450); // Match CSS animation (0.4s) + small buffer
    }
}

/**
 * Generates a high-contrast multi-page executive report
 */
export async function generateMeetingReport() {
    console.log('📄 Initiating Refined Advanced Executive PDF Generation...');
    startReportTimer();
    const startTime = Date.now();

    const worker = document.createElement('div');
    worker.style.cssText = `position: absolute; left: -10000px; top: 0; width: 800px;`;
    document.body.appendChild(worker);

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;

        // --- DATA PREPARATION ---
        const projects = Store.projects || [];
        const jobs = Store.jobs || [];
        const obligations = Store.obligations || [];
        const today = new Date().setHours(0, 0, 0, 0);

        // 1. Last Week Data (Completed) - Sorted Chronologically (Closest to Furthest -> Ascending for past? Actually "Yakından uzağa" for past means most recent first? No, usually chronological means ascending. For past, closest to now is the latest date.)
        // User says "Tarih Yakından Uzağa". For "Last Week", closest to today is Sunday (latest).
        const lastWeekJobs = jobs.filter(j => j.status === 'completed' && isInLastCalendarWeek(j.updatedAt))
            .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
        const lastWeekObs = obligations.filter(o => isInLastCalendarWeek(o.deadline))
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        // 2. This Week Data (Completed & Pending)
        const thisWeekJobs = jobs.filter(j => isInThisCalendarWeek(j.updatedAt || j.dueDate))
            .sort((a, b) => new Date(a.updatedAt || a.dueDate) - new Date(b.updatedAt || b.dueDate));
        const thisWeekObs = obligations.filter(o => isInThisCalendarWeek(o.deadline))
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        // 3. Next Week Data (All Pending/Upcoming)
        const nextWeekJobs = jobs.filter(j => j.status !== 'completed' && isInNextCalendarWeek(j.dueDate))
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const nextWeekObs = obligations.filter(o => o.status !== 'completed' && isInNextCalendarWeek(o.deadline))
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        // 4. Future-Only Obligations for the main list
        const futureObligations = obligations.filter(o => {
            const d = new Date(o.deadline).setHours(0, 0, 0, 0);
            return d >= today;
        }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        // 5. Parent Company Intensity Analysis (Future-Oriented)
        const futureJobsForAnalysis = jobs.filter(j => j.status !== 'completed');
        const futureObsForAnalysis = futureObligations.filter(o => o.status !== 'completed');

        const companyData = {};
        [...futureJobsForAnalysis, ...futureObsForAnalysis].forEach(item => {
            let projectName = item.project || item.projectName || 'Genel';
            // Robust check for string "undefined"
            if (projectName === 'undefined') projectName = 'Genel';

            const project = Store.projects.find(p => p.name === projectName);
            const companyName = project ? (project.parent || project.company || 'DİĞER') : 'DİĞER';
            companyData[companyName] = (companyData[companyName] || 0) + 1;
        });
        const sortedCompanies = Object.entries(companyData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        // 6. 12-Month Rolling Future Intensity - obligations AND tadil applications,
        // tracked as two separate series so both are visible (see getJobForecastDate
        // above for how a job's forecast month is resolved).
        const rollingMonths = [];
        const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        const pendingJobsForForecast = jobs.filter(j => j.status !== 'completed');
        for (let i = 0; i < 12; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() + i);
            const m = d.getMonth();
            const y = d.getFullYear();
            const label = `${monthNames[m]} ${y.toString().slice(-2)}`;

            const obCount = futureObligations.filter(o => {
                if (o.status === 'completed') return false;
                const od = new Date(o.deadline);
                return od.getMonth() === m && od.getFullYear() === y;
            }).length;

            const jobCount = pendingJobsForForecast.filter(j => {
                const fd = getJobForecastDate(j);
                return fd && fd.getMonth() === m && fd.getFullYear() === y;
            }).length;

            rollingMonths.push({ label, obCount, jobCount, count: obCount + jobCount });
        }
        const maxRollingCount = Math.max(...rollingMonths.map(m => m.count), 1);

        // --- PAGE 1: EXECUTIVE SUMMARY ---
        const page1 = document.createElement('div');
        page1.style.cssText = `width: 800px; padding: 40px; background: white; font-family: 'Inter', sans-serif; color: #000000;`;
        worker.appendChild(page1);

        page1.innerHTML = `
            <div style="background: #1e293b; color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: white; padding: 5px; border-radius: 8px; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                        <img src="assets/logo.png" style="width: 100%;">
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800;">DaVinci Enerji Lisans Müdürlüğü</h1>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-size: 10px; font-weight: 700;">HAFTALIK BÜLTEN</p>
                    <p style="margin: 2px 0 0 0; font-size: 16px;">${new Date().toLocaleDateString('tr-TR')}</p>
                </div>
            </div>

            <div style="display: flex; gap: 15px; margin-bottom: 30px;">
                <div style="flex: 1; border: 2px solid #000; padding: 15px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800;">TOPLAM PROJE</div>
                    <div style="font-size: 28px; font-weight: 900;">${projects.length}</div>
                </div>
                <div style="flex: 1; border: 2px solid #000; padding: 15px; border-radius: 10px; text-align: center; background: #f0fdf4;">
                    <div style="font-size: 10px; font-weight: 800; color: #15803d;">BU HAFTA AKTİF KAYIT</div>
                    <div style="font-size: 28px; font-weight: 900; color: #15803d;">${thisWeekJobs.length + thisWeekObs.length}</div>
                </div>
                <div style="flex: 1; border: 2px solid #000; padding: 15px; border-radius: 10px; text-align: center; background: #fffbeb;">
                    <div style="font-size: 10px; font-weight: 800; color: #b45309;">HAFTAYA PLANLANAN</div>
                    <div style="font-size: 28px; font-weight: 900; color: #b45309;">${nextWeekJobs.length + nextWeekObs.length}</div>
                </div>
            </div>

            <div style="border: 2px solid #000; border-radius: 12px; padding: 25px;">
                <h3 style="margin: 0 0 20px 0; font-size: 14px; font-weight: 800; border-bottom: 3px solid #000; padding-bottom: 10px;">📉 ANA ŞİRKET BAZLI GELECEK YOĞUNLUĞU (TOP 8)</h3>
                ${sortedCompanies.map(([name, count]) => {
            const maxCount = Math.max(...Object.values(companyData), 1);
            return `
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; margin-bottom: 4px;">
                                <span>${name}</span>
                                <span>${count} Kayıt</span>
                            </div>
                            <div style="background: #e2e8f0; height: 12px; border: 1.5px solid #000; border-radius: 6px; overflow: hidden;">
                                <div style="background: #3b82f6; width: ${(count / maxCount * 100)}%; height: 100%;"></div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
            
            <div style="margin-top: 30px; border: 2px solid #000; border-radius: 12px; padding: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 14px; font-weight: 800;">📅 12 AYLIK GELECEK YOĞUNLUĞU (TADİL + YÜKÜMLÜLÜK)</h3>
                    <div style="display: flex; gap: 12px; font-size: 9px; font-weight: 800;">
                        <span><span style="display:inline-block; width:9px; height:9px; background:#3b82f6; border-radius:2px; margin-right:4px;"></span>Yükümlülük</span>
                        <span><span style="display:inline-block; width:9px; height:9px; background:#f59e0b; border-radius:2px; margin-right:4px;"></span>Tadil Başvurusu</span>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; height: 130px; padding: 0 10px;">
                    ${rollingMonths.map(m => {
            const obH = maxRollingCount > 0 ? Math.round((m.obCount / maxRollingCount) * 100) : 0;
            const jobH = maxRollingCount > 0 ? Math.round((m.jobCount / maxRollingCount) * 100) : 0;
            return `
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="font-size: 8px; font-weight: 900; margin-bottom: 4px;">${m.count > 0 ? m.count : ''}</div>
                            <div style="display: flex; flex-direction: column-reverse; width: 60%;">
                                <div style="background: #3b82f6; height: ${obH}px; ${jobH === 0 ? 'border-radius: 3px 3px 0 0;' : ''}"></div>
                                <div style="background: #f59e0b; height: ${jobH}px; border-radius: 3px 3px 0 0;"></div>
                            </div>
                            <span style="font-size: 8px; font-weight: 800; margin-top: 5px; white-space: nowrap;">${m.label}</span>
                        </div>
                    `;
        }).join('')}
                </div>
            </div>
        `;

        await renderPage(pdf, page1, pageWidth);

        // --- PAGE 2+: BEKLEYEN TADİL BAŞVURULARI (Proje Bazlı, Paginated) ---
        // Previously grouped by assignee - the reporting plan no longer wants a
        // per-user breakdown, so this groups by project like every other section.
        const pendingJobsGrouped = groupProjects(jobs.filter(j => j.status !== 'completed'), []);
        await renderMultiPageSection(pdf, worker, pageWidth, "💼 BEKLEYEN TADİL BAŞVURULARI (PROJE BAZLI)", pendingJobsGrouped, 'summary-grid', '#f8fafc');

        // --- PAGE 3+: GEÇEN HAFTA ÖZETİ (Two-column, Paginated) ---
        const lastWeekGrouped = groupProjects(lastWeekJobs, lastWeekObs);
        await renderMultiPageSection(pdf, worker, pageWidth, "✅ GEÇEN HAFTA YAPILAN İŞLER VE TAMAMLANANLAR", lastWeekGrouped, 'summary-grid', '#f0fdf4');

        // --- PAGE 4+: BU HAFTA ÖZETİ (Two-column, Paginated) ---
        const thisWeekGrouped = groupProjects(thisWeekJobs, thisWeekObs);
        await renderMultiPageSection(pdf, worker, pageWidth, "📅 BU HAFTA ÖZETİ (YAPILAN VE YAPILACAKLAR)", thisWeekGrouped, 'summary-grid', '#f8fafc');

        // --- PAGE 5+: GELECEK HAFTA ÖZETİ (Two-column, Paginated) ---
        const nextWeekGrouped = groupProjects(nextWeekJobs, nextWeekObs);
        await renderMultiPageSection(pdf, worker, pageWidth, "⏭️ GELECEK HAFTA ÖZETİ (YAPILACAKLAR)", nextWeekGrouped, 'summary-grid', '#fffbeb');


        // --- FINAL PAGES: FUTURE OBLIGATION LIST ---
        await renderObligationTableSection(pdf, worker, pageWidth, "📅 GELECEK YÜKÜMLÜLÜK LİSTESİ", futureObligations);

        pdf.save(`DaVinci_Haftalik_Bulten_${new Date().toISOString().split('T')[0]}.pdf`);
        console.log('✅ DaVinci Weekly Bulletin generated successfully.');

    } catch (err) {
        console.error('❌ PDF Error:', err);
    } finally {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`⏱️ PDF Generation took ${duration}s`);
        stopReportTimer();
        if (worker.parentNode) document.body.removeChild(worker);
    }
}

/**
 * Multi-page rendering helper to prevent content cut-off
 */
/**
 * Multi-page rendering helper that measures actual rendered height to prevent cut-off.
 * This fills A4 pages much more efficiently than scoring.
 */
async function renderMultiPageSection(pdf, worker, pageWidth, title, dataGroups, layoutType, accentColor = '#f8fafc') {
    const entries = Object.entries(dataGroups);
    if (entries.length === 0) return;

    // 1. Pre-calculate Chunks using a probe
    const probe = document.createElement('div');
    probe.style.cssText = `position: absolute; left: -9999px; width: 800px; padding: 40px; background: white; font-family: 'Inter', sans-serif; box-sizing: border-box; visibility: hidden;`;
    document.body.appendChild(probe);

    const footerBuffer = 100; // Space for "DEVAMI" and page numbers
    const totalHeightLimit = 1120 - footerBuffer;

    const chunks = [];
    let currentChunk = [];

    // Header for height measurement
    const headerHtml = `
        <div style="border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 800;">PROBE</h2>
        </div>
    `;

    for (const [name, data] of entries) {
        // Render item HTML
        const itemHtml = renderReportItemHtml(name, data, layoutType, accentColor);

        // Try adding it to current chunk in probe
        const tempChunk = [...currentChunk, [name, data]];
        probe.innerHTML = `
            ${headerHtml}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start;">
                ${tempChunk.map(([n, d]) => renderReportItemHtml(n, d, layoutType, accentColor)).join('')}
            </div>
        `;

        // Wait a tiny bit for layout
        if (probe.offsetHeight > totalHeightLimit && currentChunk.length > 0) {
            // It exceeded! Save current chunk and start new one with this item
            chunks.push(currentChunk);
            currentChunk = [[name, data]];
        } else {
            currentChunk = tempChunk;
        }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    document.body.removeChild(probe);

    // 2. Render each chunk to its own page
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        pdf.addPage();
        const currentPageNum = pdf.internal.getNumberOfPages();

        const pageEl = document.createElement('div');
        pageEl.style.cssText = `width: 800px; padding: 40px; background: white; font-family: 'Inter', sans-serif; color: #000000; min-height: 1120px; box-sizing: border-box;`;
        worker.innerHTML = '';
        worker.appendChild(pageEl);

        const gridHtml = chunk.map(([name, data]) => renderReportItemHtml(name, data, layoutType, accentColor)).join('');

        pageEl.innerHTML = `
            <div style="border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 800;">${title} ${i > 0 ? `(DEVAMI)` : ''}</h2>
                <span style="font-size: 12px; font-weight: 800;">SAYFA ${currentPageNum}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start;">
                ${gridHtml}
            </div>
        `;

        await renderPage(pdf, pageEl, pageWidth);
    }
}

/**
 * Renders the future-obligations list as flex "rows" instead of a real
 * <table>. The app's global stylesheet (styles.css) defines bare
 * `table`/`th`/`td` selectors - min-width:1200px, light gray text
 * (var(--text-secondary), meant for the dark in-app theme), and forced
 * nowrap+ellipsis with `!important` font sizes. Because this report worker
 * is appended to document.body while rendering, those rules used to bleed
 * straight into the PDF export: the table was forced wider than the page
 * (content ran off the side) and the text was nearly invisible (light gray
 * on a white PDF background). Plain divs don't match those selectors, so
 * width/wrapping/color are fully under our control again. Pagination is
 * measured with a probe (like renderMultiPageSection) rather than a fixed
 * items-per-page guess, since wrapped long text changes row height.
 */
async function renderObligationTableSection(pdf, worker, pageWidth, title, obligations) {
    if (obligations.length === 0) return;

    const columns = [
        { label: 'PROJE', flex: 26 },
        { label: 'KONU', flex: 34 },
        { label: 'VADE', flex: 16 },
        { label: 'DURUM', flex: 24 }
    ];

    const headerHtml = `
        <div style="display: flex; background: #000; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase;">
            ${columns.map(c => `<div style="flex: ${c.flex}; padding: 8px 10px; border: 1px solid #000;">${c.label}</div>`).join('')}
        </div>
    `;

    const rowHtml = (o) => {
        let pName = o.projectName || 'Genel';
        if (pName === 'undefined') pName = 'Genel';
        return `
            <div style="display: flex; font-size: 10px;">
                <div style="flex: ${columns[0].flex}; padding: 7px 10px; border: 1px solid #000; color: #000000; font-weight: 800; word-break: break-word;">${escapeHtml(pName)}</div>
                <div style="flex: ${columns[1].flex}; padding: 7px 10px; border: 1px solid #000; color: #000000; word-break: break-word;">${escapeHtml(o.obligationType || '')}</div>
                <div style="flex: ${columns[2].flex}; padding: 7px 10px; border: 1px solid #000; color: #000000; font-weight: 700;">${formatDate(o.deadline)}</div>
                <div style="flex: ${columns[3].flex}; padding: 7px 10px; border: 1px solid #000; color: #000000; font-weight: 800;">${getStatusText(o.deadline, o.status)}</div>
            </div>
        `;
    };

    // 1. Pre-calculate page chunks using a hidden probe (mirrors renderMultiPageSection).
    const probe = document.createElement('div');
    probe.style.cssText = `position: absolute; left: -9999px; width: 800px; padding: 40px; background: white; font-family: 'Inter', sans-serif; box-sizing: border-box; visibility: hidden;`;
    document.body.appendChild(probe);

    const footerBuffer = 60;
    const totalHeightLimit = 1120 - footerBuffer;
    const headerBlockHtml = `
        <div style="border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 800; color:#000;">PROBE</h2>
        </div>
    `;

    const chunks = [];
    let currentChunk = [];
    for (const o of obligations) {
        const tempChunk = [...currentChunk, o];
        probe.innerHTML = `${headerBlockHtml}${headerHtml}${tempChunk.map(rowHtml).join('')}`;
        if (probe.offsetHeight > totalHeightLimit && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = [o];
        } else {
            currentChunk = tempChunk;
        }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    document.body.removeChild(probe);

    // 2. Render each chunk to its own page.
    for (let i = 0; i < chunks.length; i++) {
        pdf.addPage();
        const currentPageNum = pdf.internal.getNumberOfPages();

        const tablePage = document.createElement('div');
        tablePage.style.cssText = `width: 800px; padding: 40px; background: white; font-family: 'Inter', sans-serif; color: #000000; min-height: 1100px; box-sizing: border-box;`;
        worker.innerHTML = '';
        worker.appendChild(tablePage);

        tablePage.innerHTML = `
            <div style="border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 800; color:#000;">${title}${i > 0 ? ' (DEVAMI)' : ''}</h2>
                <span style="font-size: 12px; font-weight: 800; color:#000;">SAYFA ${currentPageNum}</span>
            </div>
            ${headerHtml}
            ${chunks[i].map(rowHtml).join('')}
        `;
        await renderPage(pdf, tablePage, pageWidth);
    }
}

/**
 * Shared HTML generator for report boxes
 */
function renderReportItemHtml(name, data, layoutType, accentColor) {
    let displayName = name;
    if (!displayName || displayName === 'undefined' || displayName === 'null') displayName = 'Genel / Projesiz';

    {
        return `
            <div style="margin-bottom: 15px; border: 1.5px solid #000; border-radius: 8px; overflow: hidden; break-inside: avoid;">
                <div style="background: ${accentColor}; padding: 8px 10px; border-bottom: 1.5px solid #000; font-weight: 900; font-size: 12px;">🏢 ${displayName}</div>
                <div style="padding: 10px;">
                    ${(data.jobs || []).map(j => `
                        <div style="margin-bottom: 8px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: ${j.status === 'completed' ? '#f0fdf4' : 'white'};">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3px;">
                                <span style="font-size: 10px; font-weight: 800;">${j.status === 'completed' ? '✅' : '💼'} ${j.title}</span>
                            </div>
                            <div style="font-size: 8px; color: #64748b; margin-bottom: 4px;">
                                ${Store.getUserName(j.assignee)} | ${j.dueDate ? formatDate(j.dueDate) : formatDate(j.updatedAt)}
                            </div>
                            ${j.description ? `<div style="font-size: 9px; color: #334155; line-height: 1.2; font-style: italic;">${j.description.substring(0, 100)}${j.description.length > 100 ? '...' : ''}</div>` : ''}
                        </div>
                    `).join('')}
                    ${(data.obs || []).map(o => `
                        <div style="display: flex; justify-content: space-between; font-size: 9px; padding: 6px; background: #fffbeb; border-radius: 4px; margin-top: 4px; border: 1px dashed #b45309;">
                            <span>📜 <b>${o.obligationType}</b></span>
                            <b>${formatDate(o.deadline)}</b>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

async function renderPage(pdf, element, pageWidth) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, (canvas.height * pageWidth) / canvas.width);
}

function groupProjects(jobs, obs) {
    const groups = {};
    [...jobs, ...obs].forEach(item => {
        let name = item.project || item.projectName || 'Genel / Projesiz';
        // Robust check for string "undefined"
        if (name === 'undefined' || name === 'null') name = 'Genel / Projesiz';

        if (!groups[name]) groups[name] = { jobs: [], obs: [] };
        if (item.title) groups[name].jobs.push(item);
        else groups[name].obs.push(item);
    });
    return groups;
}
