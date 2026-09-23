import { auth } from "../firebase";

import type { DecodedIdToken } from "firebase-admin/auth";

class AuthService {
  async createSessionCookie(idToken: string, expiresInMs: number): Promise<string> {
    return auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken | null> {
    try {
      return auth.verifyIdToken(idToken);
    } catch {
      return null;
    }
  }

  async verifySessionCookie(cookie: string): Promise<DecodedIdToken | null> {
    try {
      return await auth.verifySessionCookie(cookie, true);
    } catch {
      return null;
    }
  }

  async revokeSessionCookie(uid: string): Promise<void> {
    await auth.revokeRefreshTokens(uid);
  }
}

export default new AuthService();
