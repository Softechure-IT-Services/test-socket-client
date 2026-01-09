// lib/api.ts
// Centralized fetch wrapper that attaches the access token from localStorage

type FetchInput = RequestInfo | URL;

const getToken = () => {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  } catch (e) {
    return null;
  }
};

export async function apiFetch(input: FetchInput, init?: RequestInit) {
  const token = getToken();

  const headers = new Headers(init?.headers as HeadersInit | undefined || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // If body is not FormData, default to JSON content-type when not provided
  const body = init?.body;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, {
    ...init,
    headers,
    // include credentials by default so cookies are sent if needed
    credentials: init?.credentials ?? "include",
  });

  if (!res.ok) {
    let errText: string;
    try {
      errText = await res.text();
    } catch (e) {
      errText = String(e);
    }
    const error = new Error(`Request failed with status ${res.status}: ${errText}`);
    // attach response for callers who need it
    // @ts-ignore
    error.response = res;
    throw error;
  }

  return res;
}

export async function apiGet<T = any>(url: string) {
  const res = await apiFetch(url, { method: "GET" });
  return (await res.json()) as T;
}

export async function apiPost<T = any>(url: string, body?: any) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const init: RequestInit = {
    method: "POST",
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  };
  const res = await apiFetch(url, init);
  return (await res.json()) as T;
}

export async function apiPut<T = any>(url: string, body?: any) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const init: RequestInit = {
    method: "PUT",
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  };
  const res = await apiFetch(url, init);
  return (await res.json()) as T;
}

export async function apiDelete<T = any>(url: string) {
  const res = await apiFetch(url, { method: "DELETE" });
  return (await res.json()) as T;
}

export default apiFetch;
