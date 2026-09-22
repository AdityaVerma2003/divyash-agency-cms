"use client";

import { api } from "./api";
import type { AuthUser } from "@/types";

const TOKEN_KEY = "divyash_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string) {
  const result = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", {
    email,
    password,
  });
  setAccessToken(result.accessToken);
  return result.user;
}

export async function logout() {
  await api.post("/auth/logout", {}).catch(() => undefined);
  clearAccessToken();
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getAccessToken();
  if (!token) return null;
  try {
    return await api.get<AuthUser>("/auth/me", token);
  } catch {
    clearAccessToken();
    return null;
  }
}

export function homePathForRole(role: AuthUser["role"]) {
  return role === "CLIENT" ? "/client/dashboard" : "/admin/dashboard";
}
