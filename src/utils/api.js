const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const getToken   = () => localStorage.getItem("jwt_token");
export const setToken   = (t) => localStorage.setItem("jwt_token", t);
export const clearToken = () => localStorage.removeItem("jwt_token");

// ─── Boutique active ──────────────────────────────────────────────────────────
// L'API cloisonne les données par boutique et lit l'en-tête X-Shop-Id. Le choix
// est mémorisé localement : on retrouve sa boutique en rouvrant l'application.
// Une valeur vide signifie « toutes mes boutiques » (mode consolidé), réservé
// aux rôles qui y ont droit.
const SHOP_KEY = "active_shop_id";
export const getShopId   = () => localStorage.getItem(SHOP_KEY) || "";
export const setShopId   = (id) => id ? localStorage.setItem(SHOP_KEY, id) : localStorage.removeItem(SHOP_KEY);
export const clearShopId = () => localStorage.removeItem(SHOP_KEY);

// Prévient l'application d'une session expirée. Sans cela, un jeton périmé
// produisait une cascade de messages d'erreur sur un écran inutilisable, sans
// jamais ramener à la connexion.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// `opts.shopId` force la boutique de l'appel. Nécessaire au rejeu d'une vente
// mise en attente hors ligne : elle appartient à la boutique où elle a été
// saisie, qui n'est pas forcément celle active au moment du rejeu.
async function api(method, path, body, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const shopId = opts.shopId ?? getShopId();
  if (shopId) headers["X-Shop-Id"] = shopId;

  const res = await fetch(`${BASE_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try { json = await res.json(); } catch { /* réponse sans corps JSON */ }

  if (res.status === 401 && onUnauthorized) onUnauthorized();

  if (!res.ok) {
    // express-validator renvoie un tableau d'erreurs de champ, sans `message` :
    // sans ce cas, l'utilisateur voyait « Erreur 400 » sans savoir quoi corriger.
    const detail = json?.message
      || json?.errors?.map(e => e.msg).join(" · ")
      || `Erreur ${res.status}`;
    throw new Error(detail);
  }
  return json;
}

export const GET    = (p, o)    => api("GET",    p, undefined, o);
export const POST   = (p, b, o) => api("POST",   p, b, o);
export const PUT    = (p, b, o) => api("PUT",    p, b, o);
export const DELETE = (p, o)    => api("DELETE", p, undefined, o);
