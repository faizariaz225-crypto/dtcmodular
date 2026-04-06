const express    = require('express');
const { v4: uuidv4 } = require('uuid');
const fs         = require('fs');
const path       = require('path');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY         = process.env.ADMIN_KEY || 'dtc2024';
const DATA_DIR          = path.join(__dirname, 'data');
const TOKENS_FILE       = path.join(DATA_DIR, 'tokens.json');
const SESSIONS_FILE     = path.join(DATA_DIR, 'sessions.txt');
const EMAIL_CONFIG      = path.join(DATA_DIR, 'emailConfig.json');
const EMAIL_LOG         = path.join(DATA_DIR, 'emailLog.json');
const INSTRUCTIONS_FILE = path.join(DATA_DIR, 'instructions.json');
const NOTIFY_FILE       = path.join(DATA_DIR, 'notifications.json');
const PRODUCTS_FILE     = path.join(DATA_DIR, 'products.json');

const LINK_EXPIRY_MS = 6 * 30 * 24 * 60 * 60 * 1000;

if (!fs.existsSync(DATA_DIR))       fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(TOKENS_FILE))    fs.writeFileSync(TOKENS_FILE,  JSON.stringify({}));
if (!fs.existsSync(SESSIONS_FILE))  fs.writeFileSync(SESSIONS_FILE, '');
if (!fs.existsSync(EMAIL_CONFIG))   fs.writeFileSync(EMAIL_CONFIG,  JSON.stringify({}));
if (!fs.existsSync(EMAIL_LOG))      fs.writeFileSync(EMAIL_LOG,     JSON.stringify([]));
if (!fs.existsSync(NOTIFY_FILE))    fs.writeFileSync(NOTIFY_FILE,   JSON.stringify({ enabled: false, message: '', type: 'info' }, null, 2));

// ── Default products ───────────────────────────────────────────────────────────
if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify({
    products: [
      {
        id: 'claude-pro',
        name: 'Claude Pro',
        description: 'Access to Claude Opus, extended usage limits, and priority service.',
        type: 'session',           // 'session' = customer submits org ID / session data
        credentialsMode: false,    // false = ask customer for their details
        loginDetails: '',          // used when credentialsMode = true
        packages: [
          { label: 'Claude Pro — 1 Month',  price: 15, durationDays: 30  },
          { label: 'Claude Pro — 3 Months', price: 40, durationDays: 90  },
          { label: 'Claude Pro — 6 Months', price: 75, durationDays: 180 },
          { label: 'Claude Pro — 1 Year',   price: 140, durationDays: 365 },
        ],
        color: '#2563eb',
        active: true,
      },
      {
        id: 'chatgpt-plus',
        name: 'ChatGPT Plus',
        description: 'Access to GPT-4o, DALL·E image generation, and all premium features.',
        type: 'chatgpt',
        credentialsMode: false,
        loginDetails: '',
        packages: [
          { label: 'ChatGPT Plus — 1 Month',  price: 20, durationDays: 30  },
          { label: 'ChatGPT Plus — 3 Months', price: 55, durationDays: 90  },
          { label: 'ChatGPT Plus — 6 Months', price: 100, durationDays: 180 },
          { label: 'ChatGPT Plus — 1 Year',   price: 190, durationDays: 365 },
        ],
        color: '#10a37f',
        active: true,
      }
    ]
  }, null, 2));
}

