/**
 * Securely generate, hash, and verify passwords with scrypt.
 */

import crypto from "crypto";
import { buffersEqual } from "./buffer";

// Note: changing these constants will probably prevent previously hashed
// passwords from being verified.
const KEY_SIZE = 64;
const SALT_SIZE = 64;

interface HashedPassword {
  /**
   * Hex-encoded key bytes.
   */
  key: string;

  /**
   * Hex-encoded salt bytes.
   */
  salt: string;
}

/**
 * Generate a random password. This can be assigned to newly created users,
 * since they will need to reset their password anyway.
 */
function generateRandomPassword(): HashedPassword {
  // Generate a random string of printable characters.
  const randomPassword = crypto.randomBytes(32).toString("base64");
  return hashPassword(randomPassword);
}

/**
 * Hash a password with a randomly generated salt.
 * @returns The hashed password and random salt.
 */
function hashPassword(password: string): HashedPassword {
  const saltBytes = crypto.randomBytes(SALT_SIZE);
  const keyBytes = scrypt(password, saltBytes);
  return {
    key: keyBytes.toString("hex"),
    salt: saltBytes.toString("hex"),
  };
}

/**
 * Check if a password matches a previously hashed password.
 * @returns Whether the password is correct.
 */
function verifyPassword(password: string, key: string, salt: string): boolean {
  const keyBytes = Buffer.from(key, "hex");
  const saltBytes = Buffer.from(salt, "hex");
  return buffersEqual(keyBytes, scrypt(password, saltBytes));
}

/**
 * Wrapper for scrypt which uses the predefined key size and cost.
 */
function scrypt(password: string, saltBytes: Buffer) {
  // Normalize character representations so that equivalent strings are mapped
  // to the same byte sequence.
  // https://nodejs.org/docs/latest-v16.x/api/crypto.html#using-strings-as-inputs-to-cryptographic-apis
  password = password.normalize();
  return crypto.scryptSync(password, saltBytes, KEY_SIZE);
}

export {
  generateRandomPassword,
  hashPassword,
  verifyPassword,
}
