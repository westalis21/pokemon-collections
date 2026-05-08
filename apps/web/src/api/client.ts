import { parseApiError } from '../lib/api-error';

export interface ApiFetchInit extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null;
  json?: unknown;
}

export async function apiFetch<T>(
  input: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  let body = init.body;
  if (init.json !== undefined) {
    body = JSON.stringify(init.json);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(input, { ...init, body, headers });

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  const payload = text ? safeJson(text) : undefined;

  if (!response.ok) {
    throw parseApiError(response.status, payload ?? text);
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
