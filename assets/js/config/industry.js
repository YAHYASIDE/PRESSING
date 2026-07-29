/* config/industry.js — car-wash industry features: digital inspection, pickup,
   loyalty tiers. Configurable catalogs; gated where relevant. */

/* vehicle inspection checklist sections + condition scale */
const INSPECTION_SECTIONS = [
  { k:"body",     label:"الهيكل" },
  { k:"glass",    label:"الزجاج" },
  { k:"lights",   label:"الأضواء" },
  { k:"tyres",    label:"الإطارات" },
  { k:"interior", label:"الداخلية" },
  { k:"engine",   label:"المحرك" }
];
const INSPECTION_CONDITIONS = [
  { k:"good",     label:"سليم",  cls:"good" },
  { k:"fair",     label:"متوسط", cls:"fair" },
  { k:"damaged",  label:"تالف",  cls:"damaged" }
];
const FUEL_LEVELS = [
  { k:"E",   label:"فارغ" },
  { k:"1/4", label:"ربع" },
  { k:"1/2", label:"نصف" },
  { k:"3/4", label:"ثلاثة أرباع" },
  { k:"F",   label:"ممتلئ" }
];

/* automatic loyalty tiers by lifetime spend (highest first) */
const LOYALTY_TIERS = [
  { k:"diamond", label:"ماسي",  min:5000, color:"#3aa0e0", icon:"💎" },
  { k:"gold",    label:"ذهبي",  min:2000, color:"#e0a800", icon:"🥇" },
  { k:"silver",  label:"فضي",   min:800,  color:"#8b98a6", icon:"🥈" },
  { k:"vip",     label:"VIP",   min:200,  color:"#7a5cff", icon:"⭐" },
  { k:"basic",   label:"عادي",  min:0,    color:"#94a3b8", icon:"" }
];

Object.assign(App.config, { INSPECTION_SECTIONS, INSPECTION_CONDITIONS, FUEL_LEVELS, LOYALTY_TIERS });
