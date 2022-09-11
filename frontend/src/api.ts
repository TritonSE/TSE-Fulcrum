type Method = "get" | "post";

interface User {
  email: string;
  name: string;
}

interface LogInRequest {
  email: string;
  password: string;
}

class Api {
  public async logIn(request: LogInRequest): Promise<User> {
    return (await this.post("/api/auth/log-in", request)).json();
  }

  public async me(): Promise<User> {
    return (await this.get("/api/auth/me")).json();
  }

  private async get(url: string, headers: Record<string, string> = {}): Promise<Response> {
    return this.fetch("get", url, undefined, headers);
  }

  private async post(
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

    if (!response.ok) {
      let message = "";
      try {
        message = ": " + (await response.text());
      } catch (e) {
        // No error message; ignore.
      }

      throw new Error(
        [
          `${response.status} ${response.statusText}${message}`,
          `${method} ${url}`,
          ...(Object.keys(newHeaders).length === 0
            ? []
            : [`headers: ${JSON.stringify(newHeaders, null, 2)}`]),
          ...(body === undefined ? [] : [`body: ${JSON.stringify(body, null, 2)}`]),
        ].join("\n\n")
      );
    }

    return response;
  }
}

const api = new Api();
export default api;