if (!fs.existsSync(INSTRUCTIONS_FILE)) {
  fs.writeFileSync(INSTRUCTIONS_FILE, JSON.stringify({
    sets: {
      'default-claude': {
        id: 'default-claude', name: 'Claude Pro — Default',
        processingText: 'Your details have been received and are being reviewed by the DTC team. This page will update automatically once your Claude Pro account is activated.',
        approvedText: 'Your Claude Pro package is now live and ready to use.',
        approvedSteps: ['Open claude.ai and sign in.','Click your profile icon → Settings → Billing.','Your plan should now show as Claude Pro.'],
        postApprovedText: 'Your Claude Pro subscription is active. Here is what to do next.',
        postApprovedSteps: ['Try Claude Opus for complex tasks.','Use Projects to organise conversations.','Contact DTC on WeChat if you need help.']
      },
      'chatgpt-plus': {
        id: 'chatgpt-plus', name: 'ChatGPT Plus — Default',
        processingText: 'Your ChatGPT Plus session details have been received and are being reviewed.',
        approvedText: 'Your ChatGPT Plus package has been successfully activated.',
        approvedSteps: ['Open ChatGPT at chatgpt.com.','You should see a Plus badge next to your profile.','GPT-4o and image generation are now available.'],
        postApprovedText: 'Welcome to ChatGPT Plus! Here is how to get started.',
        postApprovedSteps: ['Use GPT-4o for faster smarter conversations.','Generate images with DALL·E inside the chat.','Contact DTC on WeChat if you need help.']
      }
    }
  }, null, 2));
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── File helpers ───────────────────────────────────────────────────────────────
const loadTokens      = () => JSON.parse(fs.readFileSync(TOKENS_FILE,  'utf8'));
const saveTokens      = t  => fs.writeFileSync(TOKENS_FILE,  JSON.stringify(t, null, 2));
const loadEmailCfg    = () => JSON.parse(fs.readFileSync(EMAIL_CONFIG, 'utf8'));
const saveEmailCfg    = c  => fs.writeFileSync(EMAIL_CONFIG, JSON.stringify(c, null, 2));
const loadEmailLog    = () => JSON.parse(fs.readFileSync(EMAIL_LOG,    'utf8'));
const saveEmailLog    = l  => fs.writeFileSync(EMAIL_LOG,    JSON.stringify(l, null, 2));
const loadInstructions= () => JSON.parse(fs.readFileSync(INSTRUCTIONS_FILE, 'utf8'));
const saveInstructions= i  => fs.writeFileSync(INSTRUCTIONS_FILE, JSON.stringify(i, null, 2));
const loadNotify      = () => JSON.parse(fs.readFileSync(NOTIFY_FILE,  'utf8'));
const saveNotify      = n  => fs.writeFileSync(NOTIFY_FILE,  JSON.stringify(n, null, 2));
const loadProducts    = () => JSON.parse(fs.readFileSync(PRODUCTS_FILE,'utf8'));
const saveProducts    = p  => fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(p, null, 2));
const isAdmin         = k  => k === ADMIN_KEY;

// ── Duration lookup — checks product packages first, falls back to label parsing ──
function getDurationDays(productId, packageLabel) {
  try {
    const { products } = loadProducts();
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const pkg = prod.packages.find(pk => pk.label === packageLabel);
      if (pkg) return pkg.durationDays;
    }
  } catch {}
  // Fallback to label parsing
  const p = (packageLabel || '').toLowerCase();
  if (p.includes('1 year') || p.includes('12 month')) return 365;
  if (p.includes('6 month')) return 180;
  if (p.includes('3 month')) return 90;
  return 30;
}

// ── Get price for a package ────────────────────────────────────────────────────
function getPrice(productId, packageLabel) {
  try {
    const { products } = loadProducts();
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const pkg = prod.packages.find(pk => pk.label === packageLabel);
      if (pkg) return pkg.price || 0;
    }
  } catch {}
  return 0;
}

// ── Revenue helpers ────────────────────────────────────────────────────────────
function calcRevenue(tokens) {
  const byProduct = {};
  let total = 0;
  for (const t of Object.values(tokens)) {
    if (!t.approved || !t.price) continue;
    const pid = t.productId || 'unknown';
    byProduct[pid] = (byProduct[pid] || 0) + t.price;
    total += t.price;
  }
  return { total, byProduct };
}

