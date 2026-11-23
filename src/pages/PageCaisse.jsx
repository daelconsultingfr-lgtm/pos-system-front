import { useState, useEffect, useCallback } from "react";
import { GET, POST } from "../utils/api";
import { fmt, fmtDate } from "../utils/format";
import { c } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { EmptyState } from "../components/UI";

const today = () => new Date().toISOString().split("T")[0];

// Ligne du détail du tiroir. `sign` porte le sens de l'opération : ce qui entre
// et ce qui sort doivent se distinguer d'un coup d'œil.
function DetailRow({ label, value, sign = 0, hint }) {
  const color = sign > 0 ? "#10b981" : sign < 0 ? "#f87171" : "#94a3b8";
  const prefix = sign > 0 ? "+" : sign < 0 ? "−" : "";
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "9px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ flex: 1, fontSize: 14, color: "#cbd5e1" }}>
        {label}
        {hint && <span style={{ display: "block", fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{hint}</span>}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 15, color }}>
        {prefix}{fmt(Math.abs(value))}
      </span>
    </div>
  );
}

export default function PageCaisse({ toast, user }) {
  const [session, setSession]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [history, setHistory]   = useState([]);
  const [openFloat, setOpenFloat] = useState("");
  const [counted, setCounted]   = useState("");
  const [notes, setNotes]       = useState("");
  const [busy, setBusy]         = useState(false);
  const { isMobile } = useBreakpoint();

  const canClose = user?.role === "admin" || user?.role === "manager";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cur, hist] = await Promise.all([
        GET(`/cash-sessions/current?date=${today()}`),
        GET("/cash-sessions?limit=30"),
      ]);
      setSession(cur.data);
      setHistory(hist.data || []);
    } catch (e) { toast(e.message); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleOpen = async () => {
    if (openFloat === "") return toast("Indiquez le fond de caisse");
    setBusy(true);
    try {
      await POST("/cash-sessions/open", { opening_float: parseFloat(openFloat), session_date: today() });
      toast("Caisse ouverte", "success");
      setOpenFloat("");
      await load();
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const handleClose = async () => {
    if (counted === "") return toast("Indiquez le montant compté");
    const gap = parseFloat(counted) - (session?.cash_detail?.expected ?? 0);
    const msg = Math.abs(gap) < 0.005
      ? "La caisse tombe juste. Clôturer ?"
      : `Écart de ${fmt(gap)} entre le compté et l'attendu.\n\nCet écart sera enregistré tel quel et ne pourra plus être modifié. Clôturer ?`;
    if (!window.confirm(msg)) return;

    setBusy(true);
    try {
      await POST("/cash-sessions/close", {
        closing_counted: parseFloat(counted), notes: notes || undefined, session_date: today(),
      });
      toast("Caisse clôturée", "success");
      setCounted(""); setNotes("");
      await load();
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  const d = session?.cash_detail;
  // Écart affiché en direct pendant la saisie : le caissier voit l'effet de son
  // comptage avant de valider, pas après.
  const liveGap = counted === "" || !d ? null : parseFloat(counted) - d.expected;

  if (loading) return (
    <div style={c.page}><div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={36} /></div></div>
  );

  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div>
          <div style={c.pageTitle}>Clôture de caisse</div>
          <div style={c.pageSub}>
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        {session && (
          <span style={{
            padding: "7px 15px", borderRadius: 20, fontSize: 12.5, fontWeight: 800,
            background: session.status === "open" ? "rgba(16,185,129,0.13)" : "rgba(148,163,184,0.13)",
            color: session.status === "open" ? "#10b981" : "#94a3b8",
          }}>
            {session.status === "open" ? "● Caisse ouverte" : "Caisse clôturée"}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gap: 20,
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) minmax(0,1fr)" }}>

        {/* ── Colonne gauche : l'état du tiroir ── */}
        <div>
          {!session && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Ouvrir la caisse</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18, lineHeight: 1.6 }}>
                Comptez le fond de caisse avant la première vente. C'est lui qui sert de
                point de départ au calcul de fin de journée.
              </div>
              <label style={c.label}>Fond de caisse (€)</label>
              <input style={{ ...c.input, width: "100%", marginBottom: 16 }} type="number" step="0.01" min="0"
                value={openFloat} onChange={e => setOpenFloat(e.target.value)} placeholder="150.00" autoFocus />
              <button style={{ ...c.saveBtn, width: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 9 }} onClick={handleOpen} disabled={busy}>
                {busy && <Spinner size={16} color="#0a0d14" />} Ouvrir la caisse
              </button>
            </div>
          )}

          {session && d && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Espèces attendues</div>

              <DetailRow label="Fond de caisse" value={d.opening_float} sign={1} />
              <DetailRow label="Encaissé en espèces" value={d.cash_received} sign={1}
                hint="monnaie rendue déjà déduite" />
              <DetailRow label="Avoirs rendus" value={d.cash_refunded} sign={-1} />
              <DetailRow label="Dépenses au comptant" value={d.cash_expenses} sign={-1}
                hint="seules celles réglées en espèces" />

              <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingTop: 14, marginTop: 4 }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>Attendu en caisse</span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 900, fontSize: 22, color: "#f0c987" }}>
                  {fmt(d.expected)}
                </span>
              </div>

              <div style={{ fontSize: 11.5, color: "#475569", marginTop: 10, lineHeight: 1.6 }}>
                Ouverte par {session.opened_by_name || "—"} à{" "}
                {new Date(session.opened_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}
        </div>

        {/* ── Colonne droite : le comptage ── */}
        <div>
          {session?.status === "open" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Compter le tiroir</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18, lineHeight: 1.6 }}>
                {canClose
                  ? "Saisissez le montant réellement présent. L'écart est enregistré tel quel, il n'est jamais corrigé."
                  : "Seuls un manager ou un administrateur peuvent clôturer la caisse."}
              </div>

              <label style={c.label}>Montant compté (€)</label>
              <input style={{ ...c.input, width: "100%", marginBottom: 14, fontSize: 18, fontWeight: 700 }}
                type="number" step="0.01" min="0" value={counted} disabled={!canClose}
                onChange={e => setCounted(e.target.value)} placeholder="0.00" />

              {liveGap !== null && (
                <div style={{
                  padding: "13px 16px", borderRadius: 10, marginBottom: 16,
                  background: Math.abs(liveGap) < 0.005 ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                  border: `1px solid ${Math.abs(liveGap) < 0.005 ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800,
                    color: Math.abs(liveGap) < 0.005 ? "#10b981" : "#f59e0b" }}>
                    {Math.abs(liveGap) < 0.005
                      ? "✓ La caisse tombe juste"
                      : liveGap > 0 ? `Excédent de ${fmt(liveGap)}` : `Manquant de ${fmt(Math.abs(liveGap))}`}
                  </div>
                </div>
              )}

              <label style={c.label}>Commentaire</label>
              <input style={{ ...c.input, width: "100%", marginBottom: 16 }} value={notes} disabled={!canClose}
                onChange={e => setNotes(e.target.value)} placeholder="Explication de l'écart…" />

              <button style={{ ...c.saveBtn, width: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 9, opacity: canClose ? 1 : 0.4 }}
                onClick={handleClose} disabled={busy || !canClose}>
                {busy && <Spinner size={16} color="#0a0d14" />} Clôturer la journée
              </button>
            </div>
          )}

          {session?.status === "closed" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Journée clôturée</div>
              <DetailRow label="Attendu" value={session.closing_expected} />
              <DetailRow label="Compté" value={session.closing_counted} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingTop: 14 }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>Écart</span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 900, fontSize: 22,
                  color: Math.abs(parseFloat(session.difference)) < 0.005 ? "#10b981" : "#f59e0b" }}>
                  {parseFloat(session.difference) > 0 ? "+" : ""}{fmt(session.difference)}
                </span>
              </div>
              {session.notes && (
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 14, padding: "10px 13px",
                  background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                  « {session.notes} »
                </div>
              )}
              <div style={{ fontSize: 11.5, color: "#475569", marginTop: 12 }}>
                Clôturée par {session.closed_by_name || "—"} à{" "}
                {new Date(session.closed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Historique ── */}
      <div style={{ marginTop: 30 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Journées précédentes</div>
        {history.length === 0 ? <EmptyState text="Aucune clôture enregistrée" /> : (
          <div style={c.table}>
            {!isMobile && (
              <div style={c.tableHead}>
                <span style={{ flex: 1.2 }}>Date</span>
                <span style={{ flex: 1 }}>Boutique</span>
                <span style={{ flex: 1, textAlign: "right" }}>Attendu</span>
                <span style={{ flex: 1, textAlign: "right" }}>Compté</span>
                <span style={{ flex: 1, textAlign: "right" }}>Écart</span>
                <span style={{ flex: 1.4 }}>Clôturée par</span>
              </div>
            )}
            {history.map(s => {
              const gap = parseFloat(s.difference ?? 0);
              const gapColor = s.status !== "closed" ? "#64748b"
                : Math.abs(gap) < 0.005 ? "#10b981" : "#f59e0b";
              return (
                <div key={s.id} style={{ ...c.tableRow, flexDirection: isMobile ? "column" : "row",
                  gap: isMobile ? 6 : 0, alignItems: isMobile ? "flex-start" : "center" }}>
                  <span style={{ flex: 1.2, fontWeight: 700, fontSize: 14 }}>{fmtDate(s.session_date)}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "#94a3b8" }}>{s.shop_code || "—"}</span>
                  <span style={{ flex: 1, textAlign: isMobile ? "left" : "right", fontSize: 13,
                    color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
                    {s.closing_expected != null ? fmt(s.closing_expected) : "—"}
                  </span>
                  <span style={{ flex: 1, textAlign: isMobile ? "left" : "right", fontSize: 13,
                    fontVariantNumeric: "tabular-nums" }}>
                    {s.closing_counted != null ? fmt(s.closing_counted) : "—"}
                  </span>
                  <span style={{ flex: 1, textAlign: isMobile ? "left" : "right", fontWeight: 800,
                    fontSize: 14, color: gapColor, fontVariantNumeric: "tabular-nums" }}>
                    {s.status !== "closed" ? "en cours" : `${gap > 0 ? "+" : ""}${fmt(gap)}`}
                  </span>
                  <span style={{ flex: 1.4, fontSize: 13, color: "#64748b" }}>{s.closed_by_name || "—"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
