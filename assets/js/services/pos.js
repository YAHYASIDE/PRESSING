/* services/pos.js — POS use-cases. Sole writer of state.invoices + state.pos cart.
 * Checkout posts a balanced sale entry (payments → revenue + tax), consumes
 * inventory (COGS via consumeStock), and links the customer. Refunds reverse the
 * entry and restock. No-op when the `pos` module is disabled. */
(function (App) {
  "use strict";
  function on(){ return App.core.featureEnabled("pos"); }
  function freshCart(prev){ prev=prev||{}; return { cart:[], discount:0, discType:prev.discType||"amount", taxOn:(prev.taxOn!==false), note:"", customer:{name:"",plate:""}, payments:[], coupon:"" }; }
  function snap(cart){ return cart.map(function(i){ return { kind:i.kind, refId:i.refId, name:i.name, qty:+i.qty||0, price:+i.price||0, cost:+i.cost||0 }; }); }

  /* Shared invoice finalizer — the single path that turns a set of line items +
     payments into a posted invoice. Used by POS checkout AND the Oil-Change
     module, so the sale/accounting/inventory logic is never duplicated.
     dto: { items[], payments[], discount, discType, taxOn, customer, note,
            coupon, meta, source, memo, date }. */
  App.services.finalizeInvoice = function (dto) {
    if(!on()) return { ok:false, error:"disabled" };
    dto = dto||{};
    var items = (dto.items||[]).map(function(i){ return { kind:i.kind, refId:i.refId||null, name:i.name, qty:+i.qty||0, price:+i.price||0, cost:+i.cost||0 }; }).filter(function(i){ return i.qty>0; });
    if(!items.length) return { ok:false, error:"empty" };
    var sub = items.reduce(function(s,i){ return s+i.price*i.qty; },0);
    var discAmt = dto.discType==="percent" ? sub*(+dto.discount||0)/100 : (+dto.discount||0);
    discAmt = Math.max(0, Math.min(sub, Math.round(discAmt*100)/100));
    var net = Math.round((sub-discAmt)*100)/100;
    var taxRate = (dto.taxOn!==false && (biz().tax||{}).enabled) ? (+(biz().tax||{}).rate||0) : 0;
    var tax = Math.round(net*taxRate)/100;
    var total = Math.round((net+tax)*100)/100;
    var payments = (dto.payments||[]).filter(function(p){ return +p.amount>0; }).map(function(p){ return { method:p.method, amount:+p.amount }; });
    var paid = payments.reduce(function(s,p){ return s+p.amount; },0);
    var credit = Math.round((total-paid)*100)/100; if(credit<0) credit=0;
    if(paid<=0 && credit<=0) return { ok:false, error:"no_payment" };
    state.invoiceSeq=(state.invoiceSeq||0)+1;
    var date=dto.date||iso(new Date());
    var cust={ name:((dto.customer&&dto.customer.name)||"").trim(), plate:((dto.customer&&dto.customer.plate)||"").trim() };
    var inv={ id:uid(), no:App.core.invNo(state.invoiceSeq,date), date:date, status: credit>0.009 ? "credit" : "paid",
      items:items, subtotal:sub, discount:discAmt, discType:dto.discType, discInput:dto.discount, coupon:dto.coupon||"",
      tax:tax, taxRate:taxRate, taxLabel:(biz().tax||{}).label||"ضريبة", total:total,
      payments:payments, credit:credit, customer:cust, note:dto.note||"", by:currentUser, source:dto.source||"pos", meta:dto.meta||null, refunds:[] };
    // Accounting — payments debit their accounts, remainder → receivable; credit revenue + tax
    var lines=[];
    payments.forEach(function(pm){ lines.push({ account:(pm.method==="credit"?ACCT.AR:(PAY_ACCOUNT[pm.method]||PAY_ACCOUNT.cash)), debit:pm.amount }); });
    if(credit>0.009) lines.push({ account:ACCT.AR, debit:credit });
    lines.push({ account:ACCT.REVENUE, credit:net });
    if(tax>0.009) lines.push({ account:ACCT.TAX, credit:tax });
    if(App.services.postEntry){ var je=App.services.postEntry({ date:date, ref:inv.no, memo:dto.memo||"فاتورة بيع", source:"sale", lines:lines }); if(je&&je.ok) inv.je=je.entry.id; }
    // Inventory — consume product lines (posts COGS + decrements stock)
    if(App.services.consumeStock) items.forEach(function(i){ if(i.kind==="product"&&i.refId) App.services.consumeStock({ productId:i.refId, qty:i.qty, ref:inv.no, date:date }); });
    items.forEach(function(i){ if(i.kind==="service"){ state.posServicePrices=state.posServicePrices||{}; state.posServicePrices[i.name]=+i.price||0; } });
    // Customer link (single source of truth) — resolve the OWNER of the plate so a
    // secondary vehicle's plate does not spawn a duplicate customer.
    if(cust.plate){
      var c=(App.core.customerOfPlate?App.core.customerOfPlate(cust.plate):null);
      if(!c){ c={plate:cust.plate,id:"cust"+cust.plate,stamps:0,totalWashes:0,freeWashes:0}; state.customers[cust.plate]=c; }
      if(!c.id) c.id="cust"+(c.plate||cust.plate); c.lastVisit=date; if(cust.name && !c.name) c.name=cust.name; if(!c.registeredAt) c.registeredAt=date;
    }
    state.invoices=state.invoices||[]; state.invoices.push(inv);
    return { ok:true, invoice:inv };
  };

  App.services.checkoutInvoice = function () {
    if(!on()) return { ok:false, error:"disabled" };
    var pos=state.pos||{};
    var res=App.services.finalizeInvoice({ items:pos.cart||[], payments:pos.payments||[], discount:pos.discount, discType:pos.discType,
      taxOn:pos.taxOn!==false, customer:pos.customer, note:pos.note, coupon:pos.coupon, source:"pos" });
    if(res.ok) state.pos=freshCart(pos);
    return res;
  };

  App.services.holdInvoice = function () {
    if(!on()) return { ok:false }; var pos=state.pos||{}; if(!(pos.cart||[]).length) return { ok:false, error:"empty" };
    state.invoiceSeq=(state.invoiceSeq||0)+1; var date=iso(new Date());
    var inv={ id:uid(), no:App.core.invNo(state.invoiceSeq,date), date:date, status:"held",
      items:snap(pos.cart), subtotal:App.core.cartSubtotal(), discount:App.core.cartDiscountAmt(), discType:pos.discType, discInput:pos.discount,
      tax:App.core.cartTaxAmt(), total:App.core.cartTotal(), taxOn:pos.taxOn!==false, customer:pos.customer||{name:"",plate:""}, note:pos.note||"", refunds:[] };
    state.invoices=state.invoices||[]; state.invoices.push(inv);
    state.pos=freshCart(pos);
    return { ok:true, invoice:inv };
  };
  App.services.resumeInvoice = function (id) {
    if(!on()) return { ok:false }; var inv=(state.invoices||[]).find(function(x){ return x.id===id; }); if(!inv||inv.status!=="held") return { ok:false };
    state.pos={ cart:inv.items.map(function(i){ return { lid:uid(), kind:i.kind, refId:i.refId, name:i.name, qty:i.qty, price:i.price, cost:i.cost }; }),
      discount:inv.discInput||0, discType:inv.discType||"amount", taxOn:inv.taxOn!==false, note:inv.note||"", customer:inv.customer||{name:"",plate:""}, payments:[], coupon:"" };
    state.invoices=state.invoices.filter(function(x){ return x.id!==id; });
    return { ok:true };
  };
  App.services.cancelHeld = function (id) { if(!on()) return {ok:false}; state.invoices=(state.invoices||[]).filter(function(x){ return x.id!==id; }); return { ok:true }; };
  App.services.duplicateInvoice = function (id) {
    if(!on()) return { ok:false }; var inv=(state.invoices||[]).find(function(x){ return x.id===id; }); if(!inv) return { ok:false };
    state.pos={ cart:inv.items.map(function(i){ return { lid:uid(), kind:i.kind, refId:i.refId, name:i.name, qty:i.qty, price:i.price, cost:i.cost }; }),
      discount:inv.discInput||0, discType:inv.discType||"amount", taxOn:true, note:"", customer:inv.customer||{name:"",plate:""}, payments:[], coupon:"" };
    return { ok:true };
  };
  /* refund (full or partial by amount); reverses revenue/tax/cash, restocks on full refund */
  App.services.refundInvoice = function (id, amount) {
    if(!on()) return { ok:false }; var inv=(state.invoices||[]).find(function(x){ return x.id===id; });
    if(!inv || inv.status==="held") return { ok:false, error:"not_found" };
    var already=App.core.invoiceRefunded(inv); var maxR=Math.round((inv.total-already)*100)/100;
    amount=(amount==null||amount==="")?maxR:Math.min(+amount||0,maxR); amount=Math.round(amount*100)/100;
    if(!(amount>0)) return { ok:false, error:"invalid" };
    var full=(already===0) && Math.abs(amount-inv.total)<0.01;
    var ratio=inv.total>0?amount/inv.total:0;
    var netR=Math.round((inv.subtotal-inv.discount)*ratio*100)/100, taxR=Math.round(inv.tax*ratio*100)/100;
    if(App.services.postEntry){
      var lines=[{ account:ACCT.REVENUE, debit:netR }]; if(taxR>0.009) lines.push({ account:ACCT.TAX, debit:taxR });
      lines.push({ account:PAY_ACCOUNT.cash, credit:amount });
      var je=App.services.postEntry({ date:iso(new Date()), ref:inv.no, memo:"مرتجع فاتورة", source:"refund", lines:lines });
    }
    if(full){ // restock products + reverse COGS
      inv.items.forEach(function(i){ if(i.kind==="product"&&i.refId){ var p=App.core.invProduct(i.refId); if(p){ p.qty=(+p.qty||0)+i.qty;
        if(state.inventory&&state.inventory.movements) state.inventory.movements.push({ id:uid(), date:iso(new Date()), productId:p.id, type:"in", qty:i.qty, cost:i.cost, ref:"مرتجع "+inv.no });
        if(App.services.postEntry && i.cost>0) App.services.postEntry({ ref:inv.no, memo:"إرجاع مخزون — "+p.name, source:"inventory", lines:[{account:ACCT.INVENTORY,debit:i.qty*i.cost},{account:ACCT.COGS,credit:i.qty*i.cost}] }); } } });
    }
    inv.refunds=inv.refunds||[]; inv.refunds.push({ id:uid(), amount:amount, date:iso(new Date()), je:(je&&je.entry&&je.entry.id)||null, full:full });
    inv.status = (already+amount>=inv.total-0.01) ? "refunded" : "partial-refund";
    return { ok:true, amount:amount, full:full };
  };
})(window.App);
