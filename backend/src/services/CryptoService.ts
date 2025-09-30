import crypto from "node:crypto";

import bcrypt from "bcrypt";

const BCRYPT_SALT_ROUNDS = 10;

class CryptoService {
  generatePassword(): string {
    // What we use here doesn't really matter, as long as it's random.
    return this.generateToken();
  }

  hashPassword(password: string): string {
    return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
  }

  verifyPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  hashToken(token: string): string {
    return crypto.createHash("sha512").update(token, "hex").digest().toString("hex");
  }

  verifyToken(token: string, hash: string): boolean {
    return this.hashToken(token) === hash;
  }
}

export default new CryptoService();
