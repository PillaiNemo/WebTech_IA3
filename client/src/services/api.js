// services/api.js
// Small helpers for talking to the Express API (through the Vite proxy).
// Every helper resolves with the JSON reply, or throws an ApiError whose
// .status and .data come from the server (0 = the server could not be reached).

export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.message) || `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
}

async function request(method, url, { body, token, timeout = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // no JSON body
    }
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') throw new ApiError(0, { message: 'The server took too long to answer. Please try again.' });
    throw new ApiError(0, { message: "We couldn't reach the server. Is it running?" });
  } finally {
    clearTimeout(timer);
  }
}

export const getJSON = (url, opts) => request('GET', url, opts);
export const postJSON = (url, body, opts) => request('POST', url, { ...opts, body });
export const patchJSON = (url, body, opts) => request('PATCH', url, { ...opts, body });
export const deleteJSON = (url, opts) => request('DELETE', url, opts);
