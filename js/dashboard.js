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
 * Updates the monthly intensity chart (Rolling 6 Months)
 */
export function updateMonthlyChart() {
    const container = document.getElementById('monthlyChart');
    if (!container) return;

    const now = new Date();
    const rollingMonths = [];
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    // Generate rolling 6 months
    for (let i = 0; i < 6; i++) {
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
        const height = (m.count / max) * 100;
        const isPeak = m.count === max && max > 0;

        return `
            <div class="month-bar">
                <span class="month-bar-label">${m.label}</span>
                <div class="month-bar-fill ${isPeak ? 'peak' : ''}" style="height: ${height}%" id="m${i + 1}Bar"></div>
                <span class="month-bar-value">${m.count}</span>
            </div>
        `;
    }).join('');

    // Staggered animation
    rollingMonths.forEach((m, i) => {
        const height = (m.count / max) * 100;
        setTimeout(() => {
            const styleId = `m${i + 1}BarStyle`;
            let styleEl = document.getElementById(styleId);
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = `
                #m${i + 1}Bar::after { 
                    height: ${height}% !important; 
                    transition-delay: ${i * 0.1}s !important; 
                }
            `;
        }, 300);
    });
}

/**
 * Updates the quarterly intensity chart
 */
export function updateQuarterlyChart() {
    const currentYear = new Date().getFullYear();
    const quarters = [0, 0, 0, 0];

    Store.obligations.forEach(o => {
        const year = new Date(o.deadline).getFullYear();
        if (year === currentYear) {
            const q = getQuarter(o.deadline) - 1;
            quarters[q]++;
        }
    });

    const max = Math.max(...quarters, 1);

    for (let i = 0; i < 4; i++) {
        const bar = document.getElementById(`q${i + 1}Bar`);
        const value = document.getElementById(`q${i + 1}Value`);
        const label = document.querySelector(`#quarterlyChart .quarter-bar:nth-child(${i + 1}) .bar-label`);

        if (label) label.textContent = `${currentYear} Q${i + 1}`;
        if (value) value.textContent = quarters[i];

        if (bar) {
            const width = (quarters[i] / max) * 100;
            const isPeak = quarters[i] === max && max > 0;

            if (isPeak) bar.classList.add('peak');
            else bar.classList.remove('peak');

            bar.style.setProperty('--width', `${width}%`);

            // Enhanced Animation: Staggered Fill
            setTimeout(() => {
                const styleId = `q${i + 1}BarStyle`;
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }
                // Use a staggered delay based on the index (i)
                styleEl.textContent = `
                    #q${i + 1}Bar::after { 
                        width: ${width}% !important; 
                        transition-delay: ${i * 0.15}s !important; 
                    }
                `;
            }, 300); // Wait for page transition to finish
        }
    }
}
