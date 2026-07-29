/* services/car-wash.js — use-case: create a car-wash operation.
 *
 * Application service (proof of the layered architecture). It receives a plain
 * DTO, validates it, generates identifiers, updates the store, and returns a
 * result object. It NEVER touches the DOM, render(), dialogs, toasts, document,
 * or any UI helper — only the domain layer (validPhone, uid, carNo,
 * chosenDateIso, iso) and the store (state).
 *
 * DTO (input):
 *   { vehicle, plate, phone, country, wash, price, dateStr, deferred, by,
 *     photosBefore, photosAfter }
 * Result:
 *   { ok:false, error:"invalid_phone"|"invalid_price" }
 *   { ok:true, op, free, deferred, cardComplete }
 */
(function (App) {
  "use strict";

  App.services.createCarWash = function (input) {
    input = input || {};
    var vehicle = input.vehicle;
    var plate = (input.plate || "").trim();
    var phone = (input.phone || "").trim();
    var country = input.country || "222";
    var wash = input.wash || "";
    var by = input.by || "";
    var dateStr = input.dateStr;
    var note = (input.note || "").toString();
    var photosBefore = Array.isArray(input.photosBefore) ? input.photosBefore.slice() : [];
    var photosAfter = Array.isArray(input.photosAfter) ? input.photosAfter.slice() : [];

    // A wash is free when the customer's loyalty card is complete (4 stamps).
    var existing = plate ? state.customers[plate] : null;
    var free = !!(existing && existing.stamps === 4);
    var price = +input.price;
    var deferred = !free && !!input.deferred;

    // ---- validation ----
    if (!validPhone(phone)) return { ok: false, error: "invalid_phone" };
    if (!free && !(price > 0)) return { ok: false, error: "invalid_price" };

    // ---- update store ----
    // learn the last entered price as this vehicle type's default
    if (!free) state.vehiclePrices[vehicle] = price;

    // loyalty card
    if (plate) {
      var c = state.customers[plate] || { plate: plate, stamps: 0, totalWashes: 0, freeWashes: 0 };
      if (phone) { c.phone = phone; c.country = country; }
      if (free) { c.stamps = 0; c.freeWashes++; } else c.stamps++;
      c.totalWashes++; c.lastVisit = iso(new Date());
      state.customers[plate] = c;
    }

    // ---- generate identifiers + create the operation ----
    var opDate = chosenDateIso(dateStr);
    var op = {
      id: uid(), no: carNo(vehicle), vehicle: vehicle, wash: wash,
      price: free ? 0 : price, plate: plate, phone: phone, country: country,
      free: free, by: by, paid: !deferred, paidDate: deferred ? null : opDate,
      note: note, stage: "received", timeline: [{ stage: "received", at: Date.now() }],
      photosBefore: photosBefore, photosAfter: photosAfter, date: opDate
    };
    state.carOps.push(op);

    var cardComplete = !!(plate && state.customers[plate].stamps === 4);
    return { ok: true, op: op, free: free, deferred: deferred, cardComplete: cardComplete };
  };

  /* Release 2 — advance/set a car operation's lifecycle stage.
     DTO: { id, stage }  (stage may be "__next__" to move one step forward).
     Pure: no DOM/render/toast; returns a typed Result. */
  App.services.setCarStage = function (input) {
    input = input || {};
    var o = (state.carOps || []).find(function (x) { return x.id === input.id; });
    if (!o) return { ok: false, error: "not_found" };
    var keys = CAR_STAGES.map(function (s) { return s.k; });
    var stage = input.stage;
    if (stage === "__next__") {
      var i = keys.indexOf(o.stage || "received");
      stage = keys[Math.min(i + 1, keys.length - 1)];
    }
    if (keys.indexOf(stage) < 0) return { ok: false, error: "invalid_stage" };
    var prev = o.stage || "received";
    o.stage = stage;
    // every stage transition appends a timeline event (auto-recorded)
    if (!Array.isArray(o.timeline)) o.timeline = [];
    if (o.timeline.length === 0) o.timeline.push({ stage: prev, at: Date.now() });
    if (stage !== prev) o.timeline.push({ stage: stage, at: Date.now() });
    if (stage === "delivered" && !o.deliveredDate) o.deliveredDate = iso(new Date());
    return { ok: true, op: o, stage: stage };
  };

  /* Release 3 — deliver an operation: record payment method, close it, stamp the timeline.
     DTO: { id, method }  where method ∈ cash|bank|mobile|credit.
     Pure: updates the store, returns a typed Result. */
  App.services.deliverOperation = function (input) {
    input = input || {};
    var o = (state.carOps || []).find(function (x) { return x.id === input.id; });
    if (!o) return { ok: false, error: "not_found" };
    var method = input.method || "cash";
    App.services.setCarStage({ id: o.id, stage: "delivered" });   // stage + timeline
    o.paymentMethod = method;
    if (method === "credit") { o.paid = false; o.paidDate = null; }
    else { o.paid = true; if (!o.paidDate) o.paidDate = iso(new Date()); }
    return { ok: true, op: o, method: method };
  };
})(window.App);
