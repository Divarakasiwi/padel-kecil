/**
 * Session cookie untuk host & barista (signed, server-only).
 * Butuh SESSION_SECRET di env.
 */

import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME_HOST = "padel_host";
const COOKIE_NAME_BARISTA = "padel_barista";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 jam

function getSecret() {
  return process.env.SESSION_SECRET || "";
}

function sign(payload) {
  const secret = getSecret();
  if (!secret) return null;
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

function verify(signedValue) {
  const secret = getSecret();
  if (!secret) return null;
  const dot = signedValue.indexOf(".");
  if (dot === -1) return null;
  const payloadB64 = signedValue.slice(0, dot);
  const sig = signedValue.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createHostCookie() {
  return sign({ role: "host", exp: Date.now() + MAX_AGE_MS });
}

export function createBaristaCookie() {
  return sign({ role: "barista", exp: Date.now() + MAX_AGE_MS });
}

export function verifyHostCookie(cookieValue) {
  const p = verify(cookieValue);
  return p && p.role === "host";
}

export function verifyBaristaCookie(cookieValue) {
  const p = verify(cookieValue);
  return p && p.role === "barista";
}

export function getHostCookieName() {
  return COOKIE_NAME_HOST;
}

export function getBaristaCookieName() {
  return COOKIE_NAME_BARISTA;
}