// ── Email ──────────────────────────────────────────────────────────────────────
function buildTransporter() {
  const cfg = loadEmailCfg();
  if (!cfg.host || !cfg.user || !cfg.pass) return null;
  const port = parseInt(cfg.port) || 587;
  return nodemailer.createTransport({ host: cfg.host, port, secure: port === 465, auth: { user: cfg.user, pass: cfg.pass }, connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 15000, tls: { rejectUnauthorized: false } });
}
async function sendEmail({ to, subject, html, type, token }) {
  const cfg = loadEmailCfg();
  if (!cfg.host || !cfg.user || !cfg.pass) return { ok: false, error: 'Email not configured.' };
  try {
    const tr = buildTransporter();
    await tr.verify();
    await tr.sendMail({ from: `"${cfg.fromName || 'DTC'}" <${cfg.user}>`, to, subject, html });
    const log = loadEmailLog(); log.push({ sentAt: new Date().toISOString(), to, subject, type, token: token || null }); saveEmailLog(log);
    return { ok: true };
  } catch (err) {
    let msg = err.message || 'Unknown error';
    if (msg.includes('ECONNREFUSED')) msg = `Connection refused on ${cfg.host}:${cfg.port}.`;
    if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) msg = 'Connection timed out. Use Gmail App Password on port 587.';
    if (msg.includes('ENOTFOUND')) msg = `Host "${cfg.host}" not found.`;
    if (msg.includes('535') || msg.includes('auth')) msg = 'Auth failed. For Gmail use an App Password.';
    return { ok: false, error: msg };
  }
}
const baseEmail = body => `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><div style="background:#2563eb;padding:24px 32px"><div style="font-size:20px;font-weight:700;color:#fff">DTC</div><div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">Digital Tools Corner</div></div><div style="padding:32px">${body}</div><div style="padding:20px 32px;background:#f8faff;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">DTC · Automated notification.</div></div>`;
const reminderTemplate = ({ customerName, packageType, expiryDate, daysLeft }) => baseEmail(`<h2 style="color:#1e293b;margin:0 0 16px">Your subscription expires in ${daysLeft} day${daysLeft!==1?'s':''}</h2><p style="color:#64748b">Hi ${customerName}, your <strong>${packageType}</strong> subscription expires soon. Contact us on WeChat to renew.</p><div style="background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-top:16px"><div style="font-size:13px;color:#64748b">Expiry: <strong style="color:#d97706">${expiryDate}</strong> · ${daysLeft} days left</div></div>`);
const expiredTemplate  = ({ customerName, packageType }) => baseEmail(`<h2 style="color:#1e293b;margin:0 0 16px">Your subscription has ended</h2><p style="color:#64748b">Hi ${customerName}, your <strong>${packageType}</strong> has expired. Contact us on WeChat or at <a href="mailto:dtc@dtc1.shop">dtc@dtc1.shop</a> to renew.</p>`);

async function checkSubscriptionEmails() {
  const cfg = loadEmailCfg(); if (!cfg.host || !cfg.user || !cfg.pass) return;
  const tokens = loadTokens(); const now = new Date(); let changed = false;
  for (const [token, t] of Object.entries(tokens)) {
    if (!t.approved || !t.subscriptionExpiresAt || !t.email) continue;
    const expiry = new Date(t.subscriptionExpiresAt);
    const daysLeft = Math.ceil((expiry - now) / (1000*60*60*24));
    if (daysLeft === 5 && !t.reminder5Sent) { const r = await sendEmail({ to: t.email, subject: `Subscription expires in 5 days — DTC`, html: reminderTemplate({ customerName: t.customerName, packageType: t.packageType, expiryDate: expiry.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}), daysLeft: 5 }), type: 'reminder_5d', token }); if (r.ok) { tokens[token].reminder5Sent = true; changed = true; } }
    if (daysLeft <= 0 && !t.expiredEmailSent) { const r = await sendEmail({ to: t.email, subject: `Subscription expired — DTC`, html: expiredTemplate({ customerName: t.customerName, packageType: t.packageType }), type: 'expired', token }); if (r.ok) { tokens[token].expiredEmailSent = true; changed = true; } }
  }
  if (changed) saveTokens(tokens);
}
setInterval(checkSubscriptionEmails, 60*60*1000);
setTimeout(checkSubscriptionEmails, 30000);

// ── Helper: get instruction sets for a token ───────────────────────────────────
function getInstrSets(t) {
  const instr = loadInstructions();
  const pre   = instr.sets[t.instructionSetId]     || instr.sets['default-claude'] || {};
  const post  = instr.sets[t.postInstructionSetId] || pre;
  return { pre, post };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Products CRUD ──────────────────────────────────────────────────────────────
app.get('/admin/products', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadProducts());
});
app.post('/admin/products/save', (req, res) => {
  const { adminKey, product } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!product || !product.id || !product.name) return res.status(400).json({ error: 'Invalid product.' });
  const data = loadProducts();
  const idx = data.products.findIndex(p => p.id === product.id);
  if (idx >= 0) data.products[idx] = product; else data.products.push(product);
  saveProducts(data);
  res.json({ success: true });
});
app.post('/admin/products/delete', (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const data = loadProducts();
  data.products = data.products.filter(p => p.id !== id);
  saveProducts(data);
  res.json({ success: true });
});

// ── Revenue ────────────────────────────────────────────────────────────────────
app.get('/admin/revenue', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens();
  res.json(calcRevenue(tokens));
});

