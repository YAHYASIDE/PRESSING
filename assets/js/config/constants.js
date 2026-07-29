/* config/constants.js — shop identity, lookup tables and access code (moved out of app.js). */
const SECRET_CODE="070752";
const SHOP_NAME="مغاسيل صداقة", SHOP_PHONE="22227268";
const VEH_LETTER={"سيارة صغيرة":"S","سيارة كبيرة":"K","دراجة نارية":"D","شاحنة":"T","انيل":"A","أخرى":"X"};
const COUNTRIES=[{n:"موريتانيا",c:"222"},{n:"مالي",c:"223"},{n:"النيجر",c:"227"},{n:"الجزائر",c:"213"}];
/* Release 2/3 — car operation lifecycle (ordered). exp = expected minutes before the live timer turns red. */
const CAR_STAGES=[
  {k:"received", label:"مُستلمة",       icon:"clock",  exp:5},
  {k:"waiting",  label:"في الانتظار",   icon:"clock",  exp:15},
  {k:"washing",  label:"قيد الغسيل",     icon:"car",    exp:20},
  {k:"drying",   label:"تلميع / تجفيف",  icon:"drop",   exp:10},
  {k:"ready",    label:"جاهزة للتسليم",  icon:"profit", exp:30},
  {k:"delivered",label:"تم التسليم",     icon:"income", exp:0}
];
/* Release 3 — operational queues shown with live counts. */
const OP_QUEUES=["waiting","washing","drying","ready"];
/* Release 3 — payment methods asked at delivery. */
const PAY_METHODS=[
  {k:"cash",   label:"نقدًا"},
  {k:"bank",   label:"تحويل بنكي"},
  {k:"mobile", label:"محفظة إلكترونية"},
  {k:"credit", label:"آجل (دَين)"}
];
/* Release 4 — roles & permissions. tabs = nav visible to the role; caps = capabilities.
   receive=create ops · operate=advance stages · collect=take payment · finance=see money · settings/delete/workers = admin. */
const ROLES={
  manager: {label:"مدير",   tabs:["dashboard","cars","carpets","expenses","reports","accounting"], caps:{settings:1,delete:1,workers:1,finance:1,receive:1,operate:1,collect:1}},
  admin:   {label:"مسؤول",  tabs:["dashboard","cars","carpets","expenses","reports","accounting"], caps:{settings:1,delete:1,workers:1,finance:1,receive:1,operate:1,collect:1}},
  cashier: {label:"كاشير",  tabs:["cars","reports"],                                   caps:{finance:1,receive:1,collect:1,operate:1}},
  worker:  {label:"عامل",   tabs:["cars"],                                              caps:{operate:1}}
};
Object.assign(App.config, { SHOP_NAME, SHOP_PHONE, VEH_LETTER, COUNTRIES, SECRET_CODE, CAR_STAGES, OP_QUEUES, PAY_METHODS, ROLES });
