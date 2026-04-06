/* ─── DTC Admin — Shared Utilities ──────────────────────────────────────── */

'use strict';

// ── Date formatting ──────────────────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
       + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const fmtFull = (d) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const daysUntil = (iso) => Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));

// ── HTML escaping ────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── User-agent parser ────────────────────────────────────────────────────────
const parseUA = (ua) => {
  if (!ua || ua === 'unknown') return 'Unknown';
  if (/iPhone/i.test(ua))                          return '📱 iPhone';
  if (/iPad/i.test(ua))                            return '📱 iPad';
  if (/Android/i.test(ua) && /Mobile/i.test(ua))  return '📱 Android';
  if (/Android/i.test(ua))                         return '📱 Tablet';
  if (/Windows/i.test(ua))                         return '🖥 Windows';
  if (/Mac/i.test(ua))                             return '🖥 Mac';
  return '🌐 Browser';
};

// ── Clipboard helper ─────────────────────────────────────────────────────────
const copyText = (text, btn) => {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied ✓';
    btn.classList.add('done');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('done'); }, 2000);
  });
};

// ── Status helpers ───────────────────────────────────────────────────────────
const getLinkStatus = (t) => {
  if (t.deactivated) return 'deactivated';
  if (t.declined)    return 'declined';
  if (t.approved)    return 'activated';
  if (t.used)        return 'submitted';
  if (t.expiresAt && new Date() > new Date(t.expiresAt)) return 'expired';
  if ((t.accessCount || 0) > 0) return 'accessed';
  return 'pending';
};

const getSubStatus = (t) => {
  if (!t.subscriptionExpiresAt) return null;
  const d = daysUntil(t.subscriptionExpiresAt);
  return d < 0 ? 'expired' : d <= 5 ? 'danger' : d <= 30 ? 'soon' : 'ok';
};

const statusBadge = (s) => {
  const map = {
    pending:     ['b-pend',  '○ Not Opened'],
    accessed:    ['b-acc',   '◎ Opened'],
    submitted:   ['b-sub',   '⏳ Submitted'],
    activated:   ['b-act',   '✓ Activated'],
    expired:     ['b-exp',   '✕ Expired'],
    declined:    ['b-dec',   '✕ Declined'],
    deactivated: ['b-deact', '⊘ Deactivated'],
  };
  const [cls, label] = map[s] || map.pending;
  return `<span class="badge ${cls}"><span class="b-dot"></span>${label}</span>`;
};

// ── API wrapper ──────────────────────────────────────────────────────────────
const api = async (url, body) => {
  const opts = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' };
  const r = await fetch(url, opts);
  if (!r.ok) {
    // Gracefully return null for non-JSON responses (e.g. 404 HTML pages)
    const text = await r.text();
    return text.trim().startsWith('{') ? JSON.parse(text) : null;
  }
  return r.json();
};

// ── Show/hide feedback messages ──────────────────────────────────────────────
const showMsg = (okId, errId, ok, msg) => {
  const o = document.getElementById(okId);
  const e = document.getElementById(errId);
  if (o) { o.classList.remove('show'); o.textContent = ''; }
  if (e) { e.classList.remove('show'); e.textContent = ''; }
  const el = ok ? o : e;
  if (el) { el.textContent = msg; el.classList.add('show'); }
};
