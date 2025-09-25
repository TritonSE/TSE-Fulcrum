import { DateTime } from "luxon";

import { CreateUserRequest, LogInRequest, ResetPasswordRequest } from "../cakes";
import env from "../env";
import { UserDocument, UserModel } from "../models";
import { retrieveDeploymentUrl } from "../storage";

import CryptoService from "./CryptoService";
import EmailService from "./EmailService";

type PublicUser = {
  email: string;
  name: string;
  isAdmin: boolean;
};

type LogInResponse = {
  user: UserDocument;
  sessionToken: string;
};

class UserService {
  async create({
    email,
    name,
    onlyFirstYearPhoneScreen,
    onlyFirstYearTechnical,
    isDoingInterviewAlone,
    assignedStageIds,
    maxReviewsPerStageIdentifier,
    isAdmin,
  }: CreateUserRequest): Promise<UserDocument | null> {
    // TODO: To avoid race conditions, we should try to save, and catch the
    // exception if the user already exists (E11000).
    if ((await this.getByEmail(email)) !== null) {
      console.error(`User with email already exists: ${email}`);
      return null;
    }

    const user = new UserModel({
      email,
      name,
      onlyFirstYearPhoneScreen,
      onlyFirstYearTechnical,
      isDoingInterviewAlone,
      assignedStageIds,
      maxReviewsPerStageIdentifier: maxReviewsPerStageIdentifier as Record<string, number>,
      isAdmin,
    });
    return user.save();
  }

  async getAll(): Promise<UserDocument[]> {
    return UserModel.find({});
  }

  async getByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email });
  }

  async getByStage(stageId: number): Promise<UserDocument[]> {
    return UserModel.find({ assignedStageIds: stageId });
  }

  async getBySessionToken(sessionToken: string): Promise<UserDocument | null> {
    const sessionTokenHash = CryptoService.hashToken(sessionToken);
    const user = await UserModel.findOne({ sessionTokenHash });
    if (user === null) {
      console.error("Session token invalid");
      return null;
    }
    if (user.sessionExpiration < new Date()) {
      console.error("Session expired");
      return null;
    }
    return user;
  }

  async logIn({ email, password }: LogInRequest): Promise<LogInResponse | null> {
    const user = await this.getByEmail(email);
    if (user === null) {
      console.error(`No user with email address: ${email}`);
      return null;
    }

    if (!CryptoService.verifyPassword(password, user.passwordHash)) {
      console.error("Incorrect password");
      return null;
    }

    // Generate a new session token.
    const sessionToken = CryptoService.generateToken();
    user.sessionTokenHash = CryptoService.hashToken(sessionToken);
    user.sessionExpiration = DateTime.now()
      .plus({ minutes: env.SESSION_EXPIRATION_MINS })
      .toJSDate();
    await user.save();

    return {
      user,
      sessionToken,
    };
  }

  async logOut(user: UserDocument): Promise<void> {
    user.sessionExpiration = this.expiredDate();
    await user.save();
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.getByEmail(email);
    if (user === null) {
      console.error(`No user with email address: ${email}`);
      return;
    }

    const passwordResetToken = CryptoService.generateToken();
    user.passwordResetTokenHash = CryptoService.hashToken(passwordResetToken);
    user.passwordResetExpiration = DateTime.now()
      .plus({ minutes: env.PASSWORD_RESET_EXPIRATION_MINS })
      .toJSDate();
    await user.save();

    await EmailService.send({
      recipient: email,
      subject: `Password reset for ${env.DEPLOYMENT_NAME}`,
      body: [
        `Use this link to reset your password: ${retrieveDeploymentUrl()}/reset-password?token=${passwordResetToken}`,
        `This link will expire in ${env.PASSWORD_RESET_EXPIRATION_MINS} minutes. If you did not request a password reset, you can safely ignore this email.`,
      ].join("\n\n"),
    });
  }

  async resetPassword({
    email,
    passwordResetToken,
    password,
  }: ResetPasswordRequest): Promise<boolean> {
    const user = await this.getByEmail(email);
    if (user === null) {
      console.error(`No user with email address: ${email}`);
      return false;
    }

    if (!CryptoService.verifyToken(passwordResetToken, user.passwordResetTokenHash)) {
      console.error("Password reset token invalid");
      return false;
    }

    if (user.passwordResetExpiration < new Date()) {
      console.error("Password reset token expired");
      return false;
    }

    user.passwordHash = CryptoService.hashPassword(password);

    // Prevent password reset tokens from being reused.
    user.passwordResetExpiration = this.expiredDate();

    await user.save();
    return true;
  }

  serialize(user: UserDocument): PublicUser {
    return {
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    };
  }

  private expiredDate(): Date {
    return new Date(0);
  }
}

export default new UserService();
