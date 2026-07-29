/* config/constants.js — shop identity, lookup tables and access code (moved out of app.js). */
const SECRET_CODE="070752";
const SHOP_NAME="مغاسيل صداقة", SHOP_PHONE="22227268";
const VEH_LETTER={"سيارة صغيرة":"S","سيارة كبيرة":"K","دراجة نارية":"D","شاحنة":"T","انيل":"A","أخرى":"X"};
const COUNTRIES=[{n:"موريتانيا",c:"222"},{n:"مالي",c:"223"},{n:"النيجر",c:"227"},{n:"الجزائر",c:"213"}];
Object.assign(App.config, { SHOP_NAME, SHOP_PHONE, VEH_LETTER, COUNTRIES, SECRET_CODE });
