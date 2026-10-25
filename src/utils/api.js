const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';


export const getToken   = () => localStorage.getItem("jwt_token");
export const setToken   = (t) => localStorage.setItem("jwt_token", t);
export const clearToken = () => localStorage.removeItem("jwt_token");

async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Erreur ${res.status}`);
  return json;
}

export const GET    = (p)    => api("GET",    p);
export const POST   = (p, b) => api("POST",   p, b);
export const PUT    = (p, b) => api("PUT",    p, b);
export const DELETE = (p)    => api("DELETE", p);
