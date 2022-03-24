/**
 * Securely generate random tokens and verify them.
 */

import crypto from "crypto";
import { buffersEqual } from "./buffer";

interface TokenAndHash {
  token: string;
  hashedToken: string;
}

function hashTokenAsBuffer(tokenBytes: Buffer) {
  return crypto.createHash("sha512").update(tokenBytes).digest();
}

/**
 * Hash a token. If you are hashing a token to compare it to a known hashed
 * token, use validateToken instead to prevent timing attacks.
 */
function hashToken(token: string) {
  return hashTokenAsBuffer(Buffer.from(token, "hex")).toString("hex");
}

/**
 * Generate a random token and corresponding hash. The token should be sent to
 * the user, and the hash should be stored in the database.
 */
function generateToken(): TokenAndHash {
  const tokenBytes = crypto.randomBytes(32);
  const hashedTokenBytes = hashTokenAsBuffer(tokenBytes);
  return {
    token: tokenBytes.toString("hex"),
    hashedToken: hashedTokenBytes.toString("hex"),
  }
}

/**
 * Validate the user-provided token against the original hash.
 * @returns Whether the token is valid.
 */
function validateToken(providedToken: string, hashedToken: string): boolean {
  const providedTokenBytes = Buffer.from(providedToken, "hex");
  const hashedTokenBytes = Buffer.from(hashedToken, "hex");

  return buffersEqual(hashTokenAsBuffer(providedTokenBytes), hashedTokenBytes);
}

export {
  generateToken,
  hashToken,
  validateToken,
}
