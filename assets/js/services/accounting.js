/* services/accounting.js — the ONLY writer of state.journal.
 *
 * postEntry validates a balanced double-entry and appends it; the post* helpers
 * translate business events into entries. All posting is a no-op when the
 * `accounting` feature module is disabled, so it is fully optional. Pure of DOM:
 * services mutate the store and return a typed Result. */
(function (App) {
  "use strict";
  function on(){ return App.core.featureEnabled("accounting"); }

  App.services.postEntry = function (dto) {
    if (!on()) return { ok:false, error:"disabled" };
    dto = dto || {};
    var lines = (dto.lines||[]).filter(function(l){ return l && l.account && ((+l.debit||0) || (+l.credit||0)); });
    if (lines.length < 2) return { ok:false, error:"insufficient_lines" };
    var d=0, c=0; lines.forEach(function(l){ d+=+l.debit||0; c+=+l.credit||0; });
    if (Math.round((d-c)*100) !== 0) return { ok:false, error:"unbalanced" };
    if (!state.journal) state.journal = [];
    var entry = {
      id: uid(), date: dto.date || iso(new Date()), ref: dto.ref||"", memo: dto.memo||"",
      source: dto.source||"manual",
      lines: lines.map(function(l){ return { account:l.account, debit:+l.debit||0, credit:+l.credit||0 }; })
    };
    state.journal.push(entry);
    return { ok:true, entry:entry };
  };

  /* a sale: Dr cash/bank/wallet (or receivable if deferred), Cr revenue */
  App.services.postSale = function (o) {
    o = o||{}; if (!on() || !(+o.amount>0)) return { ok:false };
    var payAcct = o.deferred ? PAY_ACCOUNT.credit : (PAY_ACCOUNT[o.method]||PAY_ACCOUNT.cash);
    return App.services.postEntry({ date:o.date, ref:o.ref, memo:o.memo||"مبيعات", source:"sale",
      lines:[ {account:payAcct, debit:o.amount}, {account:ACCT.REVENUE, credit:o.amount} ] });
  };
  /* collecting a receivable: Dr cash, Cr accounts receivable */
  App.services.postCollection = function (o) {
    o = o||{}; if (!on() || !(+o.amount>0)) return { ok:false };
    var payAcct = PAY_ACCOUNT[o.method]||PAY_ACCOUNT.cash;
    return App.services.postEntry({ date:o.date, ref:o.ref, memo:o.memo||"تحصيل دفعة", source:"collection",
      lines:[ {account:payAcct, debit:o.amount}, {account:ACCT.AR, credit:o.amount} ] });
  };
  /* an expense: Dr expense account, Cr cash */
  App.services.postExpense = function (o) {
    o = o||{}; if (!on() || !(+o.amount>0)) return { ok:false };
    var acct = o.account || EXP_ACCOUNT_BY_CAT[o.category] || ACCT.EXP;
    return App.services.postEntry({ date:o.date, ref:o.ref, memo:o.memo||o.category||"مصروف", source:"expense",
      lines:[ {account:acct, debit:o.amount}, {account:PAY_ACCOUNT.cash, credit:o.amount} ] });
  };
  /* reverse an entry (refund / cancellation) by swapping debits and credits */
  App.services.reverseEntry = function (id, dateStr) {
    if (!on()) return { ok:false };
    var e = (state.journal||[]).find(function(x){ return x.id===id; });
    if (!e) return { ok:false, error:"not_found" };
    return App.services.postEntry({ date:dateStr||iso(new Date()), ref:e.ref, memo:"عكس: "+(e.memo||""), source:"reversal",
      lines: e.lines.map(function(l){ return { account:l.account, debit:l.credit, credit:l.debit }; }) });
  };
})(window.App);
