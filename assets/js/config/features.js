/* config/features.js — Feature Modules registry.
 *
 * The application supports OPTIONAL business features ("modules"). Each module
 * is declared here once; the Settings screen renders a toggle (and, when the
 * module is configurable, a settings panel) straight from this registry, and
 * `state.features[key]` holds the per-shop on/off flag + configuration.
 *
 * Adding a future module (Inventory, Reservations, Branches, …) is a two-step
 * job: (1) add an entry to FEATURE_MODULES, (2) gate that module's UI/logic
 * behind `App.core.featureEnabled(key)`. Nothing else in the toggle system,
 * the Settings UI, persistence, or migrations needs to change. */

/* ---- module registry (drives the Settings "Feature Modules" list) ---- */
const FEATURE_MODULES = [
  { key:"pos",           label:"نقطة البيع",    icon:"income", desc:"بيع المنتجات والخدمات بفواتير وضريبة وطرق دفع متعددة." },
  { key:"loyalty",       label:"برنامج الولاء", icon:"gift",   desc:"مكافأة الزبائن المتكررين — أختام، نقاط، خصم أو كوبون.", configurable:true },
  { key:"inventory",     label:"المخزون",       icon:"wallet", desc:"تتبّع المواد والكميات وتنبيهات النقص." },
  { key:"reservations",  label:"الحجوزات",      icon:"clock",  desc:"حجز مواعيد غسيل مسبقة للزبائن.",                     comingSoon:true },
  { key:"employees",     label:"الموظفون",      icon:"worker", desc:"وحدة موظفين متقدمة (ورديات، أداء).",                 comingSoon:true },
  { key:"branches",      label:"الفروع",        icon:"other",  desc:"إدارة عدّة فروع بحسابات منفصلة.",                    comingSoon:true },
  { key:"notifications", label:"الإشعارات",     icon:"alert",  desc:"تنبيهات واتساب تلقائية عند الجاهزية والتسليم.",       comingSoon:true },
  { key:"accounting",    label:"المحاسبة",      icon:"chart",  desc:"التقارير المالية ولوحة الأرباح والمصروفات." }
];

/* ---- loyalty module: strategies + configurable rule fields ---- */
const LOYALTY_STRATEGIES = [
  { k:"stamp",    label:"عدد الغسلات", hint:"كل عدد محدّد من الغسلات يمنح غسلة مجانية." },
  { k:"points",   label:"نقاط",        hint:"تُجمع نقاط لكل غسلة وتُستبدل بغسلة مجانية." },
  { k:"discount", label:"خصم",         hint:"خصم دائم على السعر بعد عدد من الغسلات." },
  { k:"coupon",   label:"كوبون",       hint:"يحصل الزبون على كوبون بعد عدد من الغسلات." }
];
/* Each field belongs to one strategy and is only shown/saved for that strategy. */
const LOYALTY_FIELDS = [
  { key:"threshold",     type:"number", label:"عدد الغسلات للمكافأة",       def:5,   strat:"stamp",    min:2 },
  { key:"pointsPerWash", type:"number", label:"نقاط لكل غسلة",              def:10,  strat:"points",   min:1 },
  { key:"redeemPoints",  type:"number", label:"نقاط استبدال غسلة مجانية",   def:100, strat:"points",   min:1 },
  { key:"discountAfter", type:"number", label:"يبدأ الخصم بعد (غسلات)",     def:5,   strat:"discount", min:1 },
  { key:"discountPct",   type:"number", label:"نسبة الخصم %",               def:10,  strat:"discount", min:1, max:90 },
  { key:"couponEvery",   type:"number", label:"كوبون بعد كل (غسلات)",       def:5,   strat:"coupon",   min:1 },
  { key:"couponValue",   type:"number", label:"قيمة الكوبون",               def:0,   strat:"coupon",   min:0 },
  { key:"couponCode",    type:"text",   label:"رمز الكوبون (اختياري)",      def:"",  strat:"coupon" }
];

/* Default configuration for a fresh install / when a flag is missing. */
function defaultLoyaltyCfg(){
  const c={ enabled:true, strategy:"stamp" };
  LOYALTY_FIELDS.forEach(f=>{ c[f.key]=f.def; });
  return c;
}
function defaultFeatures(){
  const f={ loyalty: defaultLoyaltyCfg() };
  FEATURE_MODULES.forEach(m=>{ if(m.key!=="loyalty") f[m.key]={ enabled:false }; });
  return f;
}

Object.assign(App.config, { FEATURE_MODULES, LOYALTY_STRATEGIES, LOYALTY_FIELDS, defaultLoyaltyCfg, defaultFeatures });