// ── Generate link ──────────────────────────────────────────────────────────────
app.post('/admin/generate', (req, res) => {
  const { adminKey, customerName, productId, packageLabel, price, instructionSetId, postInstructionSetId } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!customerName)  return res.status(400).json({ error: 'Customer name is required.' });
  if (!productId)     return res.status(400).json({ error: 'Product is required.' });
  if (!packageLabel)  return res.status(400).json({ error: 'Package is required.' });
  if (!price && price !== 0) return res.status(400).json({ error: 'Price is required. Please set a price before generating a link.' });
  if (parseFloat(price) <= 0) return res.status(400).json({ error: 'Price must be greater than 0. Cannot generate a free link.' });

  // Look up product
  const { products } = loadProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(400).json({ error: 'Product not found.' });

  const token     = uuidv4();
  const tokens    = loadTokens();
  const expiresAt = new Date(Date.now() + LINK_EXPIRY_MS).toISOString();
  const durationDays = getDurationDays(productId, packageLabel);
  const instrId   = instructionSetId     || (product.type === 'chatgpt' ? 'chatgpt-plus' : 'default-claude');
  const postId    = postInstructionSetId || instrId;

  tokens[token] = {
    customerName,
    productId,
    productName:      product.name,
    packageType:      packageLabel,
    price:            parseFloat(price),
    currency:         'USD',
    product:          product.type,           // kept for backward-compat
    credentialsMode:  product.credentialsMode || false,
    loginDetails:     product.loginDetails    || '',
    instructionSetId: instrId,
    postInstructionSetId: postId,
    createdAt:    new Date().toISOString(),
    expiresAt,
    durationDays,
    used: false, approved: false, declined: false, deactivated: false,
  };
  saveTokens(tokens);
  const link = `${req.protocol}://${req.get('host')}/submit?token=${token}`;
  res.json({ link, token, expiresAt, price: parseFloat(price) });
});

// ── Deactivate / Reactivate ────────────────────────────────────────────────────
app.post('/admin/deactivate', (req, res) => {
  const { adminKey, token } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  tokens[token].deactivated = true; tokens[token].deactivatedAt = new Date().toISOString(); saveTokens(tokens); res.json({ success: true });
});
app.post('/admin/reactivate', (req, res) => {
  const { adminKey, token } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  tokens[token].deactivated = false; delete tokens[token].deactivatedAt; saveTokens(tokens); res.json({ success: true });
});

