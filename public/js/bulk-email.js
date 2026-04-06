/* ─── DTC Admin — Bulk Email & Template Editor ───────────────────────────── */
'use strict';

const BulkEmail = (() => {
  let _templates   = [];
  let _editingId   = null;
  let _isSending   = false;

  // ── Load templates from server ─────────────────────────────────────────────
  const loadTemplates = async () => {
    const d = await api(`/admin/email-templates?adminKey=${encodeURIComponent(Store.adminKey)}`);
    if (d && !d.error) { _templates = d.templates || []; }
  };

  // ── Render the full compose + template editor page ─────────────────────────
  const render = () => {
    _renderTemplateList();
    _renderRecipientCount();
    _updateComposeFromTemplate();
  };

  // ── Template list (left panel) ─────────────────────────────────────────────
  const _renderTemplateList = () => {
    const wrap = document.getElementById('template-list');
    if (!wrap) return;
    wrap.innerHTML = _templates.map(t => `
      <div class="tmpl-item ${_editingId === t.id ? 'active' : ''}" onclick="BulkEmail.selectTemplate('${esc(t.id)}')">
        <div class="tmpl-item-name">${esc(t.name)}</div>
        <div class="tmpl-item-subject">${esc(t.subject)}</div>
        <div class="tmpl-item-actions">
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();BulkEmail.editTemplate('${esc(t.id)}')">✏</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();BulkEmail.deleteTemplate('${esc(t.id)}')">✕</button>
        </div>
      </div>`).join('') + `
      <button class="btn btn-outline btn-sm" style="width:100%;margin-top:.5rem" onclick="BulkEmail.newTemplate()">
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
    const subjEl = document.getElementById('compose-subject');
    const bodyEl = document.getElementById('compose-body');
    if (subjEl) subjEl.value = t.subject;
    if (bodyEl) bodyEl.value = t.body;
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
  const _updatePreview = () => {
    const subject = document.getElementById('compose-subject')?.value || '';
    const body    = document.getElementById('compose-body')?.value    || '';
    const prevEl  = document.getElementById('email-preview-frame');
    if (!prevEl) return;

    // Client-side var substitution with sample values
    const sample = { name: 'Ahmed Khan', package: 'Claude Pro — 1 Month', expiry: '05 August 2025', daysLeft: '12', product: 'Claude Pro', email: 'ahmed@example.com', wechat: 'ahmed_wechat' };
    const replace = str => str
      .replace(/{{name}}/g,     sample.name)
      .replace(/{{package}}/g,  sample.package)
      .replace(/{{product}}/g,  sample.product)
      .replace(/{{email}}/g,    sample.email)
      .replace(/{{wechat}}/g,   sample.wechat)
      .replace(/{{expiry}}/g,   sample.expiry)
      .replace(/{{daysLeft}}/g, sample.daysLeft);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;background:#f0f4ff}</style></head><body>
      <div style="max-width:580px;margin:16px auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <div style="background:#2563eb;padding:20px 28px">
          <div style="font-size:18px;font-weight:700;color:#fff">DTC</div>
          <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">Digital Tools Corner</div>
        </div>
        <div style="padding:8px 16px;background:#f8faff;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b">
          <strong>Subject:</strong> ${replace(esc(subject))}
        </div>
        <div style="padding:24px 28px;font-size:14px;color:#334155;line-height:1.75">${replace(body)}</div>
        <div style="padding:14px 28px;background:#f8faff;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
          DTC — Digital Tools Corner · dtc@dtc1.shop
        </div>
      </div>
    </body></html>`;
    prevEl.srcdoc = html;
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
    send, insertVar,
  };
})();
