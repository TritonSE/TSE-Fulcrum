import { DateTime } from "luxon";
import UserModel from "../models/UserModel";
import { hashPassword, verifyPassword } from "../crypto/password";
import { generateToken, hashToken, validateToken } from "../crypto/token";
import { sendEmail } from "./emails";
import env from "../env";
import { generateRandomPassword } from "../crypto/password";
import { HydratedDocument } from "mongoose";
import { User } from "../models/UserModel";


/**
 * @returns A Date in the past.
 */
function expiredDate() {
  return new Date(0);
}

async function getUserBySessionToken(sessionToken: string) {
  const hashedSessionToken = hashToken(sessionToken);
  const user = await UserModel.findOne({ hashedSessionToken });
  if (user === null || user.sessionExpiration < new Date()) {
    // Session token invalid or session expired.
    return null;
  }
  return user;
}

interface LoginFields {
  email: string;
  password: string;
}

async function getUserByEmail(email: string) {
  const user = await UserModel.findOne({ email });
  if (user === null) {
    console.error(`User not found: ${email}`);
  }
  return user;
}

async function logIn({ email, password }: LoginFields): Promise<[string, HydratedDocument<User>] | [null, null]> {
  const user = await getUserByEmail(email);
  if (user === null) {
    return [null, null];
  }

  if (!verifyPassword(password, user.passwordKey, user.passwordSalt)) {
    return [null, null];
  }
  
  // Generate a new session token.
  const { token, hashedToken } = generateToken();
  user.hashedSessionToken = hashedToken;
  user.sessionExpiration = DateTime.now().plus({ milliseconds: env.SESSION_EXPIRATION_MS }).toJSDate();
  await user.save();

  return [token, user];
}

async function logOut(sessionToken: string) {
  const user = await getUserBySessionToken(sessionToken);
  if (user !== null) {
    user.sessionExpiration = expiredDate();
    await user.save();
  }
}

interface PasswordResetFields {
  email: string;
  password: string;
  passwordResetToken: string;
}

async function sendPasswordResetEmail(email: string) {
  const user = await getUserByEmail(email);
  if (user === null) {
    return;
  }

  const { token, hashedToken } = generateToken();
  user.hashedPasswordResetToken = hashedToken;
  user.passwordResetExpiration = DateTime.now().plus({ hours: env.PASSWORD_RESET_VALID_HRS }).toJSDate();
  await user.save();

  await sendEmail(email, `Password Reset for ${env.DEPLOYMENT_NAME}`,
`
Hello ${user.name},

Please use the following URL to reset your password:

${env.DEPLOYMENT_URL}/reset-password?token=${token}

This link will expire in ${env.PASSWORD_RESET_VALID_HRS} hour(s). If you did not request a password reset, you can safely ignore this email.
`);

  console.log(`Sent password reset email: ${email}`);
}

async function resetPassword({ email, password, passwordResetToken }: PasswordResetFields) {
  const user = await UserModel.findOne({ email });
  if (user === null) {
    console.log(`User not found: ${email}`);
    return false;
  }

  if (!validateToken(passwordResetToken, user.hashedPasswordResetToken)) {
    console.log("Password reset token invalid");
    return false;
  }

  if (user.passwordResetExpiration < new Date()) {
    console.log("Password reset token expired");
    return false;
  }

  const { key, salt } = hashPassword(password);
  user.passwordKey = key;
  user.passwordSalt = salt;
  user.passwordResetExpiration = expiredDate();
  await user.save();
  console.log(`Password reset successful: ${email}`);
  return true;
}

interface CreateUserFields {
  email: string;
  active: boolean;
  admin: boolean;
  name: string;
}

function userToJSON(user: HydratedDocument<User>) {
  return {
    id: user._id.toHexString(),
    email: user.email,
    active: user.active,
    admin: user.admin,
  }
}

async function createUser({ email, active, admin, name }: CreateUserFields) {
  // Assign a random password to prevent new users from logging in until they
  // reset their password. This implementation guarantees that the user always
  // has a password, which simplifies things compared to checking for an empty
  // string, null, etc.
  const { key, salt } = generateRandomPassword();

  // Similarly, guarantee that the user always has a password reset token and
  // session token to avoid edge cases. These tokens can't be used because the
  // expiration dates are in the past, and also because the original (unhashed)
  // tokens are discarded.
  const { hashedToken: hashedPasswordResetToken } = generateToken();
  const { hashedToken: hashedSessionToken } = generateToken();

  const user = new UserModel({
    email,
    active,
    admin,
    passwordKey: key,
    passwordSalt: salt,
    hashedSessionToken,
    sessionExpiration: expiredDate(),
    hashedPasswordResetToken,
    passwordResetExpiration: expiredDate(),
    name,
  });

  return user.save();
}

/**
 * If there are no active admin accounts, create or reactivate the specified
 * account and give it admin privileges.
 */
async function ensureAdminExists(email: string) {
  const admin = await UserModel.findOne({ active: true, admin: true });
  if (admin !== null) {
    console.log(`An admin already exists: ${admin.email}`);
    return;
  }

  const fallbackAdmin = await UserModel.findOne({ email });
  if (fallbackAdmin === null) {
    await createUser({ email, active: true, admin: true, name: "Admin" });
    console.log(`Created admin account: ${email}`);
  } else {
    fallbackAdmin.active = true;
    fallbackAdmin.admin = true;
    await fallbackAdmin.save();
    console.log(`Reactivated admin account: ${email}`);
  }
}

export {
  expiredDate,
  logIn,
  logOut,
  sendPasswordResetEmail,
  resetPassword,
  createUser,
  ensureAdminExists,
  getUserBySessionToken,
  userToJSON,
}
