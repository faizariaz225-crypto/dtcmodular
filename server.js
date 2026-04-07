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
const TEMPLATES_FILE    = path.join(DATA_DIR, 'emailTemplates.json');
const SETTINGS_FILE     = path.join(DATA_DIR, 'settings.json');

const LINK_EXPIRY_MS = 6 * 30 * 24 * 60 * 60 * 1000;

if (!fs.existsSync(DATA_DIR))       fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(TOKENS_FILE))    fs.writeFileSync(TOKENS_FILE,  JSON.stringify({}));
if (!fs.existsSync(SESSIONS_FILE))  fs.writeFileSync(SESSIONS_FILE, '');
if (!fs.existsSync(EMAIL_CONFIG))   fs.writeFileSync(EMAIL_CONFIG,  JSON.stringify({}));
if (!fs.existsSync(EMAIL_LOG))      fs.writeFileSync(EMAIL_LOG,     JSON.stringify([]));
if (!fs.existsSync(SETTINGS_FILE))  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ currency: 'USD', currencySymbol: '$', currencyName: 'US Dollar', activationEmailTemplateId: 'welcome' }, null, 2));
if (!fs.existsSync(NOTIFY_FILE))    fs.writeFileSync(NOTIFY_FILE,   JSON.stringify({ enabled: false, message: '', type: 'info' }, null, 2));
if (!fs.existsSync(TEMPLATES_FILE)) fs.writeFileSync(TEMPLATES_FILE, JSON.stringify({"templates": [{"id": "welcome", "name": "✅ Welcome / Activation Confirmed", "subject": "Welcome to DTC — Your {{package}} is ready! 🎉", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#2563eb;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">⚡</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Activation Confirmed</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">{{package}}</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Welcome to DTC, {{name}}! 🎉</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Your <strong>{{package}}</strong> is now active and ready to use. Here is everything you need to get started.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#15803d;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Status</span>\n  <div style=\"font-size:14px;font-weight:600;color:#15803d;margin-top:3px;font-family:monospace\">✓ Active</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">What to do next</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Sign in to your account and check your plan status in Settings → Billing.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Start a conversation to confirm everything is working correctly.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Reach out on WeChat or email us if you need any help.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Thank you for choosing DTC. We are glad to have you.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326444Z"}, {"id": "renewal-30d", "name": "⏰ Renewal Reminder (30 days)", "subject": "Your {{package}} subscription expires in {{daysLeft}} days — DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#d97706;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">⏰</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Renewal Reminder</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Action needed</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Your subscription renews in {{daysLeft}} days</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Hi <strong>{{name}}</strong>, your <strong>{{package}}</strong> subscription will expire on <strong>{{expiry}}</strong>. Renew early to avoid any interruption.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#b45309;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Expiry Date</span>\n  <div style=\"font-size:14px;font-weight:600;color:#b45309;margin-top:3px;font-family:monospace\">{{expiry}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#b45309;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Days Remaining</span>\n  <div style=\"font-size:14px;font-weight:600;color:#b45309;margin-top:3px;font-family:monospace\">{{daysLeft}} days</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">💡</div>\n  <div style=\"font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:4px\">How to Renew</div>\n  <div style=\"font-size:13px;color:#475569;line-height:1.6\">Contact us on WeChat or reply to this email and we will set up your renewal link right away.</div>\n</td></tr></table><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Renewing takes less than 5 minutes. Contact us today to keep your access uninterrupted.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326466Z"}, {"id": "renewal-urgent", "name": "🚨 Urgent Renewal (3 days)", "subject": "Last chance to renew — expires {{expiry}} — DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#dc2626;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">🚨</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Urgent Reminder</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Expires {{expiry}}</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">🚨</div>\n  <div style=\"font-size:14px;font-weight:700;color:#dc2626;margin-bottom:4px\">Urgent — Your subscription expires in {{daysLeft}} days</div>\n  <div style=\"font-size:13px;color:#7f1d1d;line-height:1.6\">After expiry your access will be suspended. Contact us immediately to renew.</div>\n</td></tr></table><h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Last chance to renew, {{name}}</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Your <strong>{{package}}</strong> subscription expires on <strong>{{expiry}}</strong>. This is your final reminder before access is suspended.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#dc2626;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">⚠ Expires</span>\n  <div style=\"font-size:14px;font-weight:600;color:#dc2626;margin-top:3px;font-family:monospace\">{{expiry}}</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:14px;color:#475569;line-height:1.7\"><strong>To renew:</strong> Contact us on WeChat or reply to this email with your renewal request. We will generate your renewal link immediately.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326471Z"}, {"id": "expired", "name": "⏱ Subscription Expired", "subject": "Your {{package}} subscription has expired — DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#dc2626;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">⏱</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Subscription Expired</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">{{package}}</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Your subscription has ended</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Hi <strong>{{name}}</strong>, your <strong>{{package}}</strong> subscription has expired and your access has been suspended.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">⏱</div>\n  <div style=\"font-size:14px;font-weight:700;color:#dc2626;margin-bottom:4px\">Access Suspended</div>\n  <div style=\"font-size:13px;color:#475569;line-height:1.6\">Your {{package}} access ended on {{expiry}}. Renew now to restore access immediately.</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">Renew now — restore access in minutes</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#dc262620;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#dc2626;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Contact us on WeChat or reply to this email.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#dc262620;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#dc2626;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">We will send you a renewal activation link.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#dc262620;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#dc2626;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Complete the form and your access is restored immediately.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Questions? Reach us at <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#2563eb\">dtc@dtc1.shop</a> or on WeChat.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326475Z"}, {"id": "promo", "name": "🎁 Promotional / Special Offer", "subject": "Exclusive offer for DTC customers — {{name}} 🎁", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#15803d;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">🎁</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Special Offer</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Exclusive for you</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Exclusive offer for you, {{name}} 🎁</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">As a valued DTC customer, we are offering you an exclusive deal on your next subscription. Limited time only.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">🎉</div>\n  <div style=\"font-size:14px;font-weight:700;color:#15803d;margin-bottom:4px\">Special Offer — Limited Time</div>\n  <div style=\"font-size:13px;color:#475569;line-height:1.6\">Upgrade or renew your plan and get an exclusive deal available only to existing customers. Contact us on WeChat to claim it before it expires.</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">What is included</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#15803d20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#15803d;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Access to all premium AI tools at a discounted rate.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#15803d20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#15803d;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Priority processing — your link is activated same day.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#15803d20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#15803d;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Dedicated support via WeChat throughout your subscription.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">To claim your offer, simply contact us on WeChat and mention this email. Offer available while stocks last.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326478Z"}, {"id": "announcement", "name": "📢 General Announcement", "subject": "Important update from DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#6366f1;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">📢</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Announcement</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">DTC Update</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Important update from DTC</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Hi <strong>{{name}}</strong>, we have something important to share with all our customers.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 12px;font-size:15px;color:#1e293b;line-height:1.7\"><strong>[Write your announcement here]</strong></p><p style=\"margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7\">[Add more details about the update, what it means for customers, and any action required.]</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">If you have any questions about this update, reply to this email or contact us on WeChat. We are always happy to help.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326484Z"}, {"id": "payment-thanks", "name": "💳 Payment Received", "subject": "Payment received — thank you, {{name}}! — DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#0891b2;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">💳</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Payment Received</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Thank you</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Payment received — thank you, {{name}}!</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">We have received your payment and your activation link is being processed. You will hear from us shortly.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#b45309;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Status</span>\n  <div style=\"font-size:14px;font-weight:600;color:#b45309;margin-top:3px;font-family:monospace\">⏳ Processing — we will be in touch shortly</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">What happens next</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">We verify your payment and prepare your activation link. This usually takes a few hours.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">You receive your unique activation link via WeChat or email.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">You submit your account details and your subscription is activated.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Thank you for your trust in DTC. If you have any questions in the meantime, contact us on WeChat.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326488Z"}, {"id": "win-back", "name": "💙 Win Back / Re-engagement", "subject": "We miss you, {{name}} — come back to DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#2563eb;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">💙</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">We Miss You</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Come back to DTC</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">We miss you, {{name}}</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Your <strong>{{package}}</strong> subscription expired on <strong>{{expiry}}</strong>. We would love to have you back.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">💙</div>\n  <div style=\"font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:4px\">Special returning customer offer</div>\n  <div style=\"font-size:13px;color:#475569;line-height:1.6\">As a previous DTC customer, you qualify for our returning customer rate. Contact us on WeChat to find out more.</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">Why customers come back to DTC</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Same-day activation — your link is processed within hours.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Flexible packages — monthly, quarterly, or annual plans.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Dedicated WeChat support throughout your subscription.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Ready to get back on board? Contact us on WeChat and we will set everything up for you.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326494Z"}]}, null, 2));

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
const loadTemplates   = () => JSON.parse(fs.readFileSync(TEMPLATES_FILE,'utf8'));
const saveTemplates   = t  => fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(t, null, 2));
const loadSettings    = () => JSON.parse(fs.readFileSync(SETTINGS_FILE,'utf8'));
const saveSettings    = s  => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));

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

// ── Template variable replacement ─────────────────────────────────────────────
function applyTemplateVars(text, token) {
  const t = token || {};
  const expDate = t.subscriptionExpiresAt
    ? new Date(t.subscriptionExpiresAt).toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'})
    : '—';
  const daysLeft = t.subscriptionExpiresAt
    ? Math.ceil((new Date(t.subscriptionExpiresAt) - new Date()) / (1000*60*60*24))
    : 0;
  return text
    .replace(/{{name}}/g,     t.customerName || 'Customer')
    .replace(/{{package}}/g,  t.packageType  || '')
    .replace(/{{product}}/g,  t.productName  || t.productId || '')
    .replace(/{{email}}/g,    t.email        || '')
    .replace(/{{wechat}}/g,   t.wechat       || '')
    .replace(/{{expiry}}/g,   expDate)
    .replace(/{{daysLeft}}/g, String(daysLeft > 0 ? daysLeft : 0));
}

// ── Revenue helpers ────────────────────────────────────────────────────────────
function calcRevenue(tokens) {
  const byProduct  = {};
  const byReseller = {};
  let total        = 0;
  let resellerTotal= 0;
  let directTotal  = 0;
  for (const t of Object.values(tokens)) {
    if (!t.approved || !t.price) continue;
    const pid = t.productId || 'unknown';
    byProduct[pid] = (byProduct[pid] || 0) + t.price;
    total += t.price;
    if (t.resellerId) {
      const rid = t.resellerId;
      if (!byReseller[rid]) byReseller[rid] = { name: t.resellerName || rid, total: 0, count: 0 };
      byReseller[rid].total += t.price;
      byReseller[rid].count++;
      resellerTotal += t.price;
    } else {
      directTotal += t.price;
    }
  }
  return { total, byProduct, byReseller, resellerTotal, directTotal };
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
  const { adminKey, customerName, productId, packageLabel, price, instructionSetId, postInstructionSetId, resellerId, resellerName } = req.body;
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
    currency:         loadSettings().currency || 'USD',
    currencySymbol:   loadSettings().currencySymbol || '$',
    resellerId:       resellerId   || null,
    resellerName:     resellerName || null,
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
    return res.json({ valid: true, submitted: true, approved: t.approved || false, approvedAt: t.approvedAt || null, customerName: t.customerName, packageType: t.packageType, product: t.product || 'claude', credentialsMode: t.credentialsMode || false, loginDetails: t.approved ? (t.loginDetails || '') : '', accessLink: t.approved ? (t.accessLink || '') : '', accessLink: t.approved ? (t.accessLink || '') : '', orgId: t.orgId || '', sessionData: t.sessionData || '', wechat: t.wechat || '', email: t.email || '', subscriptionExpiresAt: t.subscriptionExpiresAt || null, durationDays: t.durationDays || 30, processingText: pre.processingText, approvedText: pre.approvedText, approvedSteps: pre.approvedSteps, postApprovedText: post.postApprovedText, postApprovedSteps: post.postApprovedSteps, notification: notifPayload });
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
    credentialsMode: t.credentialsMode || false, loginDetails: t.approved ? (t.loginDetails || '') : '', accessLink: t.approved ? (t.accessLink || '') : '',
    approvedAt: t.approvedAt || null, declineReason: t.declineReason || '',
    orgId: t.orgId || '', sessionData: t.sessionData || '', wechat: t.wechat || '', email: t.email || '',
    subscriptionExpiresAt: t.subscriptionExpiresAt || null, durationDays: t.durationDays || 30,
    processingText: pre.processingText, approvedText: pre.approvedText, approvedSteps: pre.approvedSteps,
    postApprovedText: post.postApprovedText, postApprovedSteps: post.postApprovedSteps,
    notification: notify.enabled ? { message: notify.message, type: notify.type } : null,
  });
});

