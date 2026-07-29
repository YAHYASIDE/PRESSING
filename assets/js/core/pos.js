/* core/pos.js — pure POS cart math + invoice numbering. No DOM/services. */
function posState(){ return state.pos || {cart:[],discount:0,discType:"amount",taxOn:true,payments:[]}; }
function posCart(){ return posState().cart || []; }
function cartCount(){ return posCart().reduce((s,i)=>s+(+i.qty||0),0); }
function cartSubtotal(){ return posCart().reduce((s,i)=>s+(+i.price||0)*(+i.qty||0),0); }
function cartDiscountAmt(){
  const p=posState(), sub=cartSubtotal();
  const amt = p.discType==="percent" ? sub*(+p.discount||0)/100 : (+p.discount||0);
  return Math.max(0, Math.min(sub, Math.round(amt*100)/100));
}
function cartNet(){ return cartSubtotal()-cartDiscountAmt(); }
function cartTaxRate(){ const t=(biz().tax||{}); return (posState().taxOn && t.enabled) ? (+t.rate||0) : 0; }
function cartTaxAmt(){ return Math.round(cartNet()*cartTaxRate())/100; }
function cartTotal(){ return Math.round((cartNet()+cartTaxAmt())*100)/100; }
function paymentsTotal(){ return (posState().payments||[]).reduce((s,p)=>s+(+p.amount||0),0); }
function paymentsDue(){ return Math.round((cartTotal()-paymentsTotal())*100)/100; }
function invNo(seq,dateISO){ const d=new Date(dateISO); return "INV-"+d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+"-"+String(seq).padStart(4,"0"); }
/* invoice financial rollups for reports */
function invoicesIn(filter){ return (state.invoices||[]).filter(i=>i.status!=="held").filter(i=>filter?filter(i.date):true); }
function invoiceRefunded(inv){ return (inv.refunds||[]).reduce((s,r)=>s+(+r.amount||0),0); }

Object.assign(App.core, { posState, posCart, cartCount, cartSubtotal, cartDiscountAmt, cartNet, cartTaxRate, cartTaxAmt, cartTotal, paymentsTotal, paymentsDue, invNo, invoicesIn, invoiceRefunded });
