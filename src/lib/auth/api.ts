import { apiClient } from "@/lib/api/client";
import type { AuthTokens, AuthUser, UserRole } from "@/lib/auth/types";

export type OtpPurpose = "login" | "signup";

export interface SendOtpPayload {
  phone: string;
  dialCode: string;
  purpose: OtpPurpose;
  name?: string;
  email?: string;
  preferredRole?: "requestor" | "acceptor";
}

export function sendOtp(payload: SendOtpPayload) {
  return apiClient.post<{ expiresInSeconds: number }>("/auth/otp/send", payload);
}

export function verifyOtp(payload: {
  phone: string;
  dialCode: string;
  code: string;
}) {
  return apiClient.post<AuthTokens>("/auth/otp/verify", payload);
}

export function refreshSession() {
  return apiClient.post<AuthTokens>("/auth/refresh", {});
}

export function logoutSession() {
  return apiClient.post<undefined>("/auth/logout", {});
}

export function fetchMe() {
  return apiClient.get<AuthUser>("/me");
}

export function getRedirectForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "requestor":
    case "acceptor":
      return "/dashboard";
  }
}
