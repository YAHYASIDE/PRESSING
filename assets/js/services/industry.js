/* services/industry.js — digital inspection + pickup system (car ops). */
(function (App) {
  "use strict";
  function op(id){ return (state.carOps||[]).find(function(o){ return o.id===id; }); }

  /* save a vehicle inspection onto an operation */
  App.services.saveInspection = function (opId, data) {
    var o=op(opId); if(!o) return { ok:false, error:"not_found" };
    data=data||{};
    o.inspection = { items:data.items||{}, fuel:data.fuel||"", notes:(data.notes||"").trim(),
      damages:data.damages||[], custSig:data.custSig||"", empSig:data.empSig||"",
      date:iso(new Date()), by:(typeof currentUser!=="undefined"?currentUser:"")||"" };
    if(App.services.audit) App.services.audit("فحص مركبة", o.no);
    return { ok:true, op:o };
  };

  /* generate a short pickup code (+ enables QR pickup) — idempotent per op */
  App.services.generatePickup = function (opId) {
    var o=op(opId); if(!o) return { ok:false, error:"not_found" };
    if(!o.pickupCode){ state.pickupSeq=(state.pickupSeq||1000)+1; o.pickupCode=("000"+(state.pickupSeq%10000)).slice(-4); }
    return { ok:true, code:o.pickupCode, op:o };
  };
  /* verify a pickup code and mark the vehicle handed over */
  App.services.verifyPickup = function (opId, code) {
    var o=op(opId); if(!o) return { ok:false, error:"not_found" };
    if(!o.pickupCode) return { ok:false, error:"no_code" };
    if((""+code).trim() !== o.pickupCode) return { ok:false, error:"mismatch" };
    o.pickedUp=true; o.pickedUpAt=iso(new Date());
    if(App.services.audit) App.services.audit("تأكيد استلام", o.no+" · "+o.pickupCode);
    return { ok:true, op:o };
  };
})(window.App);
