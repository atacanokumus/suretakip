/**
 * Drag-and-drop editor for tadil (amendment) workflow types.
 *
 * Lets someone compose a workflow visually - drag pieces from a shared
 * catalog on the right into an ordered list on the left - instead of editing
 * js/jobs.js. All the data-safety work (remapping in-progress jobs when steps
 * are added/removed/reordered, blocking deletion of an in-use type, etc.)
 * lives in js/jobs.js (saveWorkflowDefinition, deleteWorkflowDefinition,
 * migrateJobsForWorkflowChange); this file is purely the UI on top of it.
 */

import { Store } from './store.js';
import { saveData } from './data.js';
import { showToast } from './ui.js';
import {
    getStepPieceCatalog, makeUniqueStepType, saveWorkflowDefinition,
    deleteWorkflowDefinition, updateJobsView
} from './jobs.js';
import {
    OWNER_US, OWNER_EXTERNAL, SCRUM_POINTS, DIFFICULTY_LABELS,
    STEP_META_DEFAULTS, getTypeMeta, resolveStepMeta, getOwnerIcon, getOwnerLabel
} from './step_meta.js';

/** Left-panel state while the builder is open: [{ type, short, owner?, difficulty? }]. */
let workflowSteps = [];
/** The title being edited, or null when creating a brand-new type. */
let editingTitle = null;
/** { type, short, from: 'catalog'|'workflow', index } of the piece mid-drag. */
let dragState = null;

export function initWorkflowManager() {
    const newBtn = document.getElementById('newWorkflowTypeBtn');
    if (newBtn) newBtn.onclick = () => openWorkflowBuilder(null);

    const cancelBtn = document.getElementById('wfBuilderCancel');
    if (cancelBtn) cancelBtn.onclick = closeWorkflowBuilder;

    const saveBtn = document.getElementById('wfBuilderSave');
    if (saveBtn) saveBtn.onclick = handleSave;

    const addPieceBtn = document.getElementById('wfBuilderAddPiece');
    const newPieceInput = document.getElementById('wfBuilderNewPieceInput');
    if (addPieceBtn && newPieceInput) {
        addPieceBtn.onclick = () => addCustomPiece(newPieceInput);
        newPieceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addCustomPiece(newPieceInput); }
        });
    }

    const overlay = document.getElementById('workflowBuilderOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeWorkflowBuilder(); });
    }

    // initApp() wires this up before loadData() has necessarily finished, so
    // Store.workflows may still be empty on this first render - refresh once
    // the initial Firestore load (or any later save) actually lands.
    window.addEventListener('data-refreshed', renderWorkflowTypesList);
    window.addEventListener('data-refreshed', renderStepMetaSettings);

    const metaSearch = document.getElementById('stepMetaSearch');
    if (metaSearch) metaSearch.addEventListener('input', renderStepMetaSettings);

    renderWorkflowTypesList();
    renderStepMetaSettings();
}

// ---------------------------------------------------------------------------
// Settings card: list of existing types
// ---------------------------------------------------------------------------

