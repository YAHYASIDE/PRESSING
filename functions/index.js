/**
 * Pressing SaaS — backend for identity, roles and tenant provisioning.
 *
 * Custom claims can only be set with the Admin SDK, so ALL identity/role
 * mutations live here. The web app and admin console never write claims or
 * users/{uid} directly (Firestore rules forbid it) — they call these
 * callable functions instead.
 *
 * Claim shape:
 *   { laundryId: <string>, role: 'manager' | 'supervisor' }   // tenant users
 *   { superAdmin: true }                                       // platform owner
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const auth = admin.auth();
const db = admin.firestore();

/* ------------------------------ helpers ------------------------------ */
function requireAuth(req) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  return req.auth;
}
function requireSuperAdmin(req) {
  const a = requireAuth(req);
  if (a.token.superAdmin !== true) throw new HttpsError("permission-denied", "Platform owner only.");
  return a;
}
function requireManager(req) {
  const a = requireAuth(req);
  const lid = a.token.laundryId;
  if (!lid || a.token.role !== "manager") throw new HttpsError("permission-denied", "Manager only.");
  return { auth: a, laundryId: lid };
}
function str(v, name, max = 200) {
  if (typeof v !== "string" || !v.trim()) throw new HttpsError("invalid-argument", `Missing ${name}.`);
  return v.trim().slice(0, max);
}

async function createTenantUser({ email, password, name, laundryId, role }) {
  const user = await auth.createUser({ email, password, displayName: name });
  await auth.setCustomUserClaims(user.uid, { laundryId, role });
  await db.doc(`users/${user.uid}`).set({
    laundryId, role, name, email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return user.uid;
}

/* ---------------------- platform-owner operations -------------------- */

// Provision a new laundry + its first Manager account. Super admin only.
exports.createLaundry = onCall(async (req) => {
  requireSuperAdmin(req);
  const d = req.data || {};
  const name = str(d.name, "name");
  const managerEmail = str(d.managerEmail, "managerEmail");
  const managerPassword = str(d.managerPassword, "managerPassword", 128);
  const managerName = str(d.managerName || "المدير", "managerName");
  const lang = d.lang === "fr" ? "fr" : "ar";

  const ref = db.collection("laundries").doc();
  await ref.set({
    name,
    address: (d.address || "").toString().slice(0, 300),
    phone: (d.phone || "").toString().slice(0, 40),
    logoUrl: "",
    lang,
    active: true,
    plan: d.plan || "standard",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  let managerUid;
  try {
    managerUid = await createTenantUser({
      email: managerEmail, password: managerPassword, name: managerName,
      laundryId: ref.id, role: "manager",
    });
  } catch (e) {
    await ref.delete().catch(() => {});
    throw new HttpsError("already-exists", e.message || "Could not create manager account.");
  }
  await ref.update({ ownerUid: managerUid });
  return { laundryId: ref.id, managerUid };
});

// Enable/suspend a laundry. Super admin only.
exports.setLaundryActive = onCall(async (req) => {
  requireSuperAdmin(req);
  const lid = str(req.data && req.data.laundryId, "laundryId");
  const active = !!(req.data && req.data.active);
  await db.doc(`laundries/${lid}`).update({ active });
  return { laundryId: lid, active };
});

// Grant/revoke the platform-owner claim on an existing account. Super admin only.
// The FIRST super admin must be bootstrapped out-of-band (see scripts/bootstrap-superadmin.js).
exports.setSuperAdmin = onCall(async (req) => {
  requireSuperAdmin(req);
  const email = str(req.data && req.data.email, "email");
  const on = req.data && req.data.enabled !== false;
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, on ? { superAdmin: true } : {});
  return { uid: user.uid, superAdmin: on };
});

/* -------------------------- manager operations ----------------------- */

// A Manager adds a Supervisor (or another Manager) to their OWN laundry.
exports.createTeamMember = onCall(async (req) => {
  const { laundryId } = requireManager(req);
  const d = req.data || {};
  const email = str(d.email, "email");
  const password = str(d.password, "password", 128);
  const name = str(d.name || "مشرف", "name");
  const role = d.role === "manager" ? "manager" : "supervisor";
  const uid = await createTenantUser({ email, password, name, laundryId, role });
  return { uid, role, laundryId };
});

// A Manager lists their laundry's team (managers/supervisors).
exports.listTeam = onCall(async (req) => {
  const { laundryId } = requireManager(req);
  const snap = await db.collection("users").where("laundryId", "==", laundryId).get();
  return { members: snap.docs.map((s) => ({ uid: s.id, ...s.data(), createdAt: undefined })) };
});
