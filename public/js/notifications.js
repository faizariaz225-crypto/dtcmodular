/* ─── DTC Admin — Notifications Module ─────────────────────────────────── */

'use strict';

const Notifications = (() => {

  const load = async () => {
    const d = await api(`/admin/notification?adminKey=${encodeURIComponent(Store.adminKey)}`);
    if (!d || d.error) return;
    document.getElementById('notif-enabled').checked = d.enabled || false;
    document.getElementById('notif-message').value   = d.message || '';
    document.getElementById('notif-type').value      = d.type    || 'info';
    _updatePreview();
  };

  const save = async () => {
    const enabled = document.getElementById('notif-enabled').checked;
    const message = document.getElementById('notif-message').value.trim();
    const type    = document.getElementById('notif-type').value;
    if (enabled && !message) {
      showMsg('notif-ok', 'notif-err', false, 'Please enter a notification message before enabling.');
      return;
    }
    const d = await api('/admin/notification', { adminKey: Store.adminKey, enabled, message, type });
    showMsg('notif-ok', 'notif-err', d && d.success,
      d && d.success ? '✓ Notification saved successfully.' : 'Failed to save.');
    _updatePreview();
  };

  const _updatePreview = () => {
    const enabled = document.getElementById('notif-enabled').checked;
    const message = document.getElementById('notif-message').value.trim();
    const type    = document.getElementById('notif-type').value;
    const preview = document.getElementById('notif-preview');
    if (!preview) return;
    if (!enabled || !message) {
      preview.style.display = 'none';
      return;
    }
    const colors = {
      info:    { bg:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8', icon:'ℹ' },
      success: { bg:'#f0fdf4', border:'#bbf7d0', color:'#15803d', icon:'✓' },
      warning: { bg:'#fffbeb', border:'#fde68a', color:'#b45309', icon:'⚠' },
      error:   { bg:'#fef2f2', border:'#fecaca', color:'#dc2626', icon:'⚠' },
    };
    const c = colors[type] || colors.info;
    preview.style.display = 'block';
    preview.innerHTML = `
      <div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:.85rem 1.1rem;display:flex;align-items:flex-start;gap:.7rem">
        <span style="font-size:1rem;flex-shrink:0;margin-top:.05rem">${c.icon}</span>
        <span style="font-size:.82rem;color:${c.color};font-weight:500;line-height:1.5">${esc(message)}</span>
      </div>`;
  };

  const init = () => {
    const tog = document.getElementById('notif-enabled');
    const msg = document.getElementById('notif-message');
    const typ = document.getElementById('notif-type');
    if (tog) tog.addEventListener('change', _updatePreview);
    if (msg) msg.addEventListener('input',  _updatePreview);
    if (typ) typ.addEventListener('change', _updatePreview);
  };

  return { load, save, init };
})();
