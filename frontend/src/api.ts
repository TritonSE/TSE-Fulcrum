type Method = "get" | "post" | "put";

export interface User {
  email: string;
  name: string;
}

interface LogInRequest {
  email: string;
  password: string;
}

interface ResetPasswordRequest {
  email: string;
  password: string;
  passwordResetToken: string;
}

interface CreateUserRequest {
  email: string;
  name: string;
}

export type PipelineIdentifier = "designer" | "test_designer" | "developer" | "test_developer";

export interface Pipeline {
  identifier: PipelineIdentifier;
  name: string;
}

export type BulkAdvanceOrRejectResponse = Record<
  string,
  { success: true; value: Progress } | { success: false; value: string }
>;

interface FormField {
  type: "string" | "number" | "boolean";
  choices: (string | number | boolean)[];
  allowOther: boolean;
  label: string;
  description: string;
  rubricLink?: string;
  weight?: number;
}

export interface Review {
  _id: string;
  stageId: number;
  application: string;
  reviewerEmail?: string;
  fields: Record<string, string | number | boolean>;
}

export type PopulatedReview = Omit<Review, "stage" | "application"> & {
  stage: Stage;
  application: Application;
};

export interface Progress {
  _id: string;
  pipelineIdentifier: PipelineIdentifier;
  application: string;
  stageIndex: number;
  state: "pending" | "rejected" | "accepted";
}

export interface Stage {
  id: number;
  pipelineIdentifier: PipelineIdentifier;
  pipelineIndex: number;
  numReviews: number;
  name: string;
  fields: Record<string, FormField>;
  fieldOrder: string[];
  autoAssignReviewers: boolean;
  notifyReviewersWhenAssigned: boolean;
  hasTechnicalInterview?: boolean;
}

export interface Application {
  _id: string;
  name: string;
  pronouns: string;
  email: string;
  phone: string;

  // Calendar year, e.g. 2022.
  yearApplied: number;

  // 4 * year + quarter - 8088 is winter 2022, 8089 is spring 2022, etc.
  // This makes it easy to sort chronologically.
  startQuarter: number;
  gradQuarter: number;

  major: string;
  majorDept: string;
  prevTest: string;

  resumeUrl: string;

  aboutPrompt: string;
  interestPrompt: string;
  testBarriersPrompt: string;

  // Map role identifiers to the corresponding prompts.
  rolePrompts: Record<string, string>;
}

class Api {
  async logIn(request: LogInRequest): Promise<User | null> {
    const response = await this.uncheckedPost("/api/auth/log-in", request);
    if (response.status === 401) {
      return null;
    }
    await this.assertOk(response);
    return response.json();
  }

  async logOut(): Promise<void> {
    await this.post("/api/auth/log-out", undefined);
  }

  async me(): Promise<User | null> {
    const response = await this.uncheckedGet("/api/auth/me");
    if (response.status === 401) {
      return null;
    }
    await this.assertOk(response);
    return response.json();
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.post("/api/auth/request-password-reset", { email });
  }

  async resetPassword(request: ResetPasswordRequest): Promise<boolean> {
    return (await this.post("/api/auth/reset-password", request)).ok;
  }

  async getAllUsers(): Promise<User[]> {
    return (await this.get("/api/user")).json();
  }

  async createUser(request: CreateUserRequest): Promise<User> {
    return (await this.post("/api/user", request)).json();
  }

  async getAllPipelines(): Promise<Pipeline[]> {
    return (await this.get("/api/pipeline")).json();
  }

  async getApplicationById(applicationId: string): Promise<Application> {
    return (await this.get(`/api/application/${applicationId}`)).json();
  }

  async getFilteredReviews(filter: Record<string, string>): Promise<PopulatedReview[]> {
    return (await this.get(`/api/review?${new URLSearchParams(Object.entries(filter))}`)).json();
  }

  async autoAssignReview(id: string): Promise<Review> {
    return (await this.post(`/api/review/${id}/auto-assign`, undefined)).json();
  }

  async assignReview(id: string, reviewerEmail: string): Promise<Review> {
    return (
      await this.post(`/api/review/${id}/assign/${encodeURIComponent(reviewerEmail)}`, undefined)
    ).json();
  }

  async getReviewById(reviewId: string): Promise<Review> {
    return (await this.get(`/api/review/${reviewId}`)).json();
  }

  async updateReview(request: Review): Promise<Review> {
    return (await this.put(`/api/review/${request._id}`, request)).json();
  }

  async getFilteredProgresses(filter: Record<string, string>): Promise<Progress[]> {
    return (await this.get(`/api/progress?${new URLSearchParams(Object.entries(filter))}`)).json();
  }

  async getStageById(stageId: number): Promise<Stage> {
    return (await this.get(`/api/stage/${stageId}`)).json();
  }

  async getStagesByPipeline(pipelineIdentifier: PipelineIdentifier): Promise<Stage[]> {
    return (await this.get(`/api/stage?pipeline=${pipelineIdentifier}`)).json();
  }

  async getAllStages(): Promise<Stage[]> {
    return (await this.get("/api/stage")).json();
  }

  async bulkAdvanceApplications(
    pipelineIdentifier: PipelineIdentifier,
    applicationIds: string[]
  ): Promise<BulkAdvanceOrRejectResponse> {
    return (
      await this.post("/api/progress/bulk_advance", { pipelineIdentifier, applicationIds })
    ).json();
  }

  async bulkRejectApplications(
    pipelineIdentifier: PipelineIdentifier,
    applicationIds: string[]
  ): Promise<BulkAdvanceOrRejectResponse> {
    return (
      await this.post("/api/progress/bulk_reject", { pipelineIdentifier, applicationIds })
    ).json();
  }

  private async get(url: string, headers: Record<string, string> = {}): Promise<Response> {
    const response = await this.uncheckedGet(url, headers);
    await this.assertOk(response);
    return response;
  }

  private async post(
    url: string,
    body: unknown,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const response = await this.uncheckedPost(url, body, headers);
    await this.assertOk(response);
    return response;
  }

  private async put(
    url: string,
    body: unknown,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const response = await this.fetch("put", url, body, headers);
    await this.assertOk(response);
    return response;
  }

  private async uncheckedGet(url: string, headers: Record<string, string> = {}): Promise<Response> {
    return this.fetch("get", url, undefined, headers);
  }

  private async uncheckedPost(
    url: string,
    body: unknown,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    return this.fetch("post", url, body, headers);
  }

  private async uncheckedPut(
    url: string,
    body: unknown,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    return this.fetch("put", url, body, headers);
  }

  private async fetch(
    method: Method,
    url: string,
    body: unknown,
    headers: Record<string, string>
  ): Promise<Response> {
    const hasBody = body !== undefined;

    const newHeaders = { ...headers };
    if (hasBody) {
      newHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers: newHeaders,
      body: hasBody ? JSON.stringify(body) : undefined,
    });

    return response;
  }

  private async assertOk(response: Response): Promise<void> {
    if (response.ok) {
      return;
    }

    let message = `${response.status} ${response.statusText}`;

    try {
      const text = await response.text();
      if (text) {
        message += ": " + text;
      }
    } catch (e) {
      // Ignore.
    }

    throw new Error(message);
  }
}

const api = new Api();
export default api;
