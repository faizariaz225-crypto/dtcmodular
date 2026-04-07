/* ─── DTC Admin — Resellers Module ──────────────────────────────────────── */
'use strict';

const Resellers = (() => {

  const render = () => {
    const rev = Store.revenue || { total: 0, byReseller: {}, resellerTotal: 0, directTotal: 0 };
    const tokens = Store.tokens || {};

    // Summary stats
    const rTotalEl = document.getElementById('reseller-total');
    const dTotalEl = document.getElementById('direct-total');
    if (rTotalEl) rTotalEl.textContent = _fmt(rev.resellerTotal || 0);
    if (dTotalEl) dTotalEl.textContent = _fmt(rev.directTotal   || 0);

    // Reseller table
    const wrap = document.getElementById('reseller-breakdown');
    if (!wrap) return;

    const resellers = Object.entries(rev.byReseller || {});
    if (!resellers.length) {
      wrap.innerHTML = '<div class="empty">No reseller sales yet. Tag a link with a Reseller ID when generating to start tracking.</div>';
      return;
    }

    // Sort by total desc
    resellers.sort((a, b) => b[1].total - a[1].total);

    const rows = resellers.map(([rid, r]) => {
      // Get their individual sales
      const sales = Object.values(tokens)
        .filter(t => t.resellerId === rid && t.approved)
        .sort((a, b) => new Date(b.approvedAt||0) - new Date(a.approvedAt||0))
        .slice(0, 5);

      return `
        <div class="reseller-card">
          <div class="reseller-header">
            <div>
              <div class="reseller-name">${esc(r.name)}</div>
              <div class="reseller-id">ID: ${esc(rid)}</div>
            </div>
            <div style="text-align:right">
              <div class="reseller-revenue">${_fmt(r.total)}</div>
              <div class="reseller-count">${r.count} sale${r.count!==1?'s':''} · ${r.activated||0} activated</div>
            </div>
          </div>
          ${sales.length ? `
            <div class="reseller-sales">
              ${sales.map(t => `
                <div class="reseller-sale-row">
                  <span class="rs-name">${esc(t.customerName)}</span>
                  <span class="rs-pkg">${esc(t.packageType)}</span>
                  <span class="rs-date">${t.approvedAt ? fmt(t.approvedAt) : '—'}</span>
                  <span class="rs-price">${_fmt(t.price||0)}</span>
                </div>`).join('')}
              ${r.count > 5 ? `<div style="font-size:.68rem;color:var(--muted);padding:.3rem 0">+ ${r.count-5} more</div>` : ''}
            </div>` : ''}
        </div>`;
    }).join('');

    wrap.innerHTML = rows;
  };

  const _fmt = (amount) => {
    const sym = (Store.settings || {}).currencySymbol || '$';
    return sym + (amount || 0).toFixed(2);
  };

  return { render };
})();
