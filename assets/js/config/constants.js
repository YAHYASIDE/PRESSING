/* config/constants.js — shop identity, lookup tables and access code (moved out of app.js). */
const SECRET_CODE="070752";
const SHOP_NAME="مغاسيل صداقة", SHOP_PHONE="22227268";
const VEH_LETTER={"سيارة صغيرة":"S","سيارة كبيرة":"K","دراجة نارية":"D","شاحنة":"T","انيل":"A","أخرى":"X"};
const COUNTRIES=[{n:"موريتانيا",c:"222"},{n:"مالي",c:"223"},{n:"النيجر",c:"227"},{n:"الجزائر",c:"213"}];
/* Release 2 — car operation lifecycle (ordered). */
const CAR_STAGES=[
  {k:"received", label:"مُستلمة",       icon:"clock"},
  {k:"waiting",  label:"في الانتظار",   icon:"clock"},
  {k:"washing",  label:"قيد الغسيل",     icon:"car"},
  {k:"drying",   label:"تلميع / تجفيف",  icon:"drop"},
  {k:"ready",    label:"جاهزة للتسليم",  icon:"profit"},
  {k:"delivered",label:"تم التسليم",     icon:"income"}
];
Object.assign(App.config, { SHOP_NAME, SHOP_PHONE, VEH_LETTER, COUNTRIES, SECRET_CODE, CAR_STAGES });
