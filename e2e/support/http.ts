export interface HttpResponse {
  status: number;
  body: any;
  headers: Headers;
}

export async function apiRequest(
  url: string,
  method: string,
  options?: {
    body?: any;
    token?: string;
    headers?: Record<string, string>;
  },
): Promise<HttpResponse> {
  const headers: Record<string, string> = {
    ...options?.headers,
  };

  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let body: any;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return {
    status: response.status,
    body,
    headers: response.headers,
  };
}
