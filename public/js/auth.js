/* ─── DTC Admin — Auth Module ────────────────────────────────────────────── */

'use strict';

const Auth = (() => {

  // ── Private ────────────────────────────────────────────────────────────────
  const _showError = (msg) => {
    const el = document.getElementById('login-err');
    el.textContent = msg;
    el.classList.add('show');
  };

  const _clearError = () => {
    document.getElementById('login-err').classList.remove('show');
  };

  const _setLoading = (loading) => {
    const btn = document.getElementById('login-btn');
    btn.disabled = loading;
    btn.textContent = loading ? 'Signing in…' : 'Sign In →';
  };

  // ── Public ─────────────────────────────────────────────────────────────────
  const init = () => {
    // Allow Enter key in password field
    document.getElementById('admin-key')
      .addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  };

  const login = async () => {
    const key = document.getElementById('admin-key').value.trim();
    if (!key) return;

    _clearError();
    _setLoading(true);

    // Step 1 — authenticate
    let data;
    try {
      data = await api('/admin/sessions-data', { adminKey: key });
    } catch (e) {
      _showError('Cannot reach the server. Please make sure it is running.');
      _setLoading(false);
      return;
    }

    if (!data || data.error) {
      _showError('Incorrect admin key. Please try again.');
      _setLoading(false);
      return;
    }

    // Step 2 — store credentials and hydrate state
    Store.setAdminKey(key);
    Store.load(data);

    // Step 3 — transition UI: hide login, reveal app shell
    document.getElementById('login-wrap').style.display = 'none';
    document.getElementById('app').style.display        = 'flex';

    _setLoading(false);

    // Step 4 — boot all modules independently (a failure in one never blocks others)
    Shell.init();
    // Load data that other modules depend on FIRST (await so data is ready)
    await safeRun('Instructions', Instructions.loadData);
    await safeRun('Products',     Products.loadData);
    await safeRun('BulkEmail',    BulkEmail.loadTemplates);
    await safeRun('Settings',     Settings.load);

    // Now render — products + instructions are available
    safeRun('Dashboard',      Dashboard.render);
    safeRun('Dashboard.dd',   Dashboard.refreshDropdowns);
    safeRun('Customers',      Customers.render);
    safeRun('EmailConfig',    EmailConfig.load);
    safeRun('EmailLog',       EmailLog.render);
    safeRun('Notifications',  Notifications.load);
    safeRun('Revenue',        Revenue.render);
    safeRun('BulkEmail.init', BulkEmail.init);
    safeRun('Resellers',      Resellers.render);
    Notifications.init();
  };

  // Silent error boundary — logs to console, never crashes login
  const safeRun = async (name, fn) => {
    try { await fn(); }
    catch (e) { console.warn(`[${name}]`, e.message); }
  };

  return { init, login };
})();
