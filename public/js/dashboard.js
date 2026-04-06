/* ─── DTC Admin — Dashboard Module ──────────────────────────────────────── */
'use strict';

const Dashboard = (() => {

  // ── Stats ──────────────────────────────────────────────────────────────────
  const _updateStats = (entries) => {
    const cnt = { all:0, pending:0, accessed:0, submitted:0, activated:0, expired:0, declined:0, deactivated:0 };
    entries.forEach(([,, s]) => { cnt.all++; cnt[s] = (cnt[s] || 0) + 1; });
    document.getElementById('s-all').textContent  = cnt.all;
    document.getElementById('s-pend').textContent = cnt.pending;
    document.getElementById('s-acc').textContent  = cnt.accessed;
    document.getElementById('s-sub').textContent  = cnt.submitted;
    document.getElementById('s-act').textContent  = cnt.activated;
    document.getElementById('s-exp').textContent  = (cnt.expired || 0) + (cnt.declined || 0);
    // Revenue stat
    const rev = Store.revenue || { total: 0 };
    const revEl = document.getElementById('s-rev');
    if (revEl) revEl.textContent = '$' + rev.total.toFixed(2);
  };

  // ── Sub expiry cell ────────────────────────────────────────────────────────
  const _subCell = (t) => {
    if (!t.subscriptionExpiresAt) return '<span style="color:var(--muted2);font-size:.65rem">—</span>';
    const days  = daysUntil(t.subscriptionExpiresAt);
    const subSt = getSubStatus(t);
    const cls   = subSt === 'expired' || subSt === 'danger' ? 'danger' : subSt === 'soon' ? 'soon' : 'ok';
    let flag = '';
    if (days <= 0) flag = `<div class="exp-flag expired">⏱ Expired ${Math.abs(days)}d ago</div>`;
    else if (days <= 30) flag = `<div class="exp-flag ${subSt === 'danger' ? 'danger' : 'soon'}">⚠ ${days}d left</div>`;
    return `<div class="sub-exp ${cls}"><div class="days">${days <= 0 ? 'Expired' : days + ' days left'}</div><div class="date">${fmt(t.subscriptionExpiresAt)}</div>${flag}</div>`;
  };

  // ── Data cell ──────────────────────────────────────────────────────────────
  const _dataCell = (t, token) => {
    if (t.credentialsMode) return `<span class="badge" style="background:#fdf4ff;border:1px solid #e9d5ff;color:#7c3aed">🔑 Credentials</span>`;
    if (t.product === 'chatgpt' && t.sessionData) return `<div class="orgid-wrap"><span class="orgid-txt" style="color:var(--gpt)">ChatGPT Session</span><button class="icopy" style="color:var(--gpt)" onclick="Modals.viewSession('${token}')">View</button><button class="icopy" onclick="copyText(${JSON.stringify(t.sessionData)},this)">Copy</button></div>`;
    if (t.orgId) return `<div class="orgid-wrap"><span class="orgid-txt">${esc(t.orgId)}</span><button class="icopy" onclick="copyText('${esc(t.orgId)}',this)">Copy</button></div>`;
    return '<span style="color:var(--muted2);font-size:.65rem">Not submitted</span>';
  };

  // ── Action cell ────────────────────────────────────────────────────────────
  const _actionCell = (t, token, status) => {
    if (t.deactivated) return `<div><span class="badge b-deact">⊘ Deactivated</span><div style="font-size:.62rem;color:#6b7280;font-family:'JetBrains Mono',monospace;margin-top:.2rem">⊘ ${t.deactivatedAt ? fmtFull(new Date(t.deactivatedAt)) : '—'}</div><button class="action-btn react" style="margin-top:.4rem" onclick="Dashboard.reactivate('${token}')">↑ Reactivate</button></div>`;
    if (t.approved)    return `<div><span class="badge b-act">✓ Activated</span><div style="font-size:.62rem;color:var(--success);font-family:'JetBrains Mono',monospace;margin-top:.2rem">✓ ${fmtFull(new Date(t.approvedAt))}</div><button class="action-btn deact" style="margin-top:.4rem" onclick="Dashboard.deactivate('${token}')">⊘ Deactivate</button></div>`;
    if (t.declined)    return `<div><span class="badge b-dec">✕ Declined</span><div style="font-size:.62rem;color:var(--error);font-family:'JetBrains Mono',monospace;margin-top:.2rem">✕ ${fmtFull(new Date(t.declinedAt))}</div><button class="action-btn deact" style="margin-top:.4rem" onclick="Dashboard.deactivate('${token}')">⊘ Deactivate</button></div>`;
    if (status === 'submitted') return `<div class="action-wrap"><button class="approve-btn" id="ab-${token}" onclick="Dashboard.approve('${token}')">✓ Approve</button><button class="decline-btn" id="db-${token}" onclick="Modals.openDecline('${token}')">✕ Decline</button><button class="action-btn deact" onclick="Dashboard.deactivate('${token}')">⊘ Deactivate</button></div>`;
    if (!t.used) return `<div><button class="action-btn deact" onclick="Dashboard.deactivate('${token}')">⊘ Deactivate</button></div>`;
    return '<span style="color:var(--muted2);font-size:.65rem">—</span>';
  };

  // ── Log row ────────────────────────────────────────────────────────────────
  const _logRow = (token, t) => {
    const entries = (t.accessLog || []).slice(-10).map(e => `<div class="log-entry"><span class="le-t">${fmtFull(new Date(e.at))}</span><span class="le-ip">${esc(e.ip)}</span><span class="le-ua" title="${esc(e.userAgent)}">${esc(parseUA(e.userAgent))}</span></div>`).join('');
    return `<tr class="log-row" id="log-row-${token}"><td colspan="8"><div class="log-inner"><div class="log-hdr"><span>Time</span><span>IP</span><span>Device</span></div>${entries || '<div style="color:var(--muted2);font-size:.63rem">No records.</div>'}</div></td></tr>`;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const render = () => {
    const filter  = Store.dashFilter;
    const entries = Object.entries(Store.tokens)
      .map(([tok, t]) => [tok, t, getLinkStatus(t)])
      .sort((a, b) => new Date(b[1].createdAt || 0) - new Date(a[1].createdAt || 0));
    _updateStats(entries);
    const filtered = filter === 'all' ? entries : entries.filter(([,, s]) => s === filter);
    const wrap = document.getElementById('dash-tbl');
    if (!filtered.length) { wrap.innerHTML = '<div class="empty">No links match this filter.</div>'; return; }

    const rows = filtered.map(([token, t, status]) => {
      const subSt  = getSubStatus(t);
      const rowCls = t.deactivated ? 'row-deactivated' : subSt === 'soon' || subSt === 'danger' ? 'row-expiring' : subSt === 'expired' ? 'row-expired-sub' : status === 'declined' ? 'row-declined' : '';

      // Product colour dot
      const products = Store.products || [];
      const prod     = products.find(p => p.id === t.productId);
      const dotColor = prod ? (prod.color || '#2563eb') : (t.product === 'chatgpt' ? 'var(--gpt)' : 'var(--blue)');
      const prodTag  = `<span class="prod-tag" style="background:${dotColor}20;border:1px solid ${dotColor}40;color:${dotColor}">${esc(t.productName || t.product || 'Claude')}</span>`;

      // Price badge
      const priceBadge = t.price ? `<span class="price-badge">$${t.price.toFixed(2)}</span>` : '';

      const ac     = t.accessCount || 0;
      const hasLog = (t.accessLog || []).length > 0;

      const mainRow = `<tr class="${rowCls}">
        <td>
          <div style="display:flex;align-items:center;gap:.35rem;margin-bottom:.2rem;flex-wrap:wrap">${prodTag}${priceBadge}</div>
          <div style="font-weight:600;font-size:.82rem">${esc(t.customerName)}</div>
          <div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${esc(t.packageType)}</div>
          ${t.email ? `<div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${esc(t.email)}</div>` : ''}
        </td>
        <td>${statusBadge(status)}</td>
        <td>${_dataCell(t, token)}</td>
        <td>
          <div style="font-size:.65rem;color:var(--muted);line-height:1.7">
            <div style="display:flex;gap:.4rem"><span style="color:var(--muted2);min-width:52px;font-weight:500">Created</span><span>${fmt(t.createdAt)}</span></div>
            <div style="display:flex;gap:.4rem"><span style="color:var(--muted2);min-width:52px;font-weight:500">Expires</span><span>${fmt(t.expiresAt)}</span></div>
            <div style="display:flex;gap:.4rem"><span style="color:var(--muted2);min-width:52px;font-weight:500">1st open</span><span>${t.firstAccessedAt ? fmt(t.firstAccessedAt) : '—'}</span></div>
            ${t.submittedAt ? `<div style="display:flex;gap:.4rem"><span style="color:var(--muted2);min-width:52px;font-weight:500">Submit</span><span>${fmt(t.submittedAt)}</span></div>` : ''}
            ${t.approvedAt  ? `<div style="display:flex;gap:.4rem"><span style="color:var(--muted2);min-width:52px;font-weight:500">Active</span><span style="color:var(--success)">${fmt(t.approvedAt)}</span></div>` : ''}
          </div>
          <span style="display:inline-block;background:${ac>0?'var(--blue-light)':'#f1f5f9'};border:1px solid ${ac>0?'var(--blue-mid)':'var(--border)'};border-radius:4px;padding:.08rem .4rem;font-size:.61rem;font-family:'JetBrains Mono',monospace;color:${ac>0?'var(--blue)':'var(--muted2)'};margin-top:.25rem">👁 ${ac} open${ac!==1?'s':''}</span>
          ${hasLog ? `<button class="xbtn" id="xb-${token}" onclick="Dashboard.toggleLog('${token}')">▸ View access log</button>` : ''}
        </td>
        <td>${_subCell(t)}</td>
        <td>${t.wechat ? `<span style="font-size:.72rem;font-family:'JetBrains Mono',monospace">${esc(t.wechat)}</span>` : '<span style="color:var(--muted2)">—</span>'}</td>
        <td>${t.price ? `<strong style="color:var(--success);font-size:.82rem">$${t.price.toFixed(2)}</strong>` : '<span style="color:var(--muted2)">—</span>'}</td>
        <td>${_actionCell(t, token, status)}</td>
      </tr>`;
      return mainRow + _logRow(token, t);
    }).join('');

    wrap.innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>Customer</th><th>Status</th><th>Data</th><th>Timeline</th><th>Subscription</th><th>WeChat</th><th>Price</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };

  // ── Reload ─────────────────────────────────────────────────────────────────
  const reload = async () => {
    const d = await api('/admin/sessions-data', { adminKey: Store.adminKey });
    if (!d || d.error) return;
    Store.load(d);
    try { render(); } catch(e) { console.warn(e); }
    try { Customers.render(); } catch(e) { console.warn(e); }
    try { EmailLog.render(); } catch(e) { console.warn(e); }
    try { Revenue.render(); } catch(e) { console.warn(e); }
  };

  // ── Generate link ──────────────────────────────────────────────────────────
  const generateLink = async () => {
    const customerName  = document.getElementById('cust-name').value.trim();
    const productId     = document.getElementById('gen-product').value;
    const packageLabel  = document.getElementById('pkg').value;
    const price         = document.getElementById('gen-price').value;
    const instr         = document.getElementById('gen-instr-set').value;
    const postInstr     = document.getElementById('gen-post-instr-set').value;
    const errEl         = document.getElementById('gen-err');
    errEl.classList.remove('show');

    if (!customerName) { errEl.textContent = 'Customer name is required.'; errEl.classList.add('show'); return; }
    if (!productId)    { errEl.textContent = 'Please select a product.'; errEl.classList.add('show'); return; }
    if (!packageLabel) { errEl.textContent = 'Please select a package.'; errEl.classList.add('show'); return; }
    if (!price || parseFloat(price) <= 0) { errEl.textContent = 'Price must be greater than $0. Generating free links is not allowed.'; errEl.classList.add('show'); return; }

    const d = await api('/admin/generate', { adminKey: Store.adminKey, customerName, productId, packageLabel, price: parseFloat(price), instructionSetId: instr || undefined, postInstructionSetId: postInstr || undefined });
    if (!d || d.error) { errEl.textContent = (d && d.error) || 'Failed to generate link.'; errEl.classList.add('show'); return; }
    document.getElementById('gen-link').textContent = d.link;
    document.getElementById('gen-price-display').textContent = '$' + parseFloat(price).toFixed(2);
    document.getElementById('link-result').classList.add('show');
    document.getElementById('copy-btn').textContent = 'Copy';
    document.getElementById('copy-btn').classList.remove('done');
    reload();
  };

  const copyGenLink = () => { navigator.clipboard.writeText(document.getElementById('gen-link').textContent).then(() => { const b = document.getElementById('copy-btn'); b.textContent = 'Copied ✓'; b.classList.add('done'); }); };

  // ── Approve / Decline / Deactivate ────────────────────────────────────────
  const approve = async (token) => {
    const btn = document.getElementById(`ab-${token}`);
    if (btn) { btn.textContent = '…'; btn.disabled = true; }
    const d = await api('/admin/approve', { adminKey: Store.adminKey, token });
    if (d && d.success) reload(); else { if (btn) { btn.textContent = '✓ Approve'; btn.disabled = false; } alert('Failed.'); }
  };
  const deactivate = async (token) => {
    if (!confirm('Deactivate this link?')) return;
    const d = await api('/admin/deactivate', { adminKey: Store.adminKey, token });
    if (d && d.success) reload(); else alert('Failed.');
  };
  const reactivate = async (token) => {
    const d = await api('/admin/reactivate', { adminKey: Store.adminKey, token });
    if (d && d.success) reload(); else alert('Failed.');
  };

  const toggleLog = (token) => {
    const row = document.getElementById(`log-row-${token}`);
    const btn = document.getElementById(`xb-${token}`);
    const open = row.classList.toggle('open');
    if (btn) btn.textContent = open ? '▾ Hide access log' : '▸ View access log';
  };

  // ── Dropdowns: populate from products list ─────────────────────────────────
  const refreshDropdowns = (prodId) => {
    const products  = Store.products || [];
    const productSel= document.getElementById('gen-product');
    if (!productSel) return;

    // Rebuild product dropdown
    const currentProdId = prodId || productSel.value;
    productSel.innerHTML = '<option value="">— Select Product —</option>';
    products.filter(p => p.active !== false).forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.name;
      if (p.id === currentProdId) o.selected = true;
      productSel.appendChild(o);
    });

    // Packages for selected product
    const selectedProd = products.find(p => p.id === (prodId || productSel.value));
    const pkgSel = document.getElementById('pkg');
    pkgSel.innerHTML = '<option value="">— Select Package —</option>';
    if (selectedProd) {
      selectedProd.packages.forEach(pk => {
        const o = document.createElement('option');
        o.value = pk.label; o.textContent = `${pk.label} — $${pk.price}`;
        pkgSel.appendChild(o);
      });
    }

    // Instruction dropdowns
    _buildInstrOptions('gen-instr-set',      selectedProd);
    _buildInstrOptions('gen-post-instr-set', selectedProd);
  };

  // Called when product changes — auto-fill price
  const onProductChange = () => {
    refreshDropdowns(document.getElementById('gen-product').value);
    document.getElementById('gen-price').value = '';
  };

  // Called when package changes — auto-fill price from product definition
  const onPackageChange = () => {
    const products = Store.products || [];
    const prodId   = document.getElementById('gen-product').value;
    const pkgLabel = document.getElementById('pkg').value;
    const prod     = products.find(p => p.id === prodId);
    if (!prod) return;
    const pkg = prod.packages.find(pk => pk.label === pkgLabel);
    if (pkg) document.getElementById('gen-price').value = pkg.price;
  };

  const _buildInstrOptions = (selId, prod) => {
    const sel = document.getElementById(selId); if (!sel) return;
    const defaultId = prod && prod.type === 'chatgpt' ? 'chatgpt-plus' : 'default-claude';
    sel.innerHTML = '<option value="">— Default —</option>';
    Object.values(Store.instructions.sets || {}).forEach(s => {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.name;
      if (s.id === defaultId) o.selected = true;
      sel.appendChild(o);
    });
  };

  const setFilter = (f, btn) => {
    Store.setDashFilter(f);
    document.querySelectorAll('#df .fb').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  };

  return { render, reload, generateLink, copyGenLink, approve, deactivate, reactivate, toggleLog, refreshDropdowns, onProductChange, onPackageChange, setFilter };
})();
