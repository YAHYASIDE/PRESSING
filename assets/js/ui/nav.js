/* ui/nav.js — sidebar navigation renderer */
/* ================= Nav ================= */
function renderNav(){
  const unpaid=state.carpetOrders.filter(o=>o.status!=="done").length;
  const allItems=[
    {id:"dashboard",label:"الرئيسية",icon:I.home},
    {id:"cars",label:"العمليات",icon:I.car},
    {id:"carpets",label:"السجاد",icon:I.rug,badge:unpaid},
    {id:"expenses",label:"المصروفات",icon:I.wallet},
    {id:"reports",label:"التقارير",icon:I.chart}
  ];
  // Release 4/5 — show tabs allowed by role AND by the business configuration
  // (business type gates cars/carpets; accounting feature gates reports).
  const allowed=App.core.roleTabs();
  const items=allItems.filter(it=>allowed.indexOf(it.id)>=0 && App.core.tabVisible(it.id));
  const nav=document.getElementById("nav");
  nav.classList.toggle("solo", items.length<=1);
  nav.innerHTML=items.map(it=>`
    <button class="nav-btn ${(!state.opDetail&&state.tab===it.id)?'active':''}" data-tab="${it.id}">
      ${svg(it.icon)}<span>${it.label}</span>${it.badge?`<span class="nav-badge">${it.badge}</span>`:''}
    </button>`).join("");
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{ state.opDetail=null; state.tab=b.dataset.tab; render(); });
}


/* ---- Commit 4: namespace registration ---- */
Object.assign(App.ui, { renderNav });
