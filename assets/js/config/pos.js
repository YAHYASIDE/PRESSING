/* config/pos.js — POS module config: coupon codes + invoice number format.
   Configurable; no hardcoded discounts at call sites. Gated by the `pos` module. */
const POS_COUPONS = [
  { code:"WELCOME10", type:"percent", value:10, label:"خصم ترحيبي 10%" },
  { code:"VIP20",     type:"percent", value:20, label:"عميل مميز 20%" },
  { code:"SAVE50",    type:"amount",  value:50, label:"خصم مبلغ 50" }
];
function posCoupon(code){ code=(code||"").trim().toUpperCase(); return POS_COUPONS.find(c=>c.code===code)||null; }

Object.assign(App.config, { POS_COUPONS, posCoupon });
