/* ─── DTC Admin — Instructions Module ───────────────────────────────────── */

'use strict';

const Instructions = (() => {

  const loadData = async () => {
    const d = await api(`/admin/instructions?adminKey=${encodeURIComponent(Store.adminKey)}`);
    if (d && !d.error) Store.setInstructions(d);
  };

  const render = () => {
    const wrap = document.getElementById('instr-list');
    const sets = Object.values(Store.instructions.sets || {});
    if (!sets.length) {
      wrap.innerHTML = '<div class="empty">No instruction sets yet. Click "+ New" to create one.</div>';
      return;
    }
    wrap.innerHTML = sets.map(s => `
      <div class="instr-card">
        <div class="instr-header">
          <div class="instr-name">${esc(s.name)}</div>
          <div class="instr-actions">
            <button class="btn btn-outline btn-sm" onclick="Instructions.openModal('${esc(s.id)}')">✏ Edit</button>
            ${!['default-claude','chatgpt-plus'].includes(s.id)
              ? `<button class="btn btn-danger btn-sm" onclick="Instructions.remove('${esc(s.id)}')">✕ Delete</button>`
              : ''}
          </div>
        </div>
        <div class="instr-preview">
          <div class="instr-section-label">PRE-ACTIVATION</div>
          <div class="preview-label">Processing message</div>
          <div class="preview-text">${esc(s.processingText || '—')}</div>
          <div class="preview-label" style="margin-top:.5rem">Approved message</div>
          <div class="preview-text">${esc(s.approvedText || '—')}</div>
          ${(s.approvedSteps||[]).length
            ? `<div class="preview-label" style="margin-top:.5rem">Steps (${s.approvedSteps.length})</div>
               <ol class="preview-steps">${s.approvedSteps.map(st=>`<li>${esc(st)}</li>`).join('')}</ol>`
            : ''}
          <div class="instr-section-label" style="margin-top:.9rem">POST-ACTIVATION</div>
          <div class="preview-label">Post-activation message</div>
          <div class="preview-text">${esc(s.postApprovedText || '—')}</div>
          ${(s.postApprovedSteps||[]).length
            ? `<div class="preview-label" style="margin-top:.5rem">Steps (${s.postApprovedSteps.length})</div>
               <ol class="preview-steps">${s.postApprovedSteps.map(st=>`<li>${esc(st)}</li>`).join('')}</ol>`
            : ''}
        </div>
      </div>`).join('');
  };

  const openModal = (id) => {
    const set = id ? Store.instructions.sets[id] : null;
    document.getElementById('instr-modal-title').textContent = set ? 'Edit Instruction Set' : 'New Instruction Set';
    document.getElementById('instr-id').value            = set ? set.id : 'instr-' + Date.now();
    document.getElementById('instr-name').value          = set ? set.name : '';
    document.getElementById('instr-processing').value    = set ? (set.processingText      || '') : '';
    document.getElementById('instr-approved').value      = set ? (set.approvedText        || '') : '';
    document.getElementById('instr-steps').value         = set ? (set.approvedSteps       || []).join('\n') : '';
    document.getElementById('instr-post-approved').value = set ? (set.postApprovedText    || '') : '';
    document.getElementById('instr-post-steps').value    = set ? (set.postApprovedSteps   || []).join('\n') : '';
    document.getElementById('instr-err').classList.remove('show');
    document.getElementById('instr-modal').classList.add('open');
  };

  const closeModal = () => document.getElementById('instr-modal').classList.remove('open');

  const save = async () => {
    const id    = document.getElementById('instr-id').value.trim();
    const name  = document.getElementById('instr-name').value.trim();
    const errEl = document.getElementById('instr-err');
    if (!name) { errEl.textContent = 'Name is required.'; errEl.classList.add('show'); return; }

    const set = {
      id, name,
      processingText:    document.getElementById('instr-processing').value.trim(),
      approvedText:      document.getElementById('instr-approved').value.trim(),
      approvedSteps:     document.getElementById('instr-steps').value.split('\n').map(s=>s.trim()).filter(Boolean),
      postApprovedText:  document.getElementById('instr-post-approved').value.trim(),
      postApprovedSteps: document.getElementById('instr-post-steps').value.split('\n').map(s=>s.trim()).filter(Boolean),
    };

    const d = await api('/admin/instructions/save', { adminKey: Store.adminKey, set });
    if (!d || !d.success) { errEl.textContent = (d&&d.error)||'Failed to save.'; errEl.classList.add('show'); return; }
    Store.upsertInstruction(set);
    closeModal();
    render();
    Dashboard.refreshDropdowns();
  };

  const remove = async (id) => {
    if (!confirm('Delete this instruction set?')) return;
    const d = await api('/admin/instructions/delete', { adminKey: Store.adminKey, id });
    if (d && d.success) { Store.deleteInstruction(id); render(); Dashboard.refreshDropdowns(); }
    else alert('Failed to delete.');
  };

  return { loadData, render, openModal, closeModal, save, remove };
})();
