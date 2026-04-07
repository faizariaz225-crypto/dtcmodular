/* ─── DTC Admin — Bulk Email & Template Editor ───────────────────────────── */
'use strict';

const BulkEmail = (() => {
  let _templates   = [];
  let _editingId   = null;
  let _isSending   = false;

  // ── Load templates from server ─────────────────────────────────────────────
  const loadTemplates = async () => {
    const d = await api(`/admin/email-templates?adminKey=${encodeURIComponent(Store.adminKey)}`);
    if (d && !d.error) { _templates = d.templates || []; Store.setTemplates(_templates); }
  };

  // ── Render the full compose + template editor page ─────────────────────────
  const render = () => {
    _renderTemplateList();
    _renderRecipientCount();
    _updateComposeFromTemplate();
    _populateBulkTemplateSelect();
  };

  // Populate the quick-load dropdown in compose panel
  const _populateBulkTemplateSelect = () => {
    const sel = document.getElementById('bulk-template-select');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Select a template to load —</option>' +
      _templates.map(t => `<option value="${esc(t.id)}" ${t.id===current?'selected':''}>${esc(t.name)}</option>`).join('');
  };

  // Load selected template from dropdown into compose fields
  const loadSelectedTemplate = () => {
    const id = document.getElementById('bulk-template-select')?.value;
    if (!id) return;
    selectTemplate(id);
  };

  // ── Template list (left panel) ─────────────────────────────────────────────
  const _renderTemplateList = () => {
    const wrap = document.getElementById('template-list');
    if (!wrap) return;
    wrap.innerHTML = _templates.map(t => `
      <div class="tmpl-item ${_editingId === t.id ? 'active' : ''}" onclick="BulkEmail.selectTemplate('${esc(t.id)}')">
        <div class="tmpl-item-name">${esc(t.name)}</div>
        <div class="tmpl-item-subject" style="font-size:.67rem;color:var(--muted);margin-top:.1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.subject)}</div>
        <div class="tmpl-item-actions" style="display:flex;gap:.3rem;margin-top:.45rem">
          <button class="btn btn-ghost-blue btn-sm" style="flex:1" onclick="event.stopPropagation();BulkEmail.selectTemplate('${esc(t.id)}')">Use</button>
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();BulkEmail.editTemplate('${esc(t.id)}')">✏</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();BulkEmail.deleteTemplate('${esc(t.id)}')">✕</button>
        </div>
      </div>`).join('') + `
      <button class="btn btn-outline btn-sm" style="width:100%;margin-top:.6rem;font-size:.75rem" onclick="BulkEmail.newTemplate()">
        + New Template
      </button>`;
  };

  // ── Select a template → fill compose fields ────────────────────────────────
  const selectTemplate = (id) => {
    _editingId = id;
    _renderTemplateList();
    _updateComposeFromTemplate();
  };

  const _updateComposeFromTemplate = () => {
    const t = _templates.find(x => x.id === _editingId);
    if (!t) return;
    const subjEl  = document.getElementById('compose-subject');
    const bodyEl  = document.getElementById('compose-body');
    const noteEl  = document.getElementById('template-type-note');
    if (subjEl) subjEl.value = t.subject;
    if (bodyEl) bodyEl.value = t.body;
    const isFullHtml = t.body.trimStart().toLowerCase().startsWith('<!doctype') ||
                       t.body.trimStart().toLowerCase().startsWith('<html');
    if (noteEl) {
      noteEl.style.display = '';
      noteEl.innerHTML = isFullHtml
        ? '<span style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:.18rem .6rem;font-size:.68rem;color:#15803d;font-weight:600">✓ Full HTML template — renders as designed</span>'
        : '<span style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:.18rem .6rem;font-size:.68rem;color:#64748b;font-weight:600">Plain / partial HTML — wrapped in DTC shell</span>';
    }
    _updatePreview();
  };

  // ── Live recipient count ───────────────────────────────────────────────────
  const _renderRecipientCount = () => {
    const filter  = document.getElementById('recipient-filter')?.value || 'all-with-email';
    const tokens  = Store.tokens || {};
    let count     = 0;
    const now     = new Date();
    for (const t of Object.values(tokens)) {
      if (!t.email) continue;
      if (filter === 'all-with-email')                                    { count++; continue; }
      if (filter === 'activated'   && t.approved)                         { count++; continue; }
      if (filter === 'expiring'    && t.approved && t.subscriptionExpiresAt) {
        const d = Math.ceil((new Date(t.subscriptionExpiresAt) - now)/(1000*60*60*24));
        if (d >= 0 && d <= 30)                                            { count++; continue; }
      }
      if (filter === 'expired' && t.approved && t.subscriptionExpiresAt) {
        const d = Math.ceil((new Date(t.subscriptionExpiresAt) - now)/(1000*60*60*24));
        if (d < 0)                                                        { count++; continue; }
      }
      if (filter === 'submitted' && t.used && !t.approved)                { count++; continue; }
    }
    const el = document.getElementById('recipient-count');
    if (el) el.textContent = count + ' recipient' + (count !== 1 ? 's' : '');
    return count;
  };

  // ── Live preview ───────────────────────────────────────────────────────────
  const SAMPLE = {
    name: 'Ahmed Khan', package: 'Claude Pro — 1 Month',
    expiry: '05 August 2025', daysLeft: '12',
    product: 'Claude Pro', email: 'ahmed@example.com', wechat: 'ahmed_wechat'
  };

  const _fillVars = (str) => str
    .replace(/\{\{name\}\}/g,     SAMPLE.name)
    .replace(/\{\{package\}\}/g,  SAMPLE.package)
    .replace(/\{\{product\}\}/g,  SAMPLE.product)
    .replace(/\{\{email\}\}/g,    SAMPLE.email)
    .replace(/\{\{wechat\}\}/g,   SAMPLE.wechat)
    .replace(/\{\{expiry\}\}/g,   SAMPLE.expiry)
    .replace(/\{\{daysLeft\}\}/g, SAMPLE.daysLeft);

  const _updatePreview = () => {
    const subject = document.getElementById('compose-subject')?.value || '';
    const body    = document.getElementById('compose-body')?.value    || '';
    const prevEl  = document.getElementById('email-preview-frame');
    if (!prevEl) return;

    // Detect if body is a full HTML email (already wrapped with <!DOCTYPE)
    const isFullHtml = body.trimStart().toLowerCase().startsWith('<!doctype') ||
                       body.trimStart().toLowerCase().startsWith('<html');

    let html;
    if (isFullHtml) {
      // Full template — just fill variables and render directly
      html = _fillVars(body);
    } else {
      // Plain/partial HTML — wrap in branded shell
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <style>body{margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif}</style>
      </head><body>
        <div style="max-width:600px;margin:16px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(37,99,235,.08)">
          <div style="background:#2563eb;padding:24px 32px;display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">⚡</span>
            <div>
              <div style="font-size:18px;font-weight:700;color:#fff">DTC</div>
              <div style="font-size:11px;color:rgba(255,255,255,.65);letter-spacing:.04em">DIGITAL TOOLS CORNER</div>
            </div>
          </div>
          <div style="padding:6px 24px;background:#f8faff;border-bottom:1px solid #e2e8f0">
            <div style="font-size:12px;color:#64748b;padding:8px 0">
              <strong style="color:#1e293b">Subject:</strong> \${_fillVars(subject)}
            </div>
          </div>
          <div style="padding:28px 32px;font-size:14px;color:#334155;line-height:1.75">
            \${_fillVars(body || '<p style="color:#94a3b8;font-style:italic">Start writing your email body above…</p>')}
          </div>
          <div style="padding:16px 32px;background:#f8faff;border-top:1px solid #e2e8f0">
            <div style="font-size:11px;color:#94a3b8">DTC — Digital Tools Corner &nbsp;·&nbsp; dtc@dtc1.shop</div>
          </div>
        </div>
      </body></html>`;
    }
    prevEl.srcdoc = html;

    // Update sample label
    const lbl = document.getElementById('preview-sample-label');
    if (lbl) lbl.textContent = `preview: ${SAMPLE.name}`;
  };

  // ── Template editor modal ──────────────────────────────────────────────────
  const newTemplate = () => {
    document.getElementById('teditor-modal-title').textContent = 'New Template';
    document.getElementById('teditor-id').value      = 'tmpl-' + Date.now();
    document.getElementById('teditor-name').value    = '';
    document.getElementById('teditor-subject').value = '';
    document.getElementById('teditor-body').value    = '';
    document.getElementById('teditor-err').classList.remove('show');
    document.getElementById('teditor-modal').classList.add('open');
  };

  const editTemplate = (id) => {
    const t = _templates.find(x => x.id === id);
    if (!t) return;
    document.getElementById('teditor-modal-title').textContent = 'Edit Template';
    document.getElementById('teditor-id').value      = t.id;
    document.getElementById('teditor-name').value    = t.name;
    document.getElementById('teditor-subject').value = t.subject;
    document.getElementById('teditor-body').value    = t.body;
    document.getElementById('teditor-err').classList.remove('show');
    document.getElementById('teditor-modal').classList.add('open');
  };

  const closeTemplateEditor = () => document.getElementById('teditor-modal').classList.remove('open');

  const saveTemplate = async () => {
    const errEl = document.getElementById('teditor-err');
    errEl.classList.remove('show');
    const template = {
      id:      document.getElementById('teditor-id').value.trim(),
      name:    document.getElementById('teditor-name').value.trim(),
      subject: document.getElementById('teditor-subject').value.trim(),
      body:    document.getElementById('teditor-body').value.trim(),
    };
    if (!template.name)    { errEl.textContent = 'Template name is required.'; errEl.classList.add('show'); return; }
    if (!template.subject) { errEl.textContent = 'Subject is required.'; errEl.classList.add('show'); return; }
    if (!template.body)    { errEl.textContent = 'Body is required.'; errEl.classList.add('show'); return; }

    const d = await api('/admin/email-templates/save', { adminKey: Store.adminKey, template });
    if (!d || !d.success) { errEl.textContent = (d && d.error) || 'Failed to save.'; errEl.classList.add('show'); return; }

    const idx = _templates.findIndex(t => t.id === template.id);
    if (idx >= 0) _templates[idx] = { ...template, lastModified: new Date().toISOString() };
    else          _templates.push({ ...template, lastModified: new Date().toISOString() });

    closeTemplateEditor();
    _renderTemplateList();
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    const d = await api('/admin/email-templates/delete', { adminKey: Store.adminKey, id });
    if (d && d.success) {
      _templates = _templates.filter(t => t.id !== id);
      if (_editingId === id) _editingId = null;
      _renderTemplateList();
    } else alert('Failed to delete.');
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const send = async () => {
    if (_isSending) return;
    const subject = document.getElementById('compose-subject')?.value.trim();
    const body    = document.getElementById('compose-body')?.value.trim();
    const filter  = document.getElementById('recipient-filter')?.value || 'all-with-email';
    const count   = _renderRecipientCount();
    const errEl   = document.getElementById('bulk-err');
    const okEl    = document.getElementById('bulk-ok');
    errEl.classList.remove('show'); okEl.classList.remove('show');

    if (!subject) { errEl.textContent = 'Subject is required.'; errEl.classList.add('show'); return; }
    if (!body)    { errEl.textContent = 'Email body is required.'; errEl.classList.add('show'); return; }
    if (!count)   { errEl.textContent = 'No recipients match this filter.'; errEl.classList.add('show'); return; }

    if (!confirm(`Send this email to ${count} recipient${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    _isSending = true;
    const btn = document.getElementById('send-bulk-btn');
    if (btn) { btn.disabled = true; btn.textContent = `Sending to ${count} recipients…`; }

    const d = await api('/admin/bulk-email', {
      adminKey: Store.adminKey,
      customSubject: subject,
      customBody:    body,
      recipientFilter: filter,
    });

    _isSending = false;
    if (btn) { btn.disabled = false; btn.textContent = '📤 Send Email'; }

    if (!d) { errEl.textContent = 'Failed to send. Check server connection.'; errEl.classList.add('show'); return; }
    if (d.error) { errEl.textContent = d.error; errEl.classList.add('show'); return; }

    const msg = `✓ Sent to ${d.sent} of ${d.total} recipients.${d.failed ? ` ${d.failed} failed.` : ''}`;
    okEl.textContent = msg; okEl.classList.add('show');

    // Reload email log
    await Dashboard.reload();
    EmailLog.render();
  };

  // ── Insert variable helper ─────────────────────────────────────────────────
  const insertVar = (v) => {
    const bodyEl = document.getElementById('compose-body');
    if (!bodyEl) return;
    const start = bodyEl.selectionStart;
    const end   = bodyEl.selectionEnd;
    const text  = bodyEl.value;
    bodyEl.value = text.slice(0, start) + v + text.slice(end);
    bodyEl.selectionStart = bodyEl.selectionEnd = start + v.length;
    bodyEl.focus();
    _updatePreview();
  };

  // ── Init event listeners for live preview ──────────────────────────────────
  const init = () => {
    const subj = document.getElementById('compose-subject');
    const body = document.getElementById('compose-body');
    const filt = document.getElementById('recipient-filter');
    if (subj) subj.addEventListener('input', _updatePreview);
    if (body) body.addEventListener('input', _updatePreview);
    if (filt) filt.addEventListener('change', _renderRecipientCount);
  };

  return {
    loadTemplates, render, init,
    selectTemplate, newTemplate, editTemplate, closeTemplateEditor, saveTemplate, deleteTemplate,
    send, insertVar, loadSelectedTemplate,
    _renderRecipientCount,
  };
})();