// ── Validate token ─────────────────────────────────────────────────────────────
app.get('/api/validate-token', (req, res) => {
  const { token } = req.query;
  const tokens = loadTokens();
  if (!token || !tokens[token]) return res.status(404).json({ valid: false, error: 'This activation link is invalid. Please contact support.' });
  const t = tokens[token];
  const entry = { at: new Date().toISOString(), ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown', userAgent: req.headers['user-agent'] || 'unknown' };
  if (!t.accessLog) t.accessLog = [];
  t.accessLog.push(entry); t.firstAccessedAt = t.firstAccessedAt || entry.at; t.lastAccessedAt = entry.at; t.accessCount = (t.accessCount || 0) + 1;
  saveTokens(tokens);

  if (t.deactivated) return res.status(410).json({ valid: false, error: 'This link has been deactivated. Please contact support.' });
  if (t.declined)    return res.json({ valid: true, declined: true, declineReason: t.declineReason || '', customerName: t.customerName, packageType: t.packageType, product: t.product || 'claude' });

  const notify = loadNotify();
  const notifPayload = notify.enabled ? { message: notify.message, type: notify.type } : null;

  if (t.used) {
    const { pre, post } = getInstrSets(t);
    return res.json({ valid: true, submitted: true, approved: t.approved || false, approvedAt: t.approvedAt || null, customerName: t.customerName, packageType: t.packageType, product: t.product || 'claude', credentialsMode: t.credentialsMode || false, loginDetails: t.approved ? (t.loginDetails || '') : '', orgId: t.orgId || '', sessionData: t.sessionData || '', wechat: t.wechat || '', email: t.email || '', subscriptionExpiresAt: t.subscriptionExpiresAt || null, durationDays: t.durationDays || 30, processingText: pre.processingText, approvedText: pre.approvedText, approvedSteps: pre.approvedSteps, postApprovedText: post.postApprovedText, postApprovedSteps: post.postApprovedSteps, notification: notifPayload });
  }
  if (t.expiresAt && new Date() > new Date(t.expiresAt)) return res.status(410).json({ valid: false, error: 'This activation link has expired. Please contact support for a new link.' });

  const { pre, post } = getInstrSets(t);
  res.json({ valid: true, submitted: false, customerName: t.customerName, packageType: t.packageType, product: t.product || 'claude', credentialsMode: t.credentialsMode || false, processingText: pre.processingText, approvedText: pre.approvedText, approvedSteps: pre.approvedSteps, postApprovedText: post.postApprovedText, postApprovedSteps: post.postApprovedSteps, notification: notifPayload });
});

// ── Submit ─────────────────────────────────────────────────────────────────────
app.post('/api/submit', (req, res) => {
  const { token, orgId, sessionData, wechat, email } = req.body;
  const tokens = loadTokens();
  if (!token || !tokens[token]) return res.status(404).json({ success: false, error: 'Invalid link.' });
  const t = tokens[token];
  if (t.deactivated) return res.status(410).json({ success: false, error: 'This link has been deactivated.' });
  if (t.declined)    return res.status(410).json({ success: false, error: 'This request has been declined.' });
  if (t.used)        return res.status(410).json({ success: false, error: 'Details already submitted.' });
  if (t.expiresAt && new Date() > new Date(t.expiresAt)) return res.status(410).json({ success: false, error: 'This link has expired.' });

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const errors = {};

  // Credentials-mode products: only ask for email + wechat
  if (!t.credentialsMode) {
    if (t.product === 'chatgpt') {
      if (!sessionData || !sessionData.trim()) { errors.sessionData = 'Session data is required.'; }
      else {
        try {
          const parsed = JSON.parse(sessionData.trim());
          const acct = parsed.account || parsed;
          const planType  = acct.planType  || parsed.planType;
          const structure = acct.structure || parsed.structure;
          if (!planType) errors.sessionData = 'Could not find planType. Please copy the full JSON from the session URL.';
          else if (planType !== 'free') errors.sessionData = `⚠ Package already active (planType: "${planType}"). Only free accounts can be upgraded.`;
          else if (structure !== 'personal') errors.sessionData = `⚠ Team account detected (structure: "${structure}"). Switch to personal profile first.`;
        } catch { errors.sessionData = 'Invalid JSON. Please copy the complete content from the session URL.'; }
      }
    } else {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!orgId || !UUID_REGEX.test(orgId.trim())) errors.orgId = 'Invalid Organization ID format.';
    }
  }

  if (!wechat || !wechat.trim())                  errors.wechat = 'WeChat ID is required.';
  if (!email  || !EMAIL_REGEX.test(email.trim()))  errors.email  = 'Please enter a valid email address.';
  if (Object.keys(errors).length) return res.status(400).json({ success: false, errors });

  const timestamp = new Date().toISOString();
  let lines = ['══════════════════════════════════════════════════════', `Submitted At : ${timestamp}`, `Customer     : ${t.customerName}`, `Package      : ${t.packageType}`, `Price        : $${t.price || 0}`];
  if (t.credentialsMode) { lines.push('── Credentials provided by DTC ────────────────────────'); }
  else if (t.product === 'chatgpt') { lines.push('── Session Data ───────────────────────────────────────', sessionData.trim()); }
  else { lines.push(`Org ID       : ${orgId ? orgId.trim() : '—'}`); }
  lines.push(`WeChat       : ${wechat.trim()}`, `Email        : ${email.trim()}`, '══════════════════════════════════════════════════════', '');
  fs.appendFileSync(SESSIONS_FILE, lines.join('\n'));

  tokens[token].used = true; tokens[token].submittedAt = timestamp;
  tokens[token].wechat = wechat.trim(); tokens[token].email = email.trim();
  if (!t.credentialsMode) {
    if (t.product === 'chatgpt') tokens[token].sessionData = sessionData.trim();
    else tokens[token].orgId = orgId ? orgId.trim() : '';
  }
  saveTokens(tokens);
  res.json({ success: true });
});

// ── Poll status ────────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const { token } = req.query;
  const tokens = loadTokens();
  if (!token || !tokens[token]) return res.status(404).json({ error: 'Invalid.' });
  const t = tokens[token];
  const { pre, post } = getInstrSets(t);
  const notify = loadNotify();
  res.json({
    status: t.declined ? 'declined' : t.approved ? 'activated' : t.used ? 'processing' : 'pending',
    packageType: t.packageType, customerName: t.customerName, product: t.product || 'claude',
    credentialsMode: t.credentialsMode || false, loginDetails: t.approved ? (t.loginDetails || '') : '',
    approvedAt: t.approvedAt || null, declineReason: t.declineReason || '',
    orgId: t.orgId || '', sessionData: t.sessionData || '', wechat: t.wechat || '', email: t.email || '',
    subscriptionExpiresAt: t.subscriptionExpiresAt || null, durationDays: t.durationDays || 30,
    processingText: pre.processingText, approvedText: pre.approvedText, approvedSteps: pre.approvedSteps,
    postApprovedText: post.postApprovedText, postApprovedSteps: post.postApprovedSteps,
    notification: notify.enabled ? { message: notify.message, type: notify.type } : null,
  });
});

