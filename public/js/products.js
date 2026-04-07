/* ─── DTC Admin — Products Module ───────────────────────────────────────── */
'use strict';

const Products = (() => {
  let _products = [];

  const loadData = async () => {
    const d = await api(`/admin/products?adminKey=${encodeURIComponent(Store.adminKey)}`);
    if (d && !d.error) { _products = d.products || []; Store.setProducts(_products); }
  };

  const getAll = () => _products;

  // ── Render product list ────────────────────────────────────────────────────
  const render = () => {
    const wrap = document.getElementById('products-list');
    if (!wrap) return;
    if (!_products.length) { wrap.innerHTML = '<div class="empty">No products yet. Click "+ New Product" to add one.</div>'; return; }

    wrap.innerHTML = _products.map(p => `
      <div class="product-card ${p.active ? '' : 'inactive'}">
        <div class="product-card-header">
          <div style="display:flex;align-items:center;gap:.7rem">
            <div class="product-dot" style="background:${p.color || '#2563eb'}"></div>
            <div>
              <div class="product-name">${esc(p.name)}</div>
              <div class="product-meta">${esc(p.description || '')}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
            ${p.credentialsMode ? '<span class="badge" style="background:#fdf4ff;border:1px solid #e9d5ff;color:#7c3aed">🔑 Credentials</span>' : '<span class="badge b-acc">📋 Session</span>'}
            ${p.active ? '<span class="badge b-act">● Active</span>' : '<span class="badge b-deact">○ Inactive</span>'}
            <button class="btn btn-outline btn-sm" onclick="Products.openModal('${esc(p.id)}')">✏ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="Products.remove('${esc(p.id)}')">✕</button>
          </div>
        </div>
        <div class="product-packages">
          ${p.packages.map(pk => `
            <div class="pkg-row">
              <span class="pkg-label">${esc(pk.label)}</span>
              <span class="pkg-price">$${pk.price}</span>
              <span class="pkg-duration">${pk.durationDays}d</span>
            </div>`).join('')}
        </div>
        ${p.credentialsMode ? `
          <div style="margin-top:.6rem;display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn btn-warn btn-sm" onclick="Products.pushCredentials('${esc(p.id)}')">🔄 Push Updated Credentials</button>
          </div>` : ''}
        ${p.credentialsMode && p.loginDetails ? `
          <div class="product-creds">
            <div class="creds-label">Login details shared with customer on approval</div>
            <div class="creds-preview">${esc(p.loginDetails.slice(0, 120))}${p.loginDetails.length > 120 ? '…' : ''}</div>
          </div>` : ''}
      </div>`).join('');
  };

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openModal = (id) => {
    const p = id ? _products.find(x => x.id === id) : null;
    document.getElementById('prod-modal-title').textContent = p ? 'Edit Product' : 'New Product';
    document.getElementById('prod-id').value           = p ? p.id : 'prod-' + Date.now();
    document.getElementById('prod-name').value         = p ? p.name : '';
    document.getElementById('prod-desc').value         = p ? (p.description || '') : '';
    document.getElementById('prod-type').value         = p ? (p.type || 'session') : 'session';
    document.getElementById('prod-color').value        = p ? (p.color || '#2563eb') : '#2563eb';
    document.getElementById('prod-active').checked     = p ? (p.active !== false) : true;
    document.getElementById('prod-creds-mode').checked = p ? !!p.credentialsMode : false;
    document.getElementById('prod-login-details').value= p ? (p.loginDetails || '') : '';
    document.getElementById('prod-access-link').value  = p ? (p.accessLink   || '') : '';
    _renderPkgRows(p ? p.packages : [{ label: '', price: '', durationDays: 30 }]);
    _toggleCredsMode();
    document.getElementById('prod-err').classList.remove('show');
    document.getElementById('prod-modal').classList.add('open');
  };

  const closeModal = () => document.getElementById('prod-modal').classList.remove('open');

  const _renderPkgRows = (packages) => {
    const wrap = document.getElementById('pkg-rows');
    wrap.innerHTML = packages.map((pk, i) => _pkgRowHtml(pk, i)).join('');
  };

  const _pkgRowHtml = (pk, i) => `
    <div class="pkg-edit-row" data-idx="${i}">
      <input class="pkg-label-input" placeholder="e.g. Pro — 1 Month" value="${esc(pk.label || '')}"/>
      <div class="pkg-price-wrap"><span class="pkg-currency">$</span><input class="pkg-price-input" type="number" min="0.01" step="0.01" placeholder="Price" value="${pk.price || ''}"/></div>
      <div style="display:flex;align-items:center;gap:.3rem"><input class="pkg-dur-input" type="number" min="1" placeholder="Days" value="${pk.durationDays || ''}"/><span style="font-size:.7rem;color:var(--muted)">days</span></div>
      <button class="btn btn-danger btn-sm" onclick="Products.removePkgRow(this)" style="flex-shrink:0">✕</button>
    </div>`;

  const addPkgRow = () => {
    const wrap = document.getElementById('pkg-rows');
    const div = document.createElement('div');
    div.innerHTML = _pkgRowHtml({ label:'', price:'', durationDays:30 }, wrap.children.length);
    wrap.appendChild(div.firstElementChild);
  };

  const removePkgRow = (btn) => {
    const row = btn.closest('.pkg-edit-row');
    if (document.getElementById('pkg-rows').children.length <= 1) { alert('At least one package is required.'); return; }
    row.remove();
  };

  const _toggleCredsMode = () => {
    const on = document.getElementById('prod-creds-mode').checked;
    document.getElementById('creds-details-wrap').style.display = on ? '' : 'none';
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = async () => {
    const errEl = document.getElementById('prod-err');
    errEl.classList.remove('show');
    const id   = document.getElementById('prod-id').value.trim();
    const name = document.getElementById('prod-name').value.trim();
    if (!name) { errEl.textContent = 'Product name is required.'; errEl.classList.add('show'); return; }

    // Collect packages
    const rows = document.querySelectorAll('#pkg-rows .pkg-edit-row');
    const packages = [];
    for (const row of rows) {
      const label = row.querySelector('.pkg-label-input').value.trim();
      const price = parseFloat(row.querySelector('.pkg-price-input').value);
      const dur   = parseInt(row.querySelector('.pkg-dur-input').value);
      if (!label) { errEl.textContent = 'All package labels are required.'; errEl.classList.add('show'); return; }
      if (!price || price <= 0) { errEl.textContent = `Price for "${label}" must be greater than 0.`; errEl.classList.add('show'); return; }
      if (!dur || dur <= 0)  { errEl.textContent = `Duration for "${label}" must be at least 1 day.`; errEl.classList.add('show'); return; }
      packages.push({ label, price, durationDays: dur });
    }
    if (!packages.length) { errEl.textContent = 'At least one package is required.'; errEl.classList.add('show'); return; }

    const product = {
      id, name,
      description:     document.getElementById('prod-desc').value.trim(),
      type:            document.getElementById('prod-type').value,
      color:           document.getElementById('prod-color').value,
      active:          document.getElementById('prod-active').checked,
      credentialsMode: document.getElementById('prod-creds-mode').checked,
      loginDetails:    document.getElementById('prod-login-details').value.trim(),
      accessLink:      document.getElementById('prod-access-link').value.trim(),
      packages,
    };

    const d = await api('/admin/products/save', { adminKey: Store.adminKey, product });
    if (!d || !d.success) { errEl.textContent = (d && d.error) || 'Failed to save.'; errEl.classList.add('show'); return; }

    const idx = _products.findIndex(p => p.id === id);
    if (idx >= 0) _products[idx] = product; else _products.push(product);
    Store.setProducts(_products);
    closeModal();
    render();
    Dashboard.refreshDropdowns();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const remove = async (id) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const d = await api('/admin/products/delete', { adminKey: Store.adminKey, id });
    if (d && d.success) { _products = _products.filter(p => p.id !== id); Store.setProducts(_products); render(); Dashboard.refreshDropdowns(); }
    else alert('Failed to delete.');
  };

  return { loadData, getAll, render, openModal, closeModal, addPkgRow, removePkgRow, save, remove, _toggleCredsMode };
})();

// ── Push updated credentials to all active tokens ────────────────────────────
Products.pushCredentials = async (productId) => {
  const data = Products.getAll();
  const prod = data.find(p => p.id === productId);
  if (!prod) return;
  if (!confirm(`Push updated credentials/access link to ALL active customers of "${prod.name}"? They will see the new details immediately.`)) return;
  const d = await api('/admin/products/update-credentials', {
    adminKey:     Store.adminKey,
    productId,
    loginDetails: prod.loginDetails || '',
    accessLink:   prod.accessLink   || '',
  });
  if (d && d.success) alert(`✓ Updated ${d.updatedTokens} active customer${d.updatedTokens !== 1 ? 's' : ''}.`);
  else alert('Failed: ' + (d && d.error));
};
