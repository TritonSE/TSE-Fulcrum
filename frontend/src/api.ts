import { ReqLogin, ReqRequestPasswordReset, ReqResetPassword } from "shared";

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

async function logIn(body: ReqLogin) {
  return fetchWrapper("post", "/api/auth/login", body);
}

async function requestPasswordReset(body: ReqRequestPasswordReset) {
  return fetchWrapper("post", "/api/auth/request-password-reset", body);
}

async function resetPassword(body: ReqResetPassword) {
  return fetchWrapper("post", "/api/auth/reset-password", body);
}

export { logIn, requestPasswordReset, resetPassword };
