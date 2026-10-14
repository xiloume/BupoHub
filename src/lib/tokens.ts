import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Génère un token aléatoire URL-safe (par défaut 32 octets → 43 caractères). */
export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Hash SHA-256 d'un token : seule cette valeur est stockée en base. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Hash HMAC d'un token avec un secret : rend inutilisable une fuite de la base seule. */
export function hmacToken(token: string, secret: string) {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Génère une clé API lisible : préfixe + secret. Retourne la clé en clair et son préfixe. */
export function generateApiKey() {
  const prefix = `bh_${randomBytes(4).toString("hex")}`;
  const secret = randomBytes(32).toString("base64url");
  return { key: `${prefix}.${secret}`, prefix };
}
