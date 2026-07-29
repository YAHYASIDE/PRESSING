/* services/audit.js — append-only audit trail. Every meaningful action logs here.
   Single writer; capped to keep storage bounded. */
(function (App) {
  "use strict";
  App.services.audit = function (action, detail) {
    if(!state.audit) state.audit=[];
    state.audit.push({ id:uid(), date:iso(new Date()), user:(typeof currentUser!=="undefined"?currentUser:"")||"", role:state.role||"", action:action||"", detail:detail||"" });
    if(state.audit.length>800) state.audit=state.audit.slice(-800);
  };
})(window.App);
