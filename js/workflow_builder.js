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
import { showToast } from './ui.js';
import {
    getStepPieceCatalog, makeUniqueStepType, saveWorkflowDefinition,
    deleteWorkflowDefinition, updateJobsView
} from './jobs.js';

/** Left-panel state while the builder is open: [{ type, short }]. */
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

    renderWorkflowTypesList();
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
    workflowSteps = existing.map(s => ({ type: s.type, short: s.short }));

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
        el.innerHTML = workflowSteps.map((s, idx) => `
            <div class="wf-piece wf-piece-workflow" draggable="true" data-index="${idx}">
                <span class="wf-piece-num">${idx + 1}</span>
                <span class="wf-piece-label">${escapeHtml(s.short)}</span>
                <button type="button" class="wf-piece-remove" data-index="${idx}" title="Kaldır">×</button>
            </div>
        `).join('');
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
        el.innerHTML = pieces.map(p => `
            <div class="wf-piece wf-piece-catalog" draggable="true" data-type="${escapeAttr(p.type)}" data-short="${escapeAttr(p.short)}">
                <span class="wf-piece-label">${escapeHtml(p.short)}</span>
                <span class="wf-piece-drag-hint">⠿</span>
            </div>
        `).join('');
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
            workflowSteps.push({ type: node.dataset.type, short: node.dataset.short });
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

    el.querySelectorAll('.wf-piece-workflow').forEach(node => {
        node.addEventListener('dragstart', (e) => {
            const idx = parseInt(node.dataset.index, 10);
            dragState = { type: workflowSteps[idx].type, short: workflowSteps[idx].short, from: 'workflow', index: idx };
            e.dataTransfer.effectAllowed = 'move';
        });
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
        workflowSteps.splice(insertAt, 0, { type: dragState.type, short: dragState.short });
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
    workflowSteps.push({ type, short: label });
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
