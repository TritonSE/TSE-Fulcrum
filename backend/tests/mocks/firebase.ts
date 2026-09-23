export const auth = {
  createSessionCookie: jest.fn(),
  verifyIdToken: jest.fn(),
  verifySessionCookie: jest.fn(),
  revokeRefreshTokens: jest.fn(),
};

export const firebaseBucket = {
  file: jest.fn(),
};
