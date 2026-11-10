'use client';

/** Fetch wrapper for /api/admin: adds the CSRF header, throws Error(message) on failure. */
export async function adminFetch<T = unknown>(
  url: string,
  init: { method?: string; json?: unknown; form?: FormData } = {},
): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? (init.json || init.form ? 'POST' : 'GET'),
    headers: { 'x-eiv-admin': '1', ...(init.json !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
    credentials: 'same-origin',
  });
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  if (!res.ok) {
    if (res.status === 401 && body?.error?.code === 'unauthenticated') {
      window.location.href = '/admin/dang-nhap';
    }
    throw new Error(body?.error?.message ?? `Lỗi ${res.status}`);
  }
  return body as T;
}
