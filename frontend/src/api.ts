interface LogInFields {
  email: string;
  password: string;
}

async function fetchWrapper<I, O>(method: string, url: string, body?: I) {
  const serializedBody = body ? JSON.stringify(body) : undefined;

  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: serializedBody,
  });

  console.log(response);

  return response;
}

async function logIn(fields: LogInFields) {
  return fetchWrapper("post", "/api/auth/login", fields);
}

export { logIn };
