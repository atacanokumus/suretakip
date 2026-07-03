import { auth } from './firebase-config.js';
import { Store } from './store.js';
import {
    getDaysUntil, getStatus, getStatusText, formatDate, getQuarter, escapeHtml, isInThisCalendarMonth, getJobActualLastUpdateDate
} from './utils.js';

function getGradientColor(index, total) {
    if (total <= 1) return 'hsl(35, 95%, 65%)';
    const pct = index / (total - 1);
    let h, s, l;
    if (pct < 0.5) {
        const t = pct * 2;
        h = 35 + (260 - 35) * t;
        s = 95 - 5 * t;
        l = 68 + (75 - 68) * t;
    } else {
        const t = (pct - 0.5) * 2;
        h = 260 + (165 - 260) * t;
        s = 90;
        l = 75 - 10 * t;
    }
    return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Updates all dashboard elements
 */
export function updateDashboard() {
    const obligations = Store.obligations;
    const jobs = Store.jobs || [];
    const currentUserEmail = auth.currentUser?.email;

    // 1. My Pending Jobs
    const myPendingJobs = jobs.filter(j =>
        j.assignee === currentUserEmail &&
        j.status !== 'completed'
    ).length;

    // 2. All Pending Jobs
    const allPendingJobs = jobs.filter(j =>
        j.status !== 'completed'
    ).length;

    // 3. This Week Obligations
    const thisWeekObs = obligations.filter(o => {
        const status = getStatus(o.deadline, o.status);
        return status === 'this-week' || status === 'overdue'; // Including overdue if any
    }).length;

    // 4. This Month Obligations (Inclusive of This Week)
    const thisMonthObs = obligations.filter(o => {
        const isThisMonth = isInThisCalendarMonth(o.deadline);
        const isNotCompleted = o.status !== 'completed' && new Date(o.deadline) >= new Date().setHours(0, 0, 0, 0);
        return isThisMonth && isNotCompleted;
    }).length;

    // Update stat cards
    const elements = {
        myPendingJobsCount: myPendingJobs,
        allPendingJobsCount: allPendingJobs,
        thisWeekObsCount: thisWeekObs,
        thisMonthObsCount: thisMonthObs
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // Populate active pending jobs list inside the merged wide card
    const activeJobs = jobs
        .filter(j => j.status !== 'completed')
        .sort((a, b) => new Date(getJobActualLastUpdateDate(a) || 0) - new Date(getJobActualLastUpdateDate(b) || 0));
    const activeListEl = document.getElementById('activePendingJobsListContent');
    if (activeListEl) {
        if (activeJobs.length === 0) {
            activeListEl.innerHTML = '<div style="color: var(--text-muted); font-style: italic; text-align: center; margin-top: 20px; grid-column: span 2;">Aktif devam eden tadil bulunmuyor.</div>';
        } else {
            const total = activeJobs.length;
            activeListEl.innerHTML = activeJobs.map((j, idx) => {
                const color = getGradientColor(idx, total);
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 5px 0; font-size: 11px;">
                        <span style="font-weight: 700; color: ${color}; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 12px;" title="${escapeHtml(j.project)}">${escapeHtml(j.project)}</span>
                        <span style="color: ${color}; opacity: 0.8; font-size: 10px; flex-shrink: 0; font-weight: 600;" title="${escapeHtml(j.title)}">${escapeHtml(j.title)}</span>
                    </div>
                `;
            }).join('');
        }
    }

    updateUpcomingList();
    updateMonthlyChart();
    updateQuarterlyChart();
}

/**
 * Updates the upcoming obligations list on the dashboard
 */
export function updateUpcomingList() {
    const list = document.getElementById('upcomingList');
    if (!list) return;

    if (Store.obligations.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span>📤</span>
                <p>Excel dosyası yükleyerek başlayın</p>
            </div>
        `;
        return;
    }

    // List only pending/overdue items and sort by deadline urgency
    const sorted = [...Store.obligations]
        .filter(o => getStatus(o.deadline, o.status) !== 'completed')
        .sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            // Handle invalid dates just in case
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;
            return dateA - dateB;
        })
        .slice(0, 30);

    list.innerHTML = sorted.map(o => {
        const status = getStatus(o.deadline, o.status);
        const statusText = getStatusText(o.deadline, o.status);

        return `
            <div class="obligation-item" data-id="${o.id}">
                <div class="obligation-status ${status}"></div>
                <div class="obligation-content">
                    <div class="obligation-project">
                        ${o.projectLink ? `<a href="${o.projectLink}" target="_blank">${escapeHtml(o.projectName)}</a>` : escapeHtml(o.projectName)}
                    </div>
                    <div class="obligation-type">${escapeHtml(o.obligationType)}</div>
                    <div class="obligation-desc">${escapeHtml(o.obligationDescription)}</div>
                </div>
                <div class="obligation-meta">
                    <div class="obligation-date">${formatDate(o.deadline)}</div>
                    <div class="obligation-days ${status}">${statusText}</div>
                </div>
            </div>
        `;
    }).join('');

    // Use event delegation for better reliability
    list.onclick = (e) => {
        const item = e.target.closest('.obligation-item');
        if (!item || e.target.tagName === 'A') return;

        const id = item.getAttribute('data-id');
        const event = new CustomEvent('show-detail', { detail: { id } });
        window.dispatchEvent(event);
    };
}

/**
 * Updates the monthly intensity chart (Rolling 12 Months)
 */
export function updateMonthlyChart() {
    const container = document.getElementById('monthlyChart');
    if (!container) return;

    const now = new Date();
    const rollingMonths = [];
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    // Generate rolling 12 months
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        rollingMonths.push({
            month: d.getMonth(),
            year: d.getFullYear(),
            label: `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`,
            count: 0
        });
    }

    // Count obligations for these months
    Store.obligations.forEach(o => {
        const date = new Date(o.deadline);
        rollingMonths.forEach(m => {
            if (date.getMonth() === m.month && date.getFullYear() === m.year) {
                m.count++;
            }
        });
    });

    const max = Math.max(...rollingMonths.map(m => m.count), 1);

    container.innerHTML = rollingMonths.map((m, i) => {
        const isPeak = m.count === max && max > 0;
        return `
            <div class="month-bar">
                <span class="month-bar-label">${m.label}</span>
                <div class="month-bar-fill ${isPeak ? 'peak' : ''}" style="height: 0%;" id="m${i + 1}Bar"></div>
                <span class="month-bar-value">${m.count}</span>
            </div>
        `;
    }).join('');

    // Staggered animation
    rollingMonths.forEach((m, i) => {
        const height = (m.count / max) * 100;
        setTimeout(() => {
            const bar = document.getElementById(`m${i + 1}Bar`);
            if (bar) {
                bar.style.transitionDelay = `${i * 0.05}s`;
                bar.style.height = `${height}%`;
            }
        }, 100);
    });
}

/**
 * Updates the quarterly intensity chart (Rolling Current + Next 3 Quarters)
 */
export function updateQuarterlyChart() {
    const container = document.getElementById('quarterlyChart');
    if (!container) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQIndex = Math.floor(currentMonth / 3);

    const rollingQuarters = [];
    
    // Generate current quarter + next 3 quarters
    for (let i = 0; i < 4; i++) {
        let qVal = currentQIndex + 1 + i;
        let yVal = currentYear;
        if (qVal > 4) {
            qVal -= 4;
            yVal += 1;
        }
        rollingQuarters.push({
            quarter: qVal,
            year: yVal,
            label: `${yVal} Q${qVal}`,
            count: 0
        });
    }

    // Count obligations for these quarters
    Store.obligations.forEach(o => {
        const date = new Date(o.deadline);
        if (isNaN(date.getTime())) return;
        
        const y = date.getFullYear();
        const m = date.getMonth();
        const q = Math.floor(m / 3) + 1;

        rollingQuarters.forEach(rq => {
            if (rq.quarter === q && rq.year === y) {
                rq.count++;
            }
        });
    });

    const max = Math.max(...rollingQuarters.map(rq => rq.count), 1);

    // Inject dynamic HTML
    container.innerHTML = rollingQuarters.map((rq, idx) => {
        return `
            <div class="quarter-bar" data-quarter="Q${rq.quarter}">
                <span class="bar-label" style="width: 65px; font-size: 11px; font-weight: 700; color: var(--text-muted);">${rq.label}</span>
                <div class="bar-fill" id="q${idx + 1}Bar" style="flex: 1; height: 36px; background: rgba(255, 255, 255, 0.03); border-radius: 10px; position: relative; overflow: hidden; border: 1px solid var(--border-glass);"></div>
                <span class="bar-value" id="q${idx + 1}Value" style="min-width: 20px; text-align: right; font-weight: 600; font-size: 13px;">${rq.count}</span>
            </div>
        `;
    }).join('');

    // Trigger Fill Animation
    rollingQuarters.forEach((rq, idx) => {
        const width = (rq.count / max) * 100;
        const isPeak = rq.count === max && max > 0;
        const bar = document.getElementById(`q${idx + 1}Bar`);
        
        if (bar) {
            if (isPeak) bar.classList.add('peak');
            
            setTimeout(() => {
                const styleId = `q${idx + 1}BarStyle`;
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }
                styleEl.textContent = `
                    #q${idx + 1}Bar::after { 
                        width: ${width}% !important; 
                        transition-delay: ${idx * 0.15}s !important; 
                    }
                `;
            }, 300);
        }
    });
}
