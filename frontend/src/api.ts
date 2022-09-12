type Method = "get" | "post";

export interface User {
  id: string;
  email: string;
  name: string;
}

interface LogInRequest {
  email: string;
  password: string;
}

interface CreateUserRequest {
  email: string;
  name: string;
}

interface ResetPasswordRequest {
  email: string;
  password: string;
  passwordResetToken: string;
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

    const parts = [`${response.status} ${response.statusText}`];

    try {
      const message = await response.text();
      if (message) {
        parts.push(": " + message);
      }
    } catch (e) {
      // Ignore.
    }

    throw new Error(parts.join(""));
  }
}

const api = new Api();
export default api;
