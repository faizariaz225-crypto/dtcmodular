/* ─── DTC Admin — Settings Module (currency, activation email) ───────────── */
'use strict';

const Settings = (() => {
  const CURRENCIES = [
    { code:'USD', symbol:'$',  name:'US Dollar'       },
    { code:'CNY', symbol:'¥',  name:'Chinese Yuan'    },
    { code:'EUR', symbol:'€',  name:'Euro'            },
    { code:'GBP', symbol:'£',  name:'British Pound'   },
    { code:'AED', symbol:'د.إ',name:'UAE Dirham'      },
    { code:'SAR', symbol:'﷼',  name:'Saudi Riyal'     },
    { code:'PKR', symbol:'₨',  name:'Pakistani Rupee' },
    { code:'INR', symbol:'₹',  name:'Indian Rupee'    },
    { code:'MYR', symbol:'RM', name:'Malaysian Ringgit'},
    { code:'SGD', symbol:'S$', name:'Singapore Dollar' },
    { code:'TRY', symbol:'₺',  name:'Turkish Lira'    },
    { code:'CAD', symbol:'C$', name:'Canadian Dollar'  },
    { code:'AUD', symbol:'A$', name:'Australian Dollar'},
  ];

  const load = async () => {
    const d = await api(`/admin/settings?adminKey=${encodeURIComponent(Store.adminKey)}`);
    if (!d || d.error) return;
    Store.setSettings(d);
    _renderCurrencyDropdown(d.currency);
    _renderActivationTemplateDropdown(d.activationEmailTemplateId);
    _updateCurrencyPreview(d);
  };

  const _renderCurrencyDropdown = (currentCode) => {
    const sel = document.getElementById('currency-select');
    if (!sel) return;
    sel.innerHTML = CURRENCIES.map(c =>
      `<option value="${c.code}" ${c.code === currentCode ? 'selected' : ''}>${c.symbol} ${c.name} (${c.code})</option>`
    ).join('');
  };

  const _renderActivationTemplateDropdown = (currentId) => {
    const sel = document.getElementById('activation-template-select');
    if (!sel) return;
    const templates = Store.templates || [];
    sel.innerHTML = '<option value="">— No auto email —</option>' +
      templates.map(t =>
        `<option value="${t.id}" ${t.id === currentId ? 'selected' : ''}>${esc(t.name)}</option>`
      ).join('');
  };

  const _updateCurrencyPreview = (settings) => {
    const el = document.getElementById('currency-preview');
    if (!el) return;
    const c = CURRENCIES.find(x => x.code === (settings.currency || 'USD')) || CURRENCIES[0];
    el.textContent = `Example: ${c.symbol}29.99`;
  };

  const save = async () => {
    const currCode = document.getElementById('currency-select')?.value || 'USD';
    const tmplId   = document.getElementById('activation-template-select')?.value || '';
    const c = CURRENCIES.find(x => x.code === currCode) || CURRENCIES[0];
    const settings = {
      currency:                   c.code,
      currencySymbol:             c.symbol,
      currencyName:               c.name,
      activationEmailTemplateId:  tmplId,
    };
    const d = await api('/admin/settings', { adminKey: Store.adminKey, settings });
    showMsg('settings-ok', 'settings-err', d && d.success,
      d && d.success ? '✓ Settings saved.' : 'Failed to save.');
    if (d && d.success) {
      Store.setSettings({ ...(Store.settings || {}), ...settings });
      _updateCurrencyPreview(settings);
    }
  };

  // Populate template dropdown when templates are loaded
  const refreshTemplateDropdown = () => {
    const current = (Store.settings || {}).activationEmailTemplateId || '';
    _renderActivationTemplateDropdown(current);
  };

  return { load, save, refreshTemplateDropdown, CURRENCIES };
})();
