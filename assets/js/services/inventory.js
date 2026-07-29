/* services/inventory.js — inventory use-cases. The only writer of state.inventory.
 *
 * Every stock movement posts a balanced journal entry (when accounting is on):
 *   opening / receive  → Dr Inventory, Cr Cash (or Owner Equity for opening)
 *   sale consumption    → Dr COGS,      Cr Inventory
 *   shrinkage (adjust-) → Dr Expense,   Cr Inventory
 *   surplus  (adjust+)  → Dr Inventory, Cr Owner Equity
 * All operations are no-ops when the `inventory` module is disabled. */
(function (App) {
  "use strict";
  function on(){ return App.core.featureEnabled("inventory"); }
  function ensure(){ if(!state.inventory) state.inventory={products:[],categories:[],suppliers:[],movements:[]}; return state.inventory; }
  function logMove(m){ ensure().movements.push(Object.assign({ id:uid(), date:iso(new Date()) }, m)); }
  function post(memo, ref, dr, cr, amount, date){
    if(amount>0 && App.services.postEntry) App.services.postEntry({ date:date, ref:ref, memo:memo, source:"inventory", lines:[ {account:dr, debit:amount}, {account:cr, credit:amount} ] });
  }

  App.services.addProduct = function (dto) {
    if(!on()) return { ok:false, error:"disabled" };
    dto = dto||{}; var name=(dto.name||"").trim(); if(!name) return { ok:false, error:"name_required" };
    var price=+dto.price||0; if(!(price>0)) return { ok:false, error:"invalid_price" };
    var inv=ensure();
    var p = { id:uid(), sku:(dto.sku||"").trim()||("P"+(inv.products.length+1)), name:name, category:dto.category||"أخرى",
      cost:+dto.cost||0, price:price, qty:+dto.qty||0, min:(dto.min!=null?+dto.min:INV_LOW_STOCK_DEFAULT), unit:dto.unit||"قطعة",
      barcode:(dto.barcode||"").trim(), expiry:dto.expiry||"", supplier:dto.supplier||"" };
    inv.products.push(p);
    if(p.qty>0){ logMove({ productId:p.id, type:"in", qty:p.qty, cost:p.cost, ref:"رصيد افتتاحي" });
      post("رصيد افتتاحي — "+name, p.sku, ACCT.INVENTORY, ACCT.EQUITY, p.qty*p.cost); }
    return { ok:true, product:p };
  };
  App.services.updateProduct = function (id, dto) {
    if(!on()) return { ok:false, error:"disabled" };
    var p=App.core.invProduct(id); if(!p) return { ok:false, error:"not_found" };
    ["name","category","unit","barcode","expiry","supplier"].forEach(k=>{ if(dto[k]!=null) p[k]=dto[k]; });
    ["cost","price","min"].forEach(k=>{ if(dto[k]!=null) p[k]=+dto[k]||0; });
    return { ok:true, product:p };
  };
  App.services.deleteProduct = function (id) {
    if(!on()) return { ok:false }; var inv=ensure(); inv.products=inv.products.filter(p=>p.id!==id); return { ok:true };
  };
  /* stock IN (purchase / receive) — weighted-average cost so the on-hand valuation
     stays equal to the booked inventory balance. */
  App.services.receiveStock = function (dto) {
    if(!on()) return { ok:false, error:"disabled" };
    var p=App.core.invProduct(dto.productId); if(!p) return { ok:false, error:"not_found" };
    var qty=+dto.qty||0; if(!(qty>0)) return { ok:false, error:"invalid_qty" };
    var oldQty=+p.qty||0, oldCost=+p.cost||0;
    var recvCost=(dto.cost!=null && dto.cost!=="")?+dto.cost:oldCost;
    var newQty=oldQty+qty;
    p.qty=newQty;
    p.cost = newQty>0 ? (oldQty*oldCost + qty*recvCost)/newQty : recvCost;   // weighted average
    logMove({ productId:p.id, type:"in", qty:qty, cost:recvCost, ref:dto.supplier||"استلام" });
    post("استلام مخزون — "+p.name, p.sku, ACCT.INVENTORY, PAY_ACCOUNT.cash, qty*recvCost, dto.date);
    if(App.services.audit) App.services.audit("استلام مخزون", p.name+" +"+qty);
    return { ok:true, product:p };
  };
  /* physical count adjustment (sets a new quantity) */
  App.services.adjustStock = function (dto) {
    if(!on()) return { ok:false, error:"disabled" };
    var p=App.core.invProduct(dto.productId); if(!p) return { ok:false, error:"not_found" };
    var newQty=+dto.qty; if(isNaN(newQty)||newQty<0) return { ok:false, error:"invalid_qty" };
    var diff=newQty-(+p.qty||0); p.qty=newQty;
    logMove({ productId:p.id, type:"adjust", qty:diff, cost:p.cost, ref:dto.reason||"جرد" });
    var val=Math.abs(diff)*(+p.cost||0);
    if(diff<0) post("جرد نقص — "+p.name, p.sku, ACCT.EXP, ACCT.INVENTORY, val);
    else if(diff>0) post("جرد زيادة — "+p.name, p.sku, ACCT.INVENTORY, ACCT.EQUITY, val);
    if(App.services.audit) App.services.audit("جرد مخزون", p.name+" → "+newQty);
    return { ok:true, product:p, diff:diff };
  };
  /* stock OUT (consumed by a sale/POS) — posts COGS. Returns ok even if module off (silent) */
  App.services.consumeStock = function (dto) {
    if(!on()) return { ok:false, error:"disabled" };
    var p=App.core.invProduct(dto.productId); if(!p) return { ok:false, error:"not_found" };
    var qty=+dto.qty||0; if(!(qty>0)) return { ok:false, error:"invalid_qty" };
    p.qty=Math.max(0,(+p.qty||0)-qty);
    logMove({ productId:p.id, type:"out", qty:-qty, cost:p.cost, ref:dto.ref||"بيع" });
    post("تكلفة بضاعة — "+p.name, dto.ref||p.sku, ACCT.COGS, ACCT.INVENTORY, qty*(+p.cost||0), dto.date);
    return { ok:true, product:p };
  };
  App.services.addSupplier = function (dto) {
    if(!on()) return { ok:false }; var name=(dto.name||"").trim(); if(!name) return { ok:false, error:"name_required" };
    ensure().suppliers.push({ id:uid(), name:name, phone:(dto.phone||"").trim() }); return { ok:true };
  };
  App.services.deleteSupplier = function (id) { if(!on()) return { ok:false }; var inv=ensure(); inv.suppliers=inv.suppliers.filter(s=>s.id!==id); return { ok:true }; };
})(window.App);
