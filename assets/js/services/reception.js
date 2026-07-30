/* services/reception.js — customer self-service intake from the Welcome screen.
   A customer (before any login) picks a service, leaves their name + phone, and
   optionally an interest in a membership. It is stored as a lead on the active
   business's workspace; staff act on it from the Operations Center. */
(function (App) {
  "use strict";
  App.services.submitServiceRequest = function (dto) {
    dto = dto || {};
    var name = (dto.name || "").trim();
    var phone = (dto.phone || "").trim();
    if (name.length < 2) return { ok:false, error:"name" };
    if (!phone || !App.core.validPhone(phone)) return { ok:false, error:"phone" };
    state.serviceRequests = state.serviceRequests || [];
    var req = {
      id: uid(), name: name, phone: phone,
      service: dto.service || "", serviceLabel: dto.serviceLabel || "",
      plan: dto.plan || "", planLabel: dto.planLabel || "",
      date: iso(new Date()), status: "pending"
    };
    state.serviceRequests.push(req);
    if (App.services.audit) App.services.audit("طلب زبون", name + " · " + (dto.serviceLabel || "") + (dto.planLabel ? " · " + dto.planLabel : ""));
    saveLocal();
    return { ok:true, request: req };
  };
  App.services.markRequestDone = function (id) {
    var r = (state.serviceRequests || []).find(function (x) { return x.id === id; });
    if (!r) return { ok:false };
    r.status = "done"; r.doneAt = iso(new Date()); saveLocal();
    return { ok:true };
  };
})(window.App);
