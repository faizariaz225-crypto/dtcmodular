/* ─── DTC Admin — App Shell (sidebar navigation) ────────────────────────── */

'use strict';

const Shell = (() => {

  const init = () => {
    // Mobile sidebar toggle
    document.getElementById('mob-menu-btn')
      .addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  };

  // Switch active page + sidebar highlight
  const navigate = (pageId, navEl) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById('page-' + pageId).classList.add('active');
    navEl.classList.add('active');

    // Close mobile drawer
    document.getElementById('sidebar').classList.remove('open');

    // Page-specific on-enter hooks
    if (pageId === 'instructions') Instructions.render();
  };

  // Called by nav-items: onclick="Shell.navigate('dashboard', this)"
  return { init, navigate };
})();
