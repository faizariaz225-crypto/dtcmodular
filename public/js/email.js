/* ─── DTC Admin — Email Config & Log Module ──────────────────────────────── */

'use strict';

const PRESETS = {
  gmail:    { host: 'smtp.gmail.com',           port: '587', note: true },
  outlook:  { host: 'smtp-mail.outlook.com',    port: '587' },
  yahoo:    { host: 'smtp.mail.yahoo.com',       port: '587' },
  brevo:    { host: 'smtp-relay.brevo.com',      port: '587' },
  sendgrid: { host: 'smtp.sendgrid.net',         port: '587' },
};

// ── Email Config ──────────────────────────────────────────────────────────────
const EmailConfig = (() => {

  const load = async () => {
    const d = await api(`/admin/email-config?adminKey=${encodeURIComponent(Store.adminKey)}`);
    if (!d || d.error) return;
    document.getElementById('em-host').value  = d.host    || '';
    document.getElementById('em-port').value  = d.port    || '587';
    document.getElementById('em-user').value  = d.user    || '';
    document.getElementById('em-pass').value  = d.pass    || '';
    document.getElementById('em-name').value  = d.fromName|| 'DTC Digital Tools Corner';
    document.getElementById('em-ssl').checked = d.secure  || false;
    if (d.host === 'smtp.gmail.com') document.getElementById('gmail-guide').style.display = 'block';
  };

  const applyPreset = (key) => {
    const p = PRESETS[key];
    if (!p) return;
    document.getElementById('em-host').value  = p.host;
    document.getElementById('em-port').value  = p.port;
    document.getElementById('em-ssl').checked = false;
    document.getElementById('gmail-guide').style.display = p.note ? 'block' : 'none';
  };

  const save = async () => {
    const config = {
      host:     document.getElementById('em-host').value.trim(),
      port:     document.getElementById('em-port').value.trim() || '587',
      user:     document.getElementById('em-user').value.trim(),
      pass:     document.getElementById('em-pass').value,
      fromName: document.getElementById('em-name').value.trim() || 'DTC Digital Tools Corner',
      secure:   document.getElementById('em-ssl').checked,
    };
    if (!config.host || !config.user || !config.pass) {
      showMsg('em-ok', 'em-err', false, 'Please fill in Host, Email and Password.');
      return;
    }
    const d = await api('/admin/email-config', { adminKey: Store.adminKey, config });
    showMsg('em-ok', 'em-err', d && d.success, d && d.success ? '✓ Configuration saved.' : 'Failed to save.');
  };

  const sendTest = async () => {
    const to = document.getElementById('em-user').value.trim();
    if (!to) { showMsg('em-ok', 'em-err', false, 'Save your configuration first.'); return; }
    document.getElementById('test-txt').textContent = 'Sending…';
    const d = await api('/admin/test-email', { adminKey: Store.adminKey, to });
    document.getElementById('test-txt').textContent = 'Send Test Email';
    showMsg('em-ok', 'em-err', d && d.ok, d && d.ok
      ? `✓ Test email sent to ${to}.`
      : '✕ ' + (d && d.error));
  };

  return { load, applyPreset, save, sendTest };
})();

// ── Email Log ─────────────────────────────────────────────────────────────────
const EmailLog = (() => {

  const render = () => {
    const wrap = document.getElementById('email-log-wrap');
    const log  = Store.emailLog;
    if (!log.length) {
      wrap.innerHTML = '<div class="empty">No emails sent yet.</div>';
      return;
    }
    const typeClass = (type) => {
      if (!type) return 'b-pend';
      if (type.includes('expired')) return 'b-exp';
      if (type.includes('remind') || type.includes('manual')) return 'b-sub';
      return 'b-pend';
    };
    const rows = [...log].reverse().slice(0, 30).map(e => `
      <tr>
        <td>${fmtFull(new Date(e.sentAt))}</td>
        <td>${esc(e.to)}</td>
        <td>${esc(e.subject)}</td>
        <td><span class="badge ${typeClass(e.type)}">${esc(e.type || '—')}</span></td>
      </tr>`).join('');
    wrap.innerHTML = `<table class="email-log-tbl">
      <thead><tr><th>Sent At</th><th>To</th><th>Subject</th><th>Type</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  return { render };
})();
