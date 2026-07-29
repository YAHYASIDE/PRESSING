/* pages/customers.js — Customer loyalty cards + customer WhatsApp (extracted from index.html) */
function loyaltyStamps(s){
  let h='';
  for(let i=1;i<=4;i++) h+=`<span class="stamp ${i<=s?'filled':''}">${i<=s?'✓':i}</span>`;
  h+=`<span class="stamp free ${s>=4?'ready':''}">${svg(I.gift)}</span>`;
  return h;
}
function loyaltyCardHTML(plate){
  const c=state.customers[plate];
  const s=c?c.stamps:0, due=s===4;
  const note=!c?'زبون جديد — بعد 4 غسلات تكون الخامسة مجانية'
    : due?'اكتملت البطاقة — هذه الغسلة مجانية 🎁'
    : `متبقٍ ${4-s} ${4-s===1?'غسلة':'غسلات'} ثم غسلة مجانية`;
  return `<div class="lc-title">بطاقة الولاء${c?` — ${c.totalWashes} غسلة، ${c.freeWashes} مجانية`:' (جديدة)'}</div>
    <div class="stamps">${loyaltyStamps(s)}</div>
    <div class="lc-note ${due?'free':''}">${note}</div>`;
}

function openWaCust(c){
  const ph=waPhoneFull(c.phone,c.country); if(!ph){ toast("لا يوجد رقم هاتف لهذا الزبون"); return; }
  const s=c.stamps||0;
  const line=s===4?"غسلتك القادمة مجانية":`بعد ${4-s} غسلات لديك غسلة مجانية`;
  const msg=`${waHead()}\nبطاقة الولاء${c.plate?` — لوحة ${c.plate}`:""}\nلديك ${s} من 5 أختام\n${line}\n${waFoot()}`;
  window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`,"_blank");
}

/* ---- Commit 4: namespace registration ---- */
Object.assign(App.pages, { loyaltyStamps, loyaltyCardHTML, openWaCust });
