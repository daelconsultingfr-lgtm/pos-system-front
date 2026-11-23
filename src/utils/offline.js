// File d'attente des encaissements réalisés hors ligne.
//
// L'application tourne sur iPad en boutique : une coupure réseau ne doit pas
// faire perdre une vente. Les ventes qui ne partent pas sont conservées
// localement, puis rejouées dès le retour du réseau.
//
// Ce mécanisme ne couvre volontairement que la création de ventes. Rejouer une
// modification ou une annulation demanderait de résoudre des conflits, ce qui
// n'a pas de sens sans arbitrage humain.
import { POST, getShopId } from "./api";

const KEY = "pending_orders";

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
};

const write = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); }
  catch { /* quota atteint : on ne peut rien faire de mieux ici */ }
};

/** Une panne réseau se distingue d'un refus du serveur : seule la première se rejoue. */
export const isNetworkFailure = (err) =>
  !navigator.onLine
  || err?.name === "TypeError"                       // fetch n'a pas abouti
  || /Failed to fetch|NetworkError|Load failed/i.test(err?.message || "");

/** Met une vente en attente. La boutique est figée : elle peut changer d'ici au rejeu. */
export const enqueue = (payload) => {
  const list = read();
  list.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    shop_id: getShopId(),
    queued_at: new Date().toISOString(),
    payload,
  });
  write(list);
  return list.length;
};

export const pendingCount = () => read().length;
export const pendingOrders = () => read();
export const clearPending = () => write([]);

/**
 * Rejoue les ventes en attente, dans leur ordre d'arrivée.
 *
 * Un refus du serveur (montant invalide, prestation supprimée…) ne disparaît
 * pas en silence : la vente sort de la file et est retournée dans `failed`
 * pour être signalée. Une nouvelle panne réseau interrompt le rejeu et
 * conserve le reste de la file.
 */
export const flush = async () => {
  const list = read();
  if (!list.length) return { sent: 0, failed: [], remaining: 0 };

  const failed = [];
  let sent = 0;
  let index = 0;

  for (; index < list.length; index++) {
    const item = list[index];
    try {
      await POST("/orders", item.payload, { shopId: item.shop_id });
      sent++;
    } catch (err) {
      if (isNetworkFailure(err)) break;      // toujours hors ligne : on s'arrête là
      failed.push({ ...item, error: err.message });
    }
  }

  write(list.slice(index));
  return { sent, failed, remaining: read().length };
};

/** Prévient l'application des changements d'état réseau. */
export const watchConnection = (onChange) => {
  const notify = () => onChange(navigator.onLine);
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};