export function renderWorkflowTypesList() {
    const container = document.getElementById('workflowTypesList');
    if (!container) return;

    const titles = Object.keys(Store.workflows || {}).sort((a, b) => a.localeCompare(b, 'tr'));
    if (titles.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Henüz tanımlı iş akışı yok.</p>';
        return;
    }

    container.innerHTML = titles.map(title => {
        const steps = Store.workflows[title] || [];
        const jobCount = (Store.jobs || []).filter(j => j.title === title).length;
        return `
            <div class="wf-type-row" data-title="${escapeAttr(title)}">
                <div class="wf-type-info">
                    <strong>${escapeHtml(title)}</strong>
                    <span>${steps.length} adım · ${jobCount} kayıtlı tadil</span>
                </div>
                <div class="wf-type-actions">
                    <button type="button" class="btn btn-secondary wf-type-edit">✏️ Düzenle</button>
                    <button type="button" class="btn btn-danger wf-type-delete" ${jobCount > 0 ? 'disabled title="Bu tipte kayıtlı tadil var, önce onları taşıyın/tamamlayın"' : ''}>🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.wf-type-row').forEach(row => {
        const title = row.dataset.title;
        row.querySelector('.wf-type-edit').onclick = () => openWorkflowBuilder(title);
        const delBtn = row.querySelector('.wf-type-delete');
        if (!delBtn.disabled) {
            delBtn.onclick = () => {
                if (!confirm(`"${title}" iş akışını silmek istediğinize emin misiniz?`)) return;
                const res = deleteWorkflowDefinition(title);
                if (res.ok) {
                    showToast('İş akışı silindi.', 'success');
                    renderWorkflowTypesList();
                } else {
                    showToast(res.error, 'error');
                }
            };
        }
    });
}

// ---------------------------------------------------------------------------
// Builder overlay
// ---------------------------------------------------------------------------

function openWorkflowBuilder(title) {
    editingTitle = title;
    const existing = title ? (Store.workflows[title] || []) : [];
    workflowSteps = existing.map(s => ({
        type: s.type, short: s.short, owner: s.owner || '', difficulty: s.difficulty || ''
    }));

    const titleInput = document.getElementById('wfBuilderTitle');
    titleInput.value = title || '';

    document.getElementById('workflowBuilderOverlay').classList.add('show');
    renderBuilderLists();
}

function closeWorkflowBuilder() {
    document.getElementById('workflowBuilderOverlay').classList.remove('show');
    workflowSteps = [];
    editingTitle = null;
    dragState = null;
}

function renderBuilderLists() {
    renderWorkflowList();
    renderCatalogList();
}

function renderWorkflowList() {
    const el = document.getElementById('wfBuilderWorkflowList');
    if (!el) return;

    if (workflowSteps.length === 0) {
        el.innerHTML = '<div class="wf-drop-hint">Sağdan bir adım parçası sürükleyip buraya bırakın</div>';
    } else {
        el.innerHTML = workflowSteps.map((s, idx) => {
            const effective = resolveStepMeta(s);
            const globalMeta = getTypeMeta(s.type);
            return `
            <div class="wf-piece wf-piece-workflow" data-index="${idx}">
                <div class="wf-piece-main" draggable="true">
                    <span class="wf-piece-num">${idx + 1}</span>
                    <span class="wf-piece-label">${escapeHtml(s.short)}</span>
                    <span class="wf-piece-drag-hint">⠿</span>
                    <button type="button" class="wf-piece-remove" data-index="${idx}" title="Kaldır">×</button>
                </div>
                <div class="wf-piece-meta">
                    <label>Sorumlu</label>
                    <select class="wf-piece-owner" data-index="${idx}"
                        title="Bu adımda aksiyon kimde? Akıllı sıralama bunu kullanır.">
                        <option value="" ${!s.owner ? 'selected' : ''}>Genel (${getOwnerIcon(globalMeta.owner)} ${globalMeta.owner === OWNER_US ? 'Biz' : 'Dış'})</option>
                        <option value="${OWNER_US}" ${s.owner === OWNER_US ? 'selected' : ''}>🙋 Biz</option>
                        <option value="${OWNER_EXTERNAL}" ${s.owner === OWNER_EXTERNAL ? 'selected' : ''}>⏳ Dış</option>
                    </select>
                    <label>Zorluk</label>
                    <select class="wf-piece-difficulty" data-index="${idx}"
                        title="Scrum puanı. Tadil kartlarındaki ilerleme yüzdesini ağırlıklandırır.">
                        <option value="" ${!s.difficulty ? 'selected' : ''}>Genel (${globalMeta.difficulty})</option>
                        ${SCRUM_POINTS.map(pt => `
                            <option value="${pt}" ${Number(s.difficulty) === pt ? 'selected' : ''}>${pt} · ${DIFFICULTY_LABELS[pt]}</option>
                        `).join('')}
                    </select>
                    <span class="wf-piece-meta-effective">= ${getOwnerIcon(effective.owner)} ${effective.difficulty} puan</span>
                </div>
            </div>
        `;
        }).join('');
    }
    wireWorkflowListEvents(el);
}

function renderCatalogList() {
    const el = document.getElementById('wfBuilderCatalogList');
    if (!el) return;

    const usedTypes = new Set(workflowSteps.map(s => s.type));
    const pieces = getStepPieceCatalog().filter(p => !usedTypes.has(p.type));

    if (pieces.length === 0) {
        el.innerHTML = '<div class="wf-drop-hint">Tüm mevcut parçalar kullanıldı</div>';
    } else {
        el.innerHTML = pieces.map(p => {
            const meta = getTypeMeta(p.type);
            return `
            <div class="wf-piece wf-piece-catalog" draggable="true" data-type="${escapeAttr(p.type)}" data-short="${escapeAttr(p.short)}">
                <span class="wf-piece-label">${escapeHtml(p.short)}</span>
                <span class="wf-piece-catalog-meta" title="${escapeAttr(getOwnerLabel(meta.owner))} · ${meta.difficulty} puan">
                    ${getOwnerIcon(meta.owner)} ${meta.difficulty}
                </span>
                <span class="wf-piece-drag-hint">⠿</span>
            </div>
        `;
        }).join('');
    }
    wireCatalogListEvents(el);
}

// ---------------------------------------------------------------------------
// Drag and drop
// ---------------------------------------------------------------------------

function wireCatalogListEvents(el) {
    el.querySelectorAll('.wf-piece-catalog').forEach(node => {
        node.addEventListener('dragstart', (e) => {
            dragState = { type: node.dataset.type, short: node.dataset.short, from: 'catalog' };
            e.dataTransfer.effectAllowed = 'copy';
        });
        // Double-click as a fallback for anyone not comfortable dragging.
        node.addEventListener('dblclick', () => {
            workflowSteps.push({ type: node.dataset.type, short: node.dataset.short, owner: '', difficulty: '' });
            renderBuilderLists();
        });
    });

    const workflowList = document.getElementById('wfBuilderWorkflowList');
    workflowList.ondragover = (e) => {
        if (!dragState) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = dragState.from === 'catalog' ? 'copy' : 'move';
        highlightDropPosition(workflowList, e.clientY);
    };
    workflowList.ondragleave = () => clearDropHighlight(workflowList);
    workflowList.ondrop = (e) => {
        e.preventDefault();
        clearDropHighlight(workflowList);
        if (!dragState) return;
        const insertAt = computeDropIndex(workflowList, e.clientY);
        handleDropOntoWorkflow(insertAt);
        dragState = null;
    };
}

function wireWorkflowListEvents(el) {
    el.querySelectorAll('.wf-piece-remove').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.index, 10);
            workflowSteps.splice(idx, 1);
            renderBuilderLists();
        };
    });

    // Only the top row is draggable: the meta row below it holds <select>
    // controls, and a draggable ancestor swallows their click/open gesture.
    el.querySelectorAll('.wf-piece-workflow .wf-piece-main').forEach(main => {
        main.addEventListener('dragstart', (e) => {
            const idx = parseInt(main.closest('.wf-piece-workflow').dataset.index, 10);
            const step = workflowSteps[idx];
            dragState = { type: step.type, short: step.short, from: 'workflow', index: idx };
            e.dataTransfer.effectAllowed = 'move';
        });
    });

    el.querySelectorAll('.wf-piece-owner').forEach(sel => {
        sel.onchange = () => {
            const idx = parseInt(sel.dataset.index, 10);
            workflowSteps[idx].owner = sel.value;
            renderBuilderLists();
        };
    });

    el.querySelectorAll('.wf-piece-difficulty').forEach(sel => {
        sel.onchange = () => {
            const idx = parseInt(sel.dataset.index, 10);
            workflowSteps[idx].difficulty = sel.value ? Number(sel.value) : '';
            renderBuilderLists();
        };
    });

    // Dropping a workflow-panel piece back onto the catalog removes it -
    // "drag it out" is the natural undo gesture next to the × button.
    const catalogList = document.getElementById('wfBuilderCatalogList');
    catalogList.ondragover = (e) => { if (dragState && dragState.from === 'workflow') e.preventDefault(); };
    catalogList.ondrop = (e) => {
        e.preventDefault();
        if (dragState && dragState.from === 'workflow') {
            workflowSteps.splice(dragState.index, 1);
            renderBuilderLists();
        }
        dragState = null;
    };
}

function handleDropOntoWorkflow(insertAt) {
    if (dragState.from === 'catalog') {
        workflowSteps.splice(insertAt, 0, { type: dragState.type, short: dragState.short, owner: '', difficulty: '' });
    } else {
        // Reorder within the left list.
        const [moved] = workflowSteps.splice(dragState.index, 1);
        const adjustedIndex = insertAt > dragState.index ? insertAt - 1 : insertAt;
        workflowSteps.splice(adjustedIndex, 0, moved);
    }
    renderBuilderLists();
}

/** Which index a drop at this Y position should insert at, based on sibling midpoints. */
function computeDropIndex(listEl, clientY) {
    const items = Array.from(listEl.querySelectorAll('.wf-piece-workflow'));
    for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return i;
    }
    return items.length;
}

function highlightDropPosition(listEl, clientY) {
    clearDropHighlight(listEl);
    const idx = computeDropIndex(listEl, clientY);
    const items = listEl.querySelectorAll('.wf-piece-workflow');
    if (idx < items.length) items[idx].classList.add('wf-drop-before');
    else if (items.length > 0) items[items.length - 1].classList.add('wf-drop-after');
}

function clearDropHighlight(listEl) {
    listEl.querySelectorAll('.wf-drop-before, .wf-drop-after').forEach(n => n.classList.remove('wf-drop-before', 'wf-drop-after'));
}

// ---------------------------------------------------------------------------
// Custom piece creation + save
// ---------------------------------------------------------------------------

function addCustomPiece(inputEl) {
    const label = inputEl.value.trim();
    if (!label) return;
    const type = makeUniqueStepType(label);
    workflowSteps.push({ type, short: label, owner: '', difficulty: '' });
    inputEl.value = '';
    renderBuilderLists();
}

function handleSave() {
    const title = document.getElementById('wfBuilderTitle').value.trim();
    const result = saveWorkflowDefinition(title, workflowSteps, editingTitle);

    if (!result.ok) {
        showToast(result.error, 'error');
        return;
    }

    const msg = result.migratedCount > 0
        ? `Kaydedildi. ${result.migratedCount} kayıtlı tadilin ilerlemesi yeni sıraya taşındı.`
        : 'Kaydedildi.';
    showToast(msg, 'success');
    closeWorkflowBuilder();
    renderWorkflowTypesList();
    // The Tadiller page reads step config live; refresh it if it's the one
    // currently on screen so an edit is visible without a manual reload.
    if (document.getElementById('jobs')?.classList.contains('active')) updateJobsView();
}

// ---------------------------------------------------------------------------
// Settings card: step responsibility (biz / dış) + Scrum difficulty
// ---------------------------------------------------------------------------

/**
 * Her aşama tipi için tek tek sorumluluk ve zorluk ataması.
 *
 * Buradaki değerler Store.stepMeta'ya yazılır ve bütün iş akışlarında geçerli
 * olur; bir tadil tipinde farklı davranması gerekiyorsa iş akışı
 * düzenleyicisindeki adım bazlı seçim onu ezer.
 */
export function renderStepMetaSettings() {
    const container = document.getElementById('stepMetaList');
    if (!container) return;

    const query = (document.getElementById('stepMetaSearch')?.value || '').trim().toLocaleLowerCase('tr');

    // Hangi aşama hangi iş akışlarında kullanılıyor - satırda göstermek için.
    const usage = new Map();
    Object.entries(Store.workflows || {}).forEach(([title, steps]) => {
        (steps || []).forEach(step => {
            if (!step?.type) return;
            if (!usage.has(step.type)) usage.set(step.type, []);
            usage.get(step.type).push(title);
        });
    });

    const pieces = getStepPieceCatalog()
        .sort((a, b) => a.short.localeCompare(b.short, 'tr'));

    const summaryEl = document.getElementById('stepMetaSummary');
    if (summaryEl) {
        const ours = pieces.filter(p => getTypeMeta(p.type).owner === OWNER_US).length;
        summaryEl.textContent = `${pieces.length} aşama · 🙋 ${ours} bizde · ⏳ ${pieces.length - ours} dış tarafta`;
    }

    const visible = query
        ? pieces.filter(p => p.short.toLocaleLowerCase('tr').includes(query) || p.type.toLocaleLowerCase('tr').includes(query))
        : pieces;

    if (visible.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Eşleşen aşama bulunamadı.</p>';
        return;
    }

    container.innerHTML = visible.map(piece => {
        const meta = getTypeMeta(piece.type);
        const isOurs = meta.owner === OWNER_US;
        const custom = (Store.stepMeta || {})[piece.type] || {};
        const isCustom = !!(custom.owner || custom.difficulty);
        const usedIn = usage.get(piece.type) || [];
        const usageText = usedIn.length === 0
            ? 'Hiçbir iş akışında kullanılmıyor'
            : `${usedIn.length} iş akışında kullanılıyor`;

        return `
            <div class="step-meta-row ${isOurs ? 'ours' : 'external'}" data-type="${escapeAttr(piece.type)}">
                <div class="step-meta-info">
                    <strong>${escapeHtml(piece.short)}</strong>
                    <span title="${escapeAttr(usedIn.join(', '))}">${escapeHtml(usageText)}${isCustom ? ' · özelleştirildi' : ''}</span>
                </div>
                <div class="step-meta-controls">
                    <div class="step-meta-owner-toggle">
                        <button type="button" class="owner-btn ${isOurs ? 'active' : ''}" data-owner="${OWNER_US}"
                            title="Aksiyonu biz alıyoruz">🙋 Biz</button>
                        <button type="button" class="owner-btn ${!isOurs ? 'active' : ''}" data-owner="${OWNER_EXTERNAL}"
                            title="Dış taraftan dönüş bekleniyor">⏳ Dış</button>
                    </div>
                    <select class="step-meta-difficulty" title="Scrum zorluk puanı">
                        ${SCRUM_POINTS.map(pt => `
                            <option value="${pt}" ${meta.difficulty === pt ? 'selected' : ''}>${pt} · ${DIFFICULTY_LABELS[pt]}</option>
                        `).join('')}
                    </select>
                    <button type="button" class="step-meta-reset" ${isCustom ? '' : 'disabled'}
                        title="Uygulamayla gelen varsayılana dön">↺</button>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.step-meta-row').forEach(row => {
        const type = row.dataset.type;
        row.querySelectorAll('.owner-btn').forEach(btn => {
            btn.onclick = () => updateStepMeta(type, { owner: btn.dataset.owner });
        });
        row.querySelector('.step-meta-difficulty').onchange = (e) => {
            updateStepMeta(type, { difficulty: Number(e.target.value) });
        };
        const resetBtn = row.querySelector('.step-meta-reset');
        if (!resetBtn.disabled) resetBtn.onclick = () => clearStepMeta(type);
    });
}

