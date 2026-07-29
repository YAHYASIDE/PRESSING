/* core/accounting.js — pure accounting math over state.journal (double-entry).
   No DOM/services: given the journal + a date filter, derive ledgers and the
   financial statements. Registered on App.core. */

function acctByCode(code){ return CHART_OF_ACCOUNTS.find(a=>a.code===code) || {code:code, name:code, type:"asset"}; }
function acctType(code){ return acctByCode(code).type; }
function acctNormal(code){ return (ACCT_TYPES[acctType(code)]||{normal:"debit"}).normal; }
function journalAll(){ return state.journal||[]; }
function journalEntries(filter){ const j=journalAll(); return filter?j.filter(e=>filter(e.date)):j; }

/* signed balance of one account (respecting its normal side) within a filter */
function accountBalance(code, filter){
  let d=0,c=0;
  journalEntries(filter).forEach(e=>e.lines.forEach(l=>{ if(l.account===code){ d+=+l.debit||0; c+=+l.credit||0; } }));
  return acctNormal(code)==="debit" ? (d-c) : (c-d);
}
/* per-line ledger for one account, chronological, with a running balance */
function ledgerFor(code, filter){
  const rows=[]; let bal=0;
  journalEntries(filter).slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(e=>{
    e.lines.forEach(l=>{ if(l.account===code){
      const dd=+l.debit||0, cc=+l.credit||0;
      bal += (acctNormal(code)==="debit" ? (dd-cc) : (cc-dd));
      rows.push({ date:e.date, ref:e.ref, memo:e.memo, debit:dd, credit:cc, balance:bal });
    }});
  });
  return { rows, balance:bal };
}
/* trial balance — every touched account with its net debit/credit */
function trialBalance(filter){
  const map={};
  journalEntries(filter).forEach(e=>e.lines.forEach(l=>{ const m=map[l.account]||(map[l.account]={d:0,c:0}); m.d+=+l.debit||0; m.c+=+l.credit||0; }));
  const rows=CHART_OF_ACCOUNTS.filter(a=>map[a.code]).map(a=>{ const net=map[a.code].d-map[a.code].c;
    return { code:a.code, name:a.name, type:a.type, debit: net>0?net:0, credit: net<0?-net:0 }; });
  return { rows, totalDebit: rows.reduce((s,r)=>s+r.debit,0), totalCredit: rows.reduce((s,r)=>s+r.credit,0) };
}
/* profit & loss */
function plStatement(filter){
  const rev=CHART_OF_ACCOUNTS.filter(a=>a.type==="revenue").map(a=>({code:a.code,name:a.name,amount:accountBalance(a.code,filter)})).filter(a=>a.amount);
  const exp=CHART_OF_ACCOUNTS.filter(a=>a.type==="expense").map(a=>({code:a.code,name:a.name,amount:accountBalance(a.code,filter)})).filter(a=>a.amount);
  const revTotal=rev.reduce((s,x)=>s+x.amount,0), expTotal=exp.reduce((s,x)=>s+x.amount,0);
  return { rev, exp, revTotal, expTotal, net:revTotal-expTotal };
}
/* balance sheet — equity absorbs current net income so it balances without closing */
function balanceSheet(filter){
  const pick=(t)=>CHART_OF_ACCOUNTS.filter(a=>a.type===t).map(a=>({code:a.code,name:a.name,amount:accountBalance(a.code,filter)})).filter(a=>a.amount);
  const assets=pick("asset"), liab=pick("liability"), eqAcc=pick("equity");
  const assetsTotal=assets.reduce((s,x)=>s+x.amount,0), liabTotal=liab.reduce((s,x)=>s+x.amount,0);
  const net=plStatement(filter).net;
  const eqTotal=eqAcc.reduce((s,x)=>s+x.amount,0)+net;
  return { assets, liab, eqAcc, assetsTotal, liabTotal, eqTotal, net, balanced: Math.abs(assetsTotal-(liabTotal+eqTotal))<0.01 };
}
/* cash flow (movement through the cash/bank/wallet accounts) */
function cashSummary(filter){
  const cash=["1000","1010","1020"]; let inflow=0, outflow=0;
  journalEntries(filter).forEach(e=>e.lines.forEach(l=>{ if(cash.indexOf(l.account)>=0){ inflow+=+l.debit||0; outflow+=+l.credit||0; } }));
  return { inflow, outflow, net:inflow-outflow };
}

Object.assign(App.core, { acctByCode, acctType, acctNormal, journalEntries, accountBalance, ledgerFor, trialBalance, plStatement, balanceSheet, cashSummary });
