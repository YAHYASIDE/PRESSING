/* pages/features.js — Settings ▸ Feature Modules UI (pure render from the registry + state).
   Wiring (toggle + config change handlers) lives in app.js bindFeatureModules(). */

/* the conditional rule fields for the loyalty module, for the currently selected strategy */
function loyaltyConfigHTML(cfg){
  cfg=cfg||featureCfg("loyalty");
  const strat=cfg.strategy||"stamp";
  const pills=LOYALTY_STRATEGIES.map(s=>
    `<button type="button" class="strat-pill ${strat===s.k?'on':''}" data-loy-strat="${s.k}">${s.label}</button>`).join("");
  const hint=(LOYALTY_STRATEGIES.find(s=>s.k===strat)||{}).hint||"";
  const fields=LOYALTY_FIELDS.filter(f=>f.strat===strat).map(f=>{
    const v=(cfg[f.key]!==undefined?cfg[f.key]:f.def);
    const attrs=[f.min!=null?`min="${f.min}"`:"",f.max!=null?`max="${f.max}"`:""].join(" ");
    return `<div class="field"><label>${f.label}</label>
      <input class="loy-field" data-loy-field="${f.key}" type="${f.type}" ${attrs} value="${(v===undefined||v===null)?"":String(v).replace(/"/g,"&quot;")}"></div>`;
  }).join("");
  return `<div class="fm-cfg" data-cfg="loyalty">
    <div class="field"><label>نظام المكافأة</label><div class="strat-pills">${pills}</div><div class="hint">${hint}</div></div>
    <div class="loy-fields">${fields}</div>
  </div>`;
}

function featureModulesHTML(){
  const items=FEATURE_MODULES.map(m=>{
    const cfg=featureCfg(m.key);
    const on=!!cfg.enabled;
    const soon=!!m.comingSoon;
    const toggle=`<label class="switch ${soon?'disabled':''}">
      <input type="checkbox" data-feat="${m.key}" ${on?"checked":""} ${soon?"disabled":""}>
      <span class="slider"></span></label>`;
    const cfgPanel=(m.configurable && on)?loyaltyConfigHTML(cfg):"";
    return `<div class="fm-item ${on?'on':''}">
      <div class="fm-head">
        <span class="fm-ic">${svg(I[m.icon]||I.gear)}</span>
        <div class="fm-meta">
          <div class="fm-label">${m.label}${soon?` <span class="fm-soon">قريبًا</span>`:""}</div>
          <div class="fm-desc">${m.desc}</div>
        </div>
        ${toggle}
      </div>
      ${cfgPanel}
    </div>`;
  }).join("");
  return `<div class="fm-list">${items}</div>`;
}

Object.assign(App.pages, { featureModulesHTML, loyaltyConfigHTML });
