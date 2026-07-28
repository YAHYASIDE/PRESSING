/**
 * One-time bootstrap for the FIRST platform-owner (super admin).
 *
 * Custom claims can only be set with the Admin SDK, and setSuperAdmin() itself
 * requires an existing super admin — so the very first one is set here.
 *
 * Usage:
 *   1. Create the account (email/password) in Firebase Auth (console or app).
 *   2. Download a service-account key from
 *      Project settings > Service accounts > Generate new private key.
 *   3. GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
 *        node scripts/bootstrap-superadmin.js owner@example.com
 */
const admin = require("firebase-admin");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/bootstrap-superadmin.js <email>");
  process.exit(1);
}

admin.initializeApp();

(async () => {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { superAdmin: true });
  console.log(`OK: ${email} (uid ${user.uid}) is now a platform owner (superAdmin).`);
  console.log("They must sign out and back in for the claim to take effect.");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