// ── Approve ────────────────────────────────────────────────────────────────────
app.post('/admin/approve', async (req, res) => {
  const { adminKey, token } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  if (tokens[token].approved) return res.json({ success: true });
  const days = getDurationDays(tokens[token].productId, tokens[token].packageType);
  tokens[token].approved = true; tokens[token].declined = false;
  tokens[token].approvedAt = new Date().toISOString();
  tokens[token].subscriptionExpiresAt = new Date(Date.now() + days*24*60*60*1000).toISOString();
  tokens[token].subscriptionDays = days;
  saveTokens(tokens);

  // Auto-send activation email if customer has email + template configured
  const t = tokens[token];
  if (t.email) {
    try {
      const settings = loadSettings();
      const tmplId   = settings.activationEmailTemplateId;
      if (tmplId) {
        const tmplData = loadTemplates();
        const tmpl     = tmplData.templates.find(x => x.id === tmplId);
        if (tmpl) {
          const html = applyTemplateVars(tmpl.body, t);
          const subj = applyTemplateVars(tmpl.subject, t);
          await sendEmail({ to: t.email, subject: subj, html, type: 'activation', token });
        }
      }
    } catch(e) { console.warn('Activation email failed:', e.message); }
  }
  res.json({ success: true });
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

// ── Email Templates CRUD ──────────────────────────────────────────────────────
app.get('/admin/email-templates', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadTemplates());
});
app.post('/admin/email-templates/save', (req, res) => {
  const { adminKey, template } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!template || !template.id || !template.name || !template.subject || !template.body)
    return res.status(400).json({ error: 'All fields required.' });
  const data = loadTemplates();
  const idx  = data.templates.findIndex(t => t.id === template.id);
  template.lastModified = new Date().toISOString();
  if (idx >= 0) data.templates[idx] = template; else data.templates.push(template);
  saveTemplates(data);
  res.json({ success: true });
});
app.post('/admin/email-templates/delete', (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const data = loadTemplates();
  data.templates = data.templates.filter(t => t.id !== id);
  saveTemplates(data);
  res.json({ success: true });
});

