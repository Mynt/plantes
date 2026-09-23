import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";

const [, , email] = process.argv;
if (!email) {
  console.error("Uso: node scripts/set-teacher-claim.js <email>");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  readFileSync(new URL("../serviceAccountKey.json", import.meta.url))
);

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { teacher: true });

console.log(`Claim teacher=true asignado a ${email} (uid ${user.uid}).`);
console.log(
  "El profesor debe cerrar sesión y volver a entrar para que el claim tenga efecto."
);
