/* config/accounting.js — Accounting module: chart of accounts + posting maps.
 *
 * The accounting system is double-entry. This file declares the Chart of Accounts
 * and the mappings that turn business events (sales, payments, expenses…) into
 * balanced journal entries. Nothing here is hardcoded at a call site — services
 * read these maps, so the books stay configurable. Gated by the `accounting`
 * feature module. */

/* account families — normal balance side + which statement they belong to */
const ACCT_TYPES = {
  asset:     { normal:"debit",  statement:"bs", label:"الأصول" },
  liability: { normal:"credit", statement:"bs", label:"الخصوم" },
  equity:    { normal:"credit", statement:"bs", label:"حقوق الملكية" },
  revenue:   { normal:"credit", statement:"pl", label:"الإيرادات" },
  expense:   { normal:"debit",  statement:"pl", label:"المصروفات" }
};

const CHART_OF_ACCOUNTS = [
  { code:"1000", name:"الصندوق (نقدية)",       type:"asset" },
  { code:"1010", name:"البنك",                 type:"asset" },
  { code:"1020", name:"محفظة إلكترونية",        type:"asset" },
  { code:"1100", name:"ذمم العملاء (مدينة)",    type:"asset" },
  { code:"1200", name:"المخزون",               type:"asset" },
  { code:"2000", name:"ذمم الموردين (دائنة)",   type:"liability" },
  { code:"2100", name:"ضريبة مستحقة",           type:"liability" },
  { code:"3000", name:"رأس المال",             type:"equity" },
  { code:"3900", name:"الأرباح المحتجزة",       type:"equity" },
  { code:"4000", name:"إيرادات الخدمات",        type:"revenue" },
  { code:"5000", name:"مصروفات عامة",           type:"expense" },
  { code:"5100", name:"رواتب وأجور",            type:"expense" },
  { code:"5200", name:"كهرباء وماء",            type:"expense" }
];

/* payment-method key → cash/asset account it debits (credit = the receivable) */
const PAY_ACCOUNT = { cash:"1000", bank:"1010", mobile:"1020", credit:"1100" };
/* expense category → expense account (falls back to general) */
const EXP_ACCOUNT_BY_CAT = { "مواد":"5000", "صيانة":"5000", "أخرى":"5000" };
/* well-known account handles used by the posting service */
const ACCT = { CASH:"1000", AR:"1100", INVENTORY:"1200", AP:"2000", TAX:"2100", REVENUE:"4000", EXP:"5000", SALARY:"5100", UTIL:"5200" };

Object.assign(App.config, { ACCT_TYPES, CHART_OF_ACCOUNTS, PAY_ACCOUNT, EXP_ACCOUNT_BY_CAT, ACCT });
