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

export const NAV_ITEMS = [
  { id: "encaissement",       label: "Encaissement",       icon: "⊞" },
  { id: "prestations",        label: "Prestations",        icon: "✦" },
  { id: "categories",         label: "Catégories",         icon: "◈" },
  { id: "clients",            label: "Clients",            icon: "◉" },
  { id: "employes",           label: "Employés",           icon: "⟡" },
  { id: "depenses",           label: "Dépenses",           icon: "◻" },
  { id: "recettes",           label: "Recettes",           icon: "◑" },
  { id: "rapport-journalier", label: "Rapport journalier", icon: "◷" },
  { id: "rapport-mensuel",    label: "Rapport mensuel",    icon: "▦" },
  { id: "rapport-annuel",     label: "Rapport annuel",     icon: "▣" },
];
