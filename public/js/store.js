/* ─── DTC Admin — Application State Store ───────────────────────────────── */

'use strict';

/**
 * Single source of truth for all runtime data.
 * Components read from Store and call Store.set*() to update.
 * This replaces scattered `let` globals across the old single file.
 */
const Store = (() => {
  let _adminKey      = '';
  let _tokens        = {};
  let _emailLog      = [];
  let _instructions  = { sets: {} };
  let _dashFilter    = 'all';
  let _custFilter    = 'all';

  return {
    // ── Admin key ────────────────────────────────────────────────────────────
    get adminKey()     { return _adminKey; },
    setAdminKey(k)     { _adminKey = k; },

    // ── Tokens (links) ───────────────────────────────────────────────────────
    get tokens()       { return _tokens; },
    setTokens(t)       { _tokens = t || {}; },

    // ── Email log ────────────────────────────────────────────────────────────
    get emailLog()     { return _emailLog; },
    setEmailLog(l)     { _emailLog = l || []; },

    // ── Instruction sets ──────────────────────────────────────────────────────
    get instructions() { return _instructions; },
    setInstructions(i) { _instructions = i || { sets: {} }; },
    upsertInstruction(set) { _instructions.sets[set.id] = set; },
    deleteInstruction(id)  { delete _instructions.sets[id]; },

    // ── Dashboard filter ──────────────────────────────────────────────────────
    get dashFilter()   { return _dashFilter; },
    setDashFilter(f)   { _dashFilter = f; },

    // ── Customer filter ───────────────────────────────────────────────────────
    get custFilter()   { return _custFilter; },
    setCustFilter(f)   { _custFilter = f; },

    // ── Bulk load after login ─────────────────────────────────────────────────
    load({ tokens, emailLog }) {
      this.setTokens(tokens);
      this.setEmailLog(emailLog);
    },
  };
})();
