const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    throw new ApiError(data.error ?? "Something went wrong. Please try again.");
  }

  return data as T;
}

export type PublicUser = {
  id: string;
  email: string;
  handle: string;
  role: "user" | "admin";
  createdAt: string | null;
};

export const authApi = {
  requestSignupOtp: (email: string) =>
    request<{ success: true; message: string }>("/api/auth/register/request-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifySignupOtp: (email: string, code: string) =>
    request<{ success: true; ticket: string }>("/api/auth/register/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  completeSignup: (ticket: string, password: string) =>
    request<{ success: true; user: PublicUser }>("/api/auth/register/complete", {
      method: "POST",
      body: JSON.stringify({ ticket, password }),
    }),

  login: (email: string, password: string) =>
    request<{ success: true; user: PublicUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ success: true }>("/api/auth/logout", { method: "POST" }),

  me: () => request<{ success: true; user: PublicUser }>("/api/auth/me"),
};
