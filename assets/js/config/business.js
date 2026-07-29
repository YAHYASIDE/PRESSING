/* config/business.js — Business Configuration catalog + defaults.
 *
 * Release 5 introduces a dedicated Business Configuration layer (`state.business`)
 * so the app is a CONFIGURABLE platform, not a fixed car-wash tool. The Setup
 * Wizard writes this object once; every module then reads its behavior from it
 * (business types → which screens appear, services → the service catalog,
 * paymentMethods → the payment selector, features → the Feature Modules,
 * currency/name/hours → display). Nothing about the business is hardcoded. */

/* ---- catalogs the wizard chooses from ---- */
const BUSINESS_TYPES = [
  { k:"carwash",   label:"غسيل سيارات", icon:"car",     desc:"استقبال وغسيل المركبات." },
  { k:"carpet",    label:"غسيل سجاد",   icon:"rug",     desc:"غسيل السجاد والموكيت." },
  { k:"laundry",   label:"مغسلة ملابس", icon:"fabric",  desc:"غسيل وكي الملابس والأفرشة." },
  { k:"oil-change",label:"تغيير الزيت", icon:"drop",    desc:"تغيير الزيوت وصيانة سريعة." },
  { k:"shop",      label:"محل / متجر",  icon:"wallet",  desc:"بيع المنتجات والإكسسوارات." }
];

/* The service catalog is now configurable (was the hardcoded WASH_TYPES). */
const SERVICE_CATALOG = [
  { k:"exterior", label:"غسيل خارجي" },
  { k:"interior", label:"غسيل داخلي" },
  { k:"full",     label:"غسيل شامل" },
  { k:"steam",    label:"تنظيف بالبخار" },
  { k:"polish",   label:"تلميع" },
  { k:"wax",      label:"تشميع" },
  { k:"engine",   label:"تنظيف المحرك" }
];

/* Base payment methods (the wizard toggles these and can add custom ones). */
const PAYMENT_CATALOG = [
  { k:"cash",   label:"نقدًا" },
  { k:"bank",   label:"تحويل بنكي" },
  { k:"mobile", label:"محفظة إلكترونية" },
  { k:"credit", label:"آجل (دَين)" }
];

const LANGUAGES  = [ {k:"ar",label:"العربية"}, {k:"fr",label:"Français"}, {k:"en",label:"English"} ];
const CURRENCIES = [ "أوقية", "درهم", "ريال", "دينار", "جنيه", "$", "€" ];
const TIMEZONES  = [ "Africa/Nouakchott", "Africa/Casablanca", "Asia/Riyadh", "Africa/Cairo", "Europe/Paris", "UTC" ];
/* Arabic week order (Sat → Fri); k = JS getDay() index. */
const WEEK_DAYS  = [ {k:6,label:"السبت"}, {k:0,label:"الأحد"}, {k:1,label:"الاثنين"}, {k:2,label:"الثلاثاء"}, {k:3,label:"الأربعاء"}, {k:4,label:"الخميس"}, {k:5,label:"الجمعة"} ];

function defaultServices(){
  const s={}; SERVICE_CATALOG.forEach(x=>{ s[x.k]=false; });
  s.exterior=true; s.interior=true; s.full=true;   // sensible starting catalog
  return s;
}
/* A fresh, UNCONFIGURED business — first launch opens the wizard to fill it.
   Release 5.1: everything except the business types + name/logo now has a sensible
   DEFAULT here and is NOT asked during onboarding (editable later in Settings). */
function defaultBusiness(){
  return {
    configured:false,
    name:"", logo:"", phone:"",
    country:"موريتانيا", currency:"أوقية", language:"ar", timezone:"Africa/Nouakchott",
    types:{ carwash:true, carpet:false, laundry:false, "oil-change":false, shop:false },
    services: defaultServices(),
    paymentMethods: PAYMENT_CATALOG.map(p=>({ k:p.k, label:p.label })),
    tax:{ enabled:false, rate:0, label:"ضريبة القيمة المضافة" },
    features:{ pos:true, loyalty:true, employees:true, inventory:false, reservations:false, notifications:false, branches:false, accounting:true },
    workingHours:{ open:"08:00", close:"22:00", days:[6,0,1,2,3,4] }   // السبت–الخميس (الجمعة عطلة)
  };
}

/* Release 5.1 — trial + subscription plans (no payment gateway yet). */
const TRIAL_DAYS = 3;
const SUB_PLANS = [
  { k:"monthly",  name:"شهري",     price:"—", per:"/شهر",  badge:"",            features:["كل الميزات المدفوعة","دعم فني","تحديثات مستمرة"] },
  { k:"biannual", name:"6 أشهر",   price:"—", per:"/6 أشهر", badge:"الأكثر توفيرًا", features:["كل مزايا الخطة الشهرية","خصم على السعر","أولوية الدعم"] },
  { k:"yearly",   name:"سنوي",     price:"—", per:"/سنة",  badge:"الأفضل قيمة",  features:["كل مزايا الخطة نصف السنوية","شهران مجانًا","مدير حساب مخصّص"] }
];

Object.assign(App.config, { BUSINESS_TYPES, SERVICE_CATALOG, PAYMENT_CATALOG, LANGUAGES, CURRENCIES, TIMEZONES, WEEK_DAYS, TRIAL_DAYS, SUB_PLANS, defaultServices, defaultBusiness });
