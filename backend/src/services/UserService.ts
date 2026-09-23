import env from "../env";
import { UserModel } from "../models";

import AuthService from "./AuthService";

import type { CreateUserRequest, LogInRequest } from "../cakes";
import type { UserDocument } from "../models";

type PublicUser = {
  email: string;
  name: string;
  isAdmin: boolean;
};

type LogInResponse = {
  user: UserDocument;
  sessionCookie: string;
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

  async logIn({ idToken }: LogInRequest): Promise<LogInResponse | null> {
    const decoded = await AuthService.verifyIdToken(idToken);
    if (!decoded || !decoded.email_verified || !decoded.email) {
      console.error("Invalid ID Token");
      return null;
    }
    const email = decoded.email;

    const user = await this.getByEmail(email);
    if (user === null) {
      // TODO: Delete auto-generated user from Firebase userbase if they are not
      // not valid
      console.error(`No user with email address: ${email}`);
      return null;
    }

    // Generate a new cookie
    const sessionCookie = await AuthService.createSessionCookie(
      idToken,
      env.SESSION_EXPIRATION_MINS * 60 * 1000,
    );

    return {
      user,
      sessionCookie,
    };
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
