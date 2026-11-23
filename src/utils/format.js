export const fmt = (n) =>
  (parseFloat(n) || 0).toFixed(2).replace(".", ",") + " €";

export const fmtShort = (n) =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",") + "k €" : fmt(n);

export const fmtDate = (d) => {
  if (!d) return "—";
  const str = String(d).split("T")[0];
  const [y, m, day] = str.split("-");
  return y && m && day ? `${day}/${m}/${y}` : str;
};

// ─── Recette d'un ticket ──────────────────────────────────────────────────────
// La recette d'une vente est `total`, jamais `amount_paid` : ce dernier est la
// somme remise par le client, espèces rendues comprises (change_due). Payer
// 50 € pour un ticket de 45 € gonflait le chiffre d'affaires de 5 €.
//
// On en retranche les avoirs : une vente à demi remboursée ne compte plus
// qu'à moitié, sans pour autant disparaître de l'historique.
export const orderRevenue = (o) => {
  const total    = parseFloat(o?.total ?? o?.amount_paid ?? 0) || 0;
  const refunded = parseFloat(o?.refunded_amount ?? 0) || 0;
  return Math.round((total - refunded) * 100) / 100;
};

/** Montant facturé avant avoir — utile pour montrer ce qui a été remboursé. */
export const orderGross = (o) => parseFloat(o?.total ?? o?.amount_paid ?? 0) || 0;

export const orderRefunded = (o) => parseFloat(o?.refunded_amount ?? 0) || 0;

// Seuls les tickets encaissés alimentent la recette : un ticket annulé ou
// remboursé doit rester visible dans les listes mais sortir des totaux.
export const isRevenueOrder = (o) => (o?.status ?? "completed") === "completed";

export const sumRevenue = (orders = []) =>
  orders.reduce((s, o) => (isRevenueOrder(o) ? s + orderRevenue(o) : s), 0);

export const ORDER_STATUS_LABELS = {
  pending:   "En attente",
  completed: "Encaissée",
  cancelled: "Annulée",
  refunded:  "Remboursée",
};

export const PAYMENT_METHODS = [
  { key: "card",       label: "Carte bancaire",  icon: "💳", color: "#6366f1" },
  { key: "cash",       label: "Espèces",         icon: "💵", color: "#10b981" },
  { key: "treatwell",  label: "Treatwell",       icon: "🌿", color: "#8b5cf6" },
  { key: "planity",    label: "Planity",         icon: "📅", color: "#f59e0b" },
  { key: "contactless",label: "Sans contact",    icon: "📲", color: "#38bdf8" },
  { key: "check",      label: "Chèque",          icon: "🖊", color: "#94a3b8" },
];

export const PMTS = {
  card: "💳 Carte", cash: "💵 Espèces", treatwell: "🌿 Treatwell",
  planity: "📅 Planity", contactless: "📲 Sans contact",
  check: "🖊 Chèque", mixed: "⟡ Multi",
};

export const PMT_COLORS = {
  card: "#6366f1", cash: "#10b981", treatwell: "#8b5cf6",
  planity: "#f59e0b", contactless: "#38bdf8", check: "#94a3b8", mixed: "#64748b",
};

export const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

// Ces rôles doivent refléter ce que l'API autorise réellement, sinon la page
// s'affiche puis échoue en 403. Les trois rapports reposent sur
// /reports/sales, réservé à admin, manager et accountable : les proposer aux
// employés n'ouvrait qu'un écran en erreur.
export const NAV_ITEMS = [
  { id: "encaissement",       label: "Encaissement",       icon: "⊞",       roles :["admin", "manager", "employee"] },
  { id: "prestations",        label: "Prestations",        icon: "✦",       roles :["admin", "manager", "employee"]  },
  { id: "produits",           label: "Produits",           icon: "▩",       roles :["admin", "manager", "employee"]  },
  { id: "categories",         label: "Catégories",         icon: "◈",       roles :["admin", "manager", "employee"]  },
  { id: "clients",            label: "Clients",            icon: "◉",       roles :["admin", "manager", "employee"]  },
  { id: "employes",           label: "Employés",           icon: "⟡",       roles :["admin", "manager", "employee"]  },
  { id: "caisse",             label: "Clôture de caisse",  icon: "▤",       roles :["admin", "manager", "employee"]  },
  { id: "depenses",           label: "Dépenses",           icon: "◻",       roles :["admin", "manager", "employee", "accountable"]  },
  { id: "recettes",           label: "Recettes",           icon: "◑",       roles :["admin", "manager", "employee", "accountable"]  },
  { id: "rapport-journalier", label: "Rapport journalier", icon: "◷",       roles :["admin", "manager", "accountable"]  },
  { id: "rapport-mensuel",    label: "Rapport mensuel",    icon: "▦",       roles :["admin", "manager", "accountable"]  },
  { id: "rapport-annuel",     label: "Rapport annuel",     icon: "▣",       roles :["admin", "manager", "accountable"]  },
];
