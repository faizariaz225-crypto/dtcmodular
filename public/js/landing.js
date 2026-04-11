/* ─── DTC Admin — Landing Page Editor Module ─────────────────────────────── */
'use strict';

const Landing = (() => {

  const DEFAULTS = {
    heroTitle:       'Your Gateway to <span>AI & Academic</span> Excellence',
    heroSubtitle:    'Digital Tools Corner (DTC) provides affordable, reliable access to premium AI and academic subscription tools for students, researchers, and professionals worldwide.',
    statCustomers:   '2,000+',
    statActivations: '10,000+',
    statTools:       '100+',
    statCountries:   '50+',
    email:           'dtc@dtc1.shop',
    whatsapp:        '+86 19738122807',
    wechatQrUrl:     '',
    aboutTitle:      'Premium AI Access, Made Affordable',
    aboutDesc:       'DTC is a trusted platform dedicated to providing affordable and reliable access to premium AI and academic subscription tools for students, researchers, and professionals worldwide.',
  };

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      const d = await api(`/admin/landing-content?adminKey=${encodeURIComponent(Store.adminKey)}`);
      const content = (d && !d.error) ? { ...DEFAULTS, ...d } : { ...DEFAULTS };
      _populate(content);
    } catch(e) {
      _populate(DEFAULTS);
    }
  };

  const _populate = (c) => {
    _set('lp-hero-title',       c.heroTitle);
    _set('lp-hero-subtitle',    c.heroSubtitle);
    _set('lp-stat-customers',   c.statCustomers);
    _set('lp-stat-activations', c.statActivations);
    _set('lp-stat-tools',       c.statTools);
    _set('lp-stat-countries',   c.statCountries);
    _set('lp-email',            c.email);
    _set('lp-whatsapp',         c.whatsapp);
    _set('lp-wechat-qr',        c.wechatQrUrl);
    _set('lp-about-title',      c.aboutTitle);
    _set('lp-about-desc',       c.aboutDesc);
    _updatePreview(c);
  };

  const _set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const save = async () => {
    const content = {
      heroTitle:       _get('lp-hero-title'),
      heroSubtitle:    _get('lp-hero-subtitle'),
      statCustomers:   _get('lp-stat-customers'),
      statActivations: _get('lp-stat-activations'),
      statTools:       _get('lp-stat-tools'),
      statCountries:   _get('lp-stat-countries'),
      email:           _get('lp-email'),
      whatsapp:        _get('lp-whatsapp'),
      wechatQrUrl:     _get('lp-wechat-qr'),
      aboutTitle:      _get('lp-about-title'),
      aboutDesc:       _get('lp-about-desc'),
    };

    const d = await api('/admin/landing-content', { adminKey: Store.adminKey, content });
    showMsg('lp-ok', 'lp-err', d && d.success,
      d && d.success ? '✓ Landing page saved. Changes are now live.' : (d && d.error) || 'Failed to save.');

    if (d && d.success) _updatePreview(content);
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = () => {
    if (!confirm('Reset all landing page content to defaults?')) return;
    _populate(DEFAULTS);
  };

  const _get = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  // ── Live Preview ────────────────────────────────────────────────────────────
  const _updatePreview = (c) => {
    const p = document.getElementById('lp-preview');
    if (!p) return;
    p.innerHTML = `
      <div style="background:linear-gradient(135deg,#fff 0%,#f0f4ff 60%,#e8efff 100%);border-radius:12px;padding:2rem;position:relative;overflow:hidden;">
        <div style="display:inline-flex;align-items:center;gap:.4rem;background:#eff6ff;border:1px solid #dbeafe;border-radius:99px;padding:.22rem .8rem;font-size:.7rem;font-weight:700;color:#2563eb;margin-bottom:1rem;">
          <span style="width:6px;height:6px;border-radius:50%;background:#2563eb;display:inline-block"></span>
          Trusted by ${esc(c.statCustomers)} Active Customers
        </div>
        <h2 style="font-size:1.5rem;font-weight:900;color:#1e293b;line-height:1.2;letter-spacing:-.03em;margin-bottom:.6rem">${c.heroTitle || 'Your Gateway to AI Excellence'}</h2>
        <p style="font-size:.82rem;color:#64748b;line-height:1.65;margin-bottom:1.2rem;max-width:460px">${esc(c.heroSubtitle)}</p>
        <div style="display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:1.5rem">
          <span style="background:#2563eb;color:#fff;padding:.5rem 1.2rem;border-radius:8px;font-size:.8rem;font-weight:700">⚡ Get Access Now</span>
          <span style="background:#fff;border:1.5px solid #e2e8f0;color:#1e293b;padding:.5rem 1.2rem;border-radius:8px;font-size:.8rem;font-weight:600">Browse 100+ Tools →</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;background:#2563eb;border-radius:10px;padding:1.2rem">
          <div style="text-align:center"><div style="font-size:1.3rem;font-weight:900;color:#fff;font-family:monospace">${esc(c.statCustomers)}</div><div style="font-size:.65rem;color:rgba(255,255,255,.7);margin-top:.2rem">Active Customers</div></div>
          <div style="text-align:center"><div style="font-size:1.3rem;font-weight:900;color:#fff;font-family:monospace">${esc(c.statActivations)}</div><div style="font-size:.65rem;color:rgba(255,255,255,.7);margin-top:.2rem">Accounts Activated</div></div>
          <div style="text-align:center"><div style="font-size:1.3rem;font-weight:900;color:#fff;font-family:monospace">${esc(c.statTools)}</div><div style="font-size:.65rem;color:rgba(255,255,255,.7);margin-top:.2rem">AI Tools</div></div>
          <div style="text-align:center"><div style="font-size:1.3rem;font-weight:900;color:#fff;font-family:monospace">${esc(c.statCountries)}</div><div style="font-size:.65rem;color:rgba(255,255,255,.7);margin-top:.2rem">Countries</div></div>
        </div>
      </div>
      <div style="margin-top:.9rem;display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem">
        <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:.9rem;text-align:center">
          <div style="font-size:1.3rem;margin-bottom:.4rem">📧</div>
          <div style="font-size:.75rem;font-weight:700;color:#1e293b;margin-bottom:.3rem">Email</div>
          <div style="font-size:.7rem;color:#2563eb;font-family:monospace">${esc(c.email)}</div>
        </div>
        <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:.9rem;text-align:center">
          <div style="font-size:1.3rem;margin-bottom:.4rem">💬</div>
          <div style="font-size:.75rem;font-weight:700;color:#1e293b;margin-bottom:.3rem">WeChat</div>
          <div style="font-size:.68rem;color:#64748b">${c.wechatQrUrl ? 'QR set ✓' : 'No QR uploaded'}</div>
        </div>
        <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:.9rem;text-align:center">
          <div style="font-size:1.3rem;margin-bottom:.4rem">📱</div>
          <div style="font-size:.75rem;font-weight:700;color:#1e293b;margin-bottom:.3rem">WhatsApp</div>
          <div style="font-size:.7rem;color:#2563eb;font-family:monospace">${esc(c.whatsapp)}</div>
        </div>
      </div>
    `;
  };

  // ── Upload WeChat QR image (base64 stored) ──────────────────────────────────
  const handleQrUpload = (input) => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 500 * 1024) {
      alert('Image must be under 500 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const urlField = document.getElementById('lp-wechat-qr');
      if (urlField) urlField.value = e.target.result;
      const preview = document.getElementById('lp-qr-preview');
      if (preview) {
        preview.innerHTML = `<img src="${e.target.result}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"/>`;
      }
    };
    reader.readAsDataURL(file);
  };

  const openLandingPage = () => {
    window.open('/', '_blank');
  };

  return { load, save, reset, handleQrUpload, openLandingPage };
})();
