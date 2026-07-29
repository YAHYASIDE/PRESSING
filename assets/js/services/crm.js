/* services/crm.js — Customer/Vehicle registry writers + the Oil-Change use-case.
 * Oil change reuses App.services.finalizeInvoice (one posting path) and updates the
 * vehicle + generates a reminder. No duplicate sale logic. */
(function (App) {
  "use strict";
  function newVehicle(customerId, fields){
    fields=fields||{};
    return { id:uid(), customerId:customerId, plate:(fields.plate||"").trim(), brand:fields.brand||"", model:fields.model||"", year:fields.year||"",
      color:fields.color||"", vin:fields.vin||"", fuelType:fields.fuelType||"", transmission:fields.transmission||"", engine:fields.engine||"",
      oilType:fields.oilType||"", oilCapacity:+fields.oilCapacity||0, mileage:+fields.mileage||0, nextOilMileage:+fields.nextOilMileage||0,
      lastOilDate:fields.lastOilDate||"", lastServiceDate:fields.lastServiceDate||"", photos:fields.photos||[], notes:fields.notes||"", history:[] };
  }
  /* idempotently ensure every customer has an id + a registered vehicle for their plate */
  App.services.crmSync = function () {
    if(!state.vehicles) state.vehicles=[];
    Object.keys(state.customers||{}).forEach(function(plate){
      var c=state.customers[plate]; if(!plate) return;
      if(!c.id) c.id="cust"+plate;
      if(!c.registeredAt) c.registeredAt=c.lastVisit||iso(new Date());
      if(!state.vehicles.some(function(v){ return v.customerId===c.id && v.plate===plate; }))
        state.vehicles.push(newVehicle(c.id,{plate:plate}));
    });
  };
  /* create / update a customer profile (CRM fields) */
  App.services.saveCustomer = function (dto) {
    dto=dto||{}; var plate=(dto.plate||"").trim();
    var c;
    if(dto.id){ c=App.core.crmCustomer(dto.id); }
    if(!c && plate){ c=state.customers[plate]; }
    if(!c){ if(!plate) return { ok:false, error:"plate_required" }; c={ plate:plate, id:"cust"+plate, stamps:0, totalWashes:0, freeWashes:0, registeredAt:iso(new Date()) }; state.customers[plate]=c; }
    ["name","phone","phone2","whatsapp","email","address","nationalId","type","membership","notes","country","favoriteBranch","accountManager"].forEach(function(k){ if(dto[k]!=null) c[k]=(""+dto[k]).trim(); });
    if(dto.tags!=null) c.tags=Array.isArray(dto.tags)?dto.tags:(""+dto.tags).split(",").map(function(s){return s.trim();}).filter(Boolean);
    if(dto.creditLimit!=null) c.creditLimit=+dto.creditLimit||0;
    App.services.crmSync();
    return { ok:true, customer:c };
  };
  App.services.addVehicle = function (customerId, dto) {
    var c=App.core.crmCustomer(customerId); if(!c) return { ok:false, error:"no_customer" };
    if(!(dto.plate||"").trim()) return { ok:false, error:"plate_required" };
    var v=newVehicle(c.id,dto); state.vehicles=state.vehicles||[]; state.vehicles.push(v); return { ok:true, vehicle:v };
  };
  App.services.updateVehicle = function (id, dto) {
    var v=App.core.vehicle(id); if(!v) return { ok:false, error:"not_found" };
    ["plate","brand","model","year","color","vin","fuelType","transmission","engine","oilType","lastServiceDate","notes"].forEach(function(k){ if(dto[k]!=null) v[k]=(""+dto[k]).trim(); });
    ["oilCapacity","mileage","nextOilMileage"].forEach(function(k){ if(dto[k]!=null) v[k]=+dto[k]||0; });
    return { ok:true, vehicle:v };
  };
  App.services.deleteVehicle = function (id) { state.vehicles=(state.vehicles||[]).filter(function(v){ return v.id!==id; }); return { ok:true }; };

  /* Oil change: sells the service + consumes oil/filters (inventory), posts the
     invoice via finalizeInvoice, updates the vehicle and creates a reminder. */
  App.services.oilChange = function (dto) {
    dto=dto||{}; var v=App.core.vehicle(dto.vehicleId); if(!v) return { ok:false, error:"no_vehicle" };
    var cust=App.core.crmCustomer(v.customerId)||{};
    var items=[];
    if(+dto.laborPrice>0) items.push({ kind:"service", name:"تغيير زيت"+(dto.oilBrand?(" — "+dto.oilBrand):""), price:+dto.laborPrice||0, qty:1 });
    // oil product line (consumes inventory)
    if(dto.oilProductId){ var op=App.core.invProduct(dto.oilProductId); if(op) items.push({ kind:"product", refId:op.id, name:op.name, price:+op.price||0, cost:+op.cost||0, qty:+dto.oilQty||1 }); }
    // filters / consumables (each a product id + qty)
    (dto.parts||[]).forEach(function(pt){ var pp=App.core.invProduct(pt.productId); if(pp) items.push({ kind:"product", refId:pp.id, name:pp.name, price:+pp.price||0, cost:+pp.cost||0, qty:+pt.qty||1 }); });
    if(!items.length) return { ok:false, error:"empty" };
    var total0=items.reduce(function(s,i){ return s+i.price*i.qty; },0);
    var meta={ oil:{ vehicleId:v.id, oilBrand:dto.oilBrand||"", oilType:dto.oilType||"", oilGrade:dto.oilGrade||"", oilQty:+dto.oilQty||0,
      mileageBefore:+dto.mileageBefore||v.mileage||0, mileageAfter:+dto.mileageAfter||0, interval:+dto.interval||5000,
      nextMileage:(+dto.mileageAfter|| +dto.mileageBefore||v.mileage||0)+(+dto.interval||5000) } };
    var res=App.services.finalizeInvoice({ items:items, payments:dto.payments||[{method:"cash",amount: total0*(1+((biz().tax||{}).enabled?((+(biz().tax||{}).rate||0)/100):0)) }],
      taxOn:true, customer:{ name:cust.name||"", plate:v.plate }, note:dto.note||"", source:"oil", memo:"تغيير زيت — "+v.plate, meta:meta });
    if(!res.ok) return res;
    // update vehicle
    if(meta.oil.mileageAfter) v.mileage=meta.oil.mileageAfter;
    v.lastOilDate=res.invoice.date; v.lastServiceDate=res.invoice.date; v.nextOilMileage=meta.oil.nextMileage;
    if(dto.oilType) v.oilType=dto.oilType;
    v.history=v.history||[]; v.history.push({ date:res.invoice.date, type:"oil", ref:res.invoice.no, mileage:v.mileage, note:(dto.oilBrand||"")+" "+(dto.oilGrade||"") });
    // reminder
    state.reminders=state.reminders||[];
    state.reminders.push({ id:uid(), type:"oil", vehicleId:v.id, plate:v.plate, customerId:cust.id, atMileage:meta.oil.nextMileage, date:res.invoice.date, done:false, msg:"تغيير الزيت القادم عند "+meta.oil.nextMileage+" كم" });
    return { ok:true, invoice:res.invoice, vehicle:v };
  };
})(window.App);
