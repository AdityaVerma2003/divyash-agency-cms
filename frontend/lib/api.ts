const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: "GET", token }),
  post: <T>(path: string, data: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data), token }),
  patch: <T>(path: string, data: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data), token }),
  del: <T>(path: string, token?: string | null) => request<T>(path, { method: "DELETE", token }),
};