/** Bir aşama tipinin genel ayarını günceller ve kaydeder. */
function updateStepMeta(type, patch) {
    const current = getTypeMeta(type);
    const next = { ...(Store.stepMeta || {}) };
    next[type] = { owner: current.owner, difficulty: current.difficulty, ...patch };

    // Varsayılanla birebir aynıysa kaydı hiç tutma - "özelleştirildi" etiketi
    // gerçekten değiştirilmiş olanlarda kalsın.
    const def = STEP_META_DEFAULTS[type];
    if (def && next[type].owner === def.owner && next[type].difficulty === def.difficulty) {
        delete next[type];
    }

    Store.setStepMeta(next);
    persistStepMeta();
}

function clearStepMeta(type) {
    const next = { ...(Store.stepMeta || {}) };
    delete next[type];
    Store.setStepMeta(next);
    persistStepMeta();
}

function persistStepMeta() {
    if (saveData()) {
        showToast('Aşama ayarı güncellendi.', 'success');
    }
    renderStepMetaSettings();
    // İlerleme yüzdeleri ve akıllı sıralama bu ayara bağlı - açık olan liste
    // hemen yeni değerle çizilsin.
    if (document.getElementById('jobs')?.classList.contains('active')) updateJobsView();
}

// ---------------------------------------------------------------------------
// Tiny local escapers (avoid importing utils.js just for these two)
// ---------------------------------------------------------------------------

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

function escapeAttr(str) {
    return String(str ?? '').replace(/"/g, '&quot;');
}