// ── Bulk email send ────────────────────────────────────────────────────────────
app.post('/admin/bulk-email', async (req, res) => {
  const { adminKey, templateId, customSubject, customBody, recipientFilter, tokenList } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });

  const cfg = loadEmailCfg();
  if (!cfg.host || !cfg.user || !cfg.pass)
    return res.status(400).json({ error: 'Email is not configured. Go to Email Config first.' });

  // Resolve template
  let subject = customSubject || '';
  let body    = customBody    || '';
  if (templateId) {
    const data = loadTemplates();
    const tmpl = data.templates.find(t => t.id === templateId);
    if (tmpl) { subject = subject || tmpl.subject; body = body || tmpl.body; }
  }
  if (!subject || !body) return res.status(400).json({ error: 'Subject and body are required.' });

  // Build recipient list
  const tokens  = loadTokens();
  let recipients = [];

  if (tokenList && tokenList.length) {
    // Specific tokens selected by admin
    recipients = tokenList.map(tok => tokens[tok]).filter(t => t && t.email);
  } else {
    // Filter-based
    const filter = recipientFilter || 'all-with-email';
    for (const t of Object.values(tokens)) {
      if (!t.email) continue;
      if (filter === 'all-with-email') { recipients.push(t); continue; }
      if (filter === 'activated'   && t.approved)                { recipients.push(t); continue; }
      if (filter === 'expiring'    && t.approved && t.subscriptionExpiresAt) {
        const d = Math.ceil((new Date(t.subscriptionExpiresAt) - new Date())/(1000*60*60*24));
        if (d >= 0 && d <= 30) { recipients.push(t); continue; }
      }
      if (filter === 'expired' && t.approved && t.subscriptionExpiresAt) {
        const d = Math.ceil((new Date(t.subscriptionExpiresAt) - new Date())/(1000*60*60*24));
        if (d < 0) { recipients.push(t); continue; }
      }
      if (filter === 'submitted' && t.used && !t.approved) { recipients.push(t); continue; }
    }
  }

  if (!recipients.length) return res.status(400).json({ error: 'No recipients match this filter.' });

  // Send emails one by one (avoid rate limits)
  const results = { sent: 0, failed: 0, errors: [] };
  for (const t of recipients) {
    const personalSubject = applyTemplateVars(subject, t);
    const personalBody    = applyTemplateVars(body, t);
    const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#2563eb;padding:20px 28px">
        <div style="font-size:18px;font-weight:700;color:#fff">DTC</div>
        <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">Digital Tools Corner</div>
      </div>
      <div style="padding:28px;font-size:14px;color:#334155;line-height:1.75">${personalBody}</div>
      <div style="padding:16px 28px;background:#f8faff;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
        DTC — Digital Tools Corner &nbsp;·&nbsp; <a href="mailto:dtc@dtc1.shop" style="color:#94a3b8">dtc@dtc1.shop</a>
      </div>
    </div>`;
    const r = await sendEmail({ to: t.email, subject: personalSubject, html, type: 'bulk' });
    if (r.ok) results.sent++;
    else { results.failed++; results.errors.push({ email: t.email, error: r.error }); }
    // Small delay between sends to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  res.json({ success: true, ...results, total: recipients.length });
});

// ── Preview bulk email (returns personalised HTML for first recipient) ─────────
app.post('/admin/bulk-email/preview', (req, res) => {
  const { adminKey, templateId, customSubject, customBody, recipientFilter } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });

  let subject = customSubject || '';
  let body    = customBody    || '';
  if (templateId) {
    const data = loadTemplates();
    const tmpl = data.templates.find(t => t.id === templateId);
    if (tmpl) { subject = subject || tmpl.subject; body = body || tmpl.body; }
  }

  // Find a sample recipient
  const tokens = loadTokens();
  const sample = Object.values(tokens).find(t => t.email) || { customerName: 'Ahmed Khan', packageType: 'Claude Pro — 1 Month', email: 'customer@example.com' };

  res.json({
    subject: applyTemplateVars(subject, sample),
    body:    applyTemplateVars(body, sample),
    sampleName: sample.customerName,
  });
});

// ── Update product credentials (push to all approved tokens of same product) ──
app.post('/admin/products/update-credentials', (req, res) => {
  const { adminKey, productId, loginDetails, accessLink } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });

  // Update product file
  const data = loadProducts();
  const prod = data.products.find(p => p.id === productId);
  if (!prod) return res.status(404).json({ error: 'Product not found.' });
  if (loginDetails !== undefined) prod.loginDetails = loginDetails;
  if (accessLink   !== undefined) prod.accessLink   = accessLink;
  saveProducts(data);

  // Push to all active tokens using this product
  const tokens  = loadTokens();
  let updated   = 0;
  for (const [, t] of Object.entries(tokens)) {
    if (t.productId === productId && t.approved) {
      if (loginDetails !== undefined) t.loginDetails = loginDetails;
      if (accessLink   !== undefined) t.accessLink   = accessLink;
      updated++;
    }
  }
  saveTokens(tokens);
  res.json({ success: true, updatedTokens: updated });
});

// ── Settings (currency etc.) ───────────────────────────────────────────────────
app.get('/admin/settings', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadSettings());
});
app.post('/admin/settings', (req, res) => {
  const { adminKey, settings } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const current = loadSettings();
  saveSettings({ ...current, ...settings });
  res.json({ success: true });
});

// ── Resellers list ─────────────────────────────────────────────────────────────
app.get('/admin/resellers', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens();
  const map = {};
  for (const t of Object.values(tokens)) {
    if (!t.resellerId) continue;
    if (!map[t.resellerId]) map[t.resellerId] = { id: t.resellerId, name: t.resellerName || t.resellerId, total: 0, count: 0, activated: 0 };
    map[t.resellerId].count++;
    if (t.approved && t.price) { map[t.resellerId].total += t.price; map[t.resellerId].activated++; }
  }
  res.json({ resellers: Object.values(map) });
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
