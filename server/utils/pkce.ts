// utils/pkce.ts
import crypto from "crypto";

export function generatePkcePair() {
  // 1) high-entropy code_verifier
  const codeVerifier = crypto
    .randomBytes(64)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // 2) SHA256 → base64url for code_challenge
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return { codeVerifier, codeChallenge };
}
