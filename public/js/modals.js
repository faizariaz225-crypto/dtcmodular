/* ─── DTC Admin — Modals Module ─────────────────────────────────────────── */

'use strict';

const Modals = (() => {

  // ── Decline modal ─────────────────────────────────────────────────────────
  const openDecline = (token) => {
    document.getElementById('decline-token').value = token;
    document.getElementById('decline-reason').value =
      'The details provided could not be verified. Please ensure you have entered the correct details and request a new link.';
    document.getElementById('decline-modal').classList.add('open');
  };

  const closeDecline = () => document.getElementById('decline-modal').classList.remove('open');

  const confirmDecline = async () => {
    const token  = document.getElementById('decline-token').value;
    const reason = document.getElementById('decline-reason').value.trim();
    if (!reason) { alert('Please provide a reason.'); return; }
    const d = await api('/admin/decline', { adminKey: Store.adminKey, token, reason });
    closeDecline();
    if (d && d.success) Dashboard.reload();
    else alert('Failed to decline.');
  };

  // ── Session data modal ─────────────────────────────────────────────────────
  const viewSession = (token) => {
    const t = Store.tokens[token];
    if (!t || !t.sessionData) return;
    let display = t.sessionData;
    try { display = JSON.stringify(JSON.parse(t.sessionData), null, 2); } catch {}
    document.getElementById('session-modal-content').value = display;
    document.getElementById('session-modal').classList.add('open');
  };

  const closeSession = () => document.getElementById('session-modal').classList.remove('open');

  const copySession = () => {
    const val = document.getElementById('session-modal-content').value;
    navigator.clipboard.writeText(val).then(() => alert('Session data copied!'));
  };

  // ── Click-outside close on all modals ────────────────────────────────────
  const init = () => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });
  };

  return { init, openDecline, closeDecline, confirmDecline, viewSession, closeSession, copySession };
})();
