/* ui/export.js — CSV export (pure builder in core.toCSV + a download helper). */
(function (App) {
  "use strict";
  function cell(v){ v=(v==null?"":String(v)); return /[",\n]/.test(v) ? ('"'+v.replace(/"/g,'""')+'"') : v; }
  function toCSV(header, rows){
    var lines=[];
    if(header && header.length) lines.push(header.map(cell).join(","));
    (rows||[]).forEach(function(r){ lines.push(r.map(cell).join(",")); });
    return lines.join("\n");
  }
  App.core.toCSV = toCSV;   // pure, testable
  App.ui.exportCSV = function(name, header, rows){
    var csv="﻿"+toCSV(header, rows);   // BOM so Excel reads Arabic correctly
    try{
      var blob=new Blob([csv], {type:"text/csv;charset=utf-8;"});
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a"); a.href=url; a.download=(name||"report")+".csv";
      document.body.appendChild(a); a.click();
      setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 120);
    }catch(e){ if(typeof toast==="function") toast("تعذّر التصدير"); }
  };
})(window.App);
