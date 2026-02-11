import { Store } from './store.js';
import { formatDate, getStatusText, getStatus, isInThisCalendarWeek, isInLastCalendarWeek, isInNextCalendarWeek, isInThisCalendarMonth } from './utils.js';

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
        let currentPage = 1;

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

        // 6. 12-Month Rolling Future Intensity
        const rollingMonths = [];
        const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        for (let i = 0; i < 12; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() + i);
            const m = d.getMonth();
            const y = d.getFullYear();
            const label = `${monthNames[m]} ${y.toString().slice(-2)}`;
            const count = futureObligations.filter(o => {
                const od = new Date(o.deadline);
                return o.status !== 'completed' && od.getMonth() === m && od.getFullYear() === y;
            }).length + jobs.filter(j => {
                if (j.status === 'completed' || !j.dueDate) return false;
                const jd = new Date(j.dueDate);
                return jd.getMonth() === m && jd.getFullYear() === y;
            }).length;
            rollingMonths.push({ label, count });
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
                <h3 style="margin: 0 0 20px 0; font-size: 14px; font-weight: 800; border-bottom: 3px solid #000; padding-bottom: 10px;">📅 12 AYLIK GELECEK YOĞUNLUĞU</h3>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; height: 120px; padding: 0 10px;">
                    ${rollingMonths.map(m => `
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="font-size: 8px; font-weight: 900; margin-bottom: 4px;">${m.count > 0 ? m.count : ''}</div>
                            <div style="background: #000; width: 60%; height: ${Math.min((m.count / maxRollingCount) * 100, 100)}px; border-radius: 3px 3px 0 0;"></div>
                            <span style="font-size: 8px; font-weight: 800; margin-top: 5px; white-space: nowrap;">${m.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        await renderPage(pdf, page1, pageWidth);

        // --- PAGE 2+: KULLANICI BAZLI BEKLEYEN İİŞLER (Paginated) ---
        const userGroups = {};
        jobs.filter(j => j.status !== 'completed').forEach(j => {
            const userName = Store.getUserName(j.assignee);
            if (!userGroups[userName]) userGroups[userName] = [];
            userGroups[userName].push(j);
        });

        await renderMultiPageSection(pdf, worker, pageWidth, "👤 KULLANICI BAZLI BEKLEYEN İŞLER", userGroups, 'user-grid');

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
        const itemsPerPage = 18;
        for (let i = 0; i < futureObligations.length; i += itemsPerPage) {
            const chunk = futureObligations.slice(i, i + itemsPerPage);
            pdf.addPage();
            currentPage = pdf.internal.getNumberOfPages();

            const tablePage = document.createElement('div');
            tablePage.style.cssText = `width: 800px; padding: 40px; background: white; font-family: 'Inter', sans-serif; color: #000000; min-height: 1100px;`;
            worker.innerHTML = '';
            worker.appendChild(tablePage);

            tablePage.innerHTML = `
                <div style="border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 800;">📅 GELECEK YÜKÜMLÜLÜK LİSTESİ</h2>
                    <span style="font-size: 12px; font-weight: 800;">SAYFA ${currentPage}</span>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="background: #000; color: #fff; text-align: left;">
                            <th style="padding: 10px; border: 1px solid #000;">PROJE</th>
                            <th style="padding: 10px; border: 1px solid #000;">KONU</th>
                            <th style="padding: 10px; border: 1px solid #000;">VADE</th>
                            <th style="padding: 10px; border: 1px solid #000;">DURUM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${chunk.map(o => {
                let pName = o.projectName || 'Genel';
                if (pName === 'undefined') pName = 'Genel';
                return `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #000; font-weight: 800;">${pName.substring(0, 25)}</td>
                                    <td style="padding: 8px; border: 1px solid #000;">${o.obligationType}</td>
                                    <td style="padding: 8px; border: 1px solid #000; font-weight: 700;">${formatDate(o.deadline)}</td>
                                    <td style="padding: 8px; border: 1px solid #000; font-weight: 800;">${getStatusText(o.deadline, o.status)}</td>
                                </tr>
                            `;
            }).join('')}
                    </tbody>
                </table>
            `;
            await renderPage(pdf, tablePage, pageWidth);
        }

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
 * Shared HTML generator for report boxes
 */
function renderReportItemHtml(name, data, layoutType, accentColor) {
    let displayName = name;
    if (!displayName || displayName === 'undefined' || displayName === 'null') displayName = 'Genel / Projesiz';

    if (layoutType === 'user-grid') {
        return `
            <div style="border: 2px solid #000; border-radius: 10px; padding: 15px; background: #f8fafc; break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;">
                    <span style="font-weight: 900; font-size: 14px;">${displayName}</span>
                    <span style="background: #000; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${data.length || 0} İş</span>
                </div>
                ${data.map(j => {
            let jpName = j.project || 'Genel';
            if (jpName === 'undefined') jpName = 'Genel';
            return `
                        <div style="font-size: 11px; margin-bottom: 6px; padding-left: 10px; border-left: 3px solid ${j.priority === 'high' ? '#ef4444' : '#3b82f6'};">
                            <b>${j.title}</b>
                            <div style="font-size: 9px; color: #64748b;">${jpName}</div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    } else {
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