// ── Approve ────────────────────────────────────────────────────────────────────
app.post('/admin/approve', (req, res) => {
  const { adminKey, token } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  if (tokens[token].approved) return res.json({ success: true });
  const days = getDurationDays(tokens[token].productId, tokens[token].packageType);
  tokens[token].approved = true; tokens[token].declined = false;
  tokens[token].approvedAt = new Date().toISOString();
  tokens[token].subscriptionExpiresAt = new Date(Date.now() + days*24*60*60*1000).toISOString();
  tokens[token].subscriptionDays = days;
  saveTokens(tokens); res.json({ success: true });
});

// ── Decline ────────────────────────────────────────────────────────────────────
app.post('/admin/decline', (req, res) => {
  const { adminKey, token, reason } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  tokens[token].declined = true; tokens[token].approved = false;
  tokens[token].declinedAt = new Date().toISOString(); tokens[token].declineReason = reason || 'The details provided could not be verified.';
  saveTokens(tokens); res.json({ success: true });
});

// ── Sessions data ──────────────────────────────────────────────────────────────
app.post('/admin/sessions-data', (req, res) => {
  const { adminKey } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens();
  res.json({ tokens, emailLog: loadEmailLog(), revenue: calcRevenue(tokens) });
});

// ── Instructions ───────────────────────────────────────────────────────────────
app.get('/admin/instructions', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadInstructions());
});
app.post('/admin/instructions/save', (req, res) => {
  const { adminKey, set } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!set || !set.id || !set.name) return res.status(400).json({ error: 'Invalid.' });
  const data = loadInstructions(); data.sets[set.id] = set; saveInstructions(data); res.json({ success: true });
});
app.post('/admin/instructions/delete', (req, res) => {
  const { adminKey, id } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const data = loadInstructions(); delete data.sets[id]; saveInstructions(data); res.json({ success: true });
});

// ── Email config ───────────────────────────────────────────────────────────────
app.post('/admin/email-config', (req, res) => {
  const { adminKey, config } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  saveEmailCfg(config); res.json({ success: true });
});
app.get('/admin/email-config', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const cfg = loadEmailCfg(); res.json({ ...cfg, pass: cfg.pass ? '••••••••' : '' });
});
app.post('/admin/test-email', async (req, res) => {
  const { adminKey, to } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(await sendEmail({ to, subject: 'DTC — Test Email', html: baseEmail('<h2>✓ Email is working!</h2>'), type: 'test' }));
});
app.post('/admin/send-reminder', async (req, res) => {
  const { adminKey, token, type } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); const t = tokens[token];
  if (!t || !t.email) return res.status(400).json({ error: 'No email on record.' });
  const expiry = t.subscriptionExpiresAt ? new Date(t.subscriptionExpiresAt) : null;
  const daysLeft = expiry ? Math.ceil((expiry - new Date())/(1000*60*60*24)) : 0;
  const expiryStr = expiry ? expiry.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '—';
  const html = type==='expired' ? expiredTemplate({ customerName:t.customerName, packageType:t.packageType }) : reminderTemplate({ customerName:t.customerName, packageType:t.packageType, expiryDate:expiryStr, daysLeft });
  res.json(await sendEmail({ to: t.email, subject: type==='expired' ? 'Subscription expired — DTC' : `Reminder: ${daysLeft} days left — DTC`, html, type:'manual_'+type, token }));
});

// ── Notifications ──────────────────────────────────────────────────────────────
app.get('/admin/notification', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadNotify());
});
app.post('/admin/notification', (req, res) => {
  const { adminKey, enabled, message, type } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  saveNotify({ enabled: !!enabled, message: message || '', type: type || 'info' }); res.json({ success: true });
});

// ── Pages ──────────────────────────────────────────────────────────────────────
app.get('/submit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'form.html')));
app.get('/admin',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => { console.log(`\n✅  DTC — Digital Tools Corner\n🌐  http://localhost:${PORT}\n`); });
