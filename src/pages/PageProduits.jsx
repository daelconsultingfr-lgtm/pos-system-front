import { useState, useEffect, useCallback } from "react";
import { GET, POST, PUT, DELETE } from "../utils/api";
import { fmt } from "../utils/format";
import { c } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { EmptyState, Modal, ModalActions } from "../components/UI";

const EMPTY = { name:"", category_id:"", price:"", stock:"0", stock_alert:"5", barcode:"", description:"" };

// Un produit passe par trois états lisibles d'un coup d'œil : en rupture,
// sous le seuil d'alerte, ou disponible.
function stockState(p) {
  const stock = parseInt(p.stock) || 0;
  const seuil = parseInt(p.stock_alert) || 0;
  if (stock <= 0)     return { label:"Rupture",    color:"#f87171", bg:"rgba(248,113,113,0.14)" };
  if (stock <= seuil) return { label:"Stock bas",  color:"#f59e0b", bg:"rgba(245,158,11,0.14)" };
  return                     { label:"En stock",   color:"#10b981", bg:"rgba(16,185,129,0.12)" };
}

export default function PageProduits({ toast }) {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [saving, setSaving]       = useState(false);
  const { isMobile }              = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // kind=product : la page ne montre que les articles physiques, jamais
      // les prestations, qui vivent sur leur propre écran.
      const [pRes, cRes] = await Promise.all([
        GET("/products?kind=product&limit=500"),
        GET("/categories?kind=product"),
      ]);
      setProducts(pRes.data || []);
      setCategories(cRes.data || []);
    } catch (e) { toast(e.message); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p =>
    (filterCat === "all" || p.category_id === filterCat) &&
    (!onlyAlerts || (parseInt(p.stock) || 0) <= (parseInt(p.stock_alert) || 0)) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const enRupture = products.filter(p => (parseInt(p.stock) || 0) <= 0).length;
  const enAlerte  = products.filter(p => {
    const s = parseInt(p.stock) || 0;
    return s > 0 && s <= (parseInt(p.stock_alert) || 0);
  }).length;
  const valeurStock = products.reduce(
    (s, p) => s + (parseInt(p.stock) || 0) * (parseFloat(p.price) || 0), 0
  );

  const openAdd  = () => { setEditItem(null); setForm({ ...EMPTY, category_id: categories[0]?.id || "" }); setShowForm(true); };
  const openEdit = (p) => {
    setEditItem(p);
    setForm({
      name: p.name, category_id: p.category_id || "", price: p.price,
      stock: String(p.stock ?? 0), stock_alert: String(p.stock_alert ?? 0),
      barcode: p.barcode || "", description: p.description || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || form.price === "") return toast("Nom et prix requis");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category_id: form.category_id || undefined,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        stock_alert: parseInt(form.stock_alert) || 0,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        kind: "product",
      };
      if (editItem) { await PUT(`/products/${editItem.id}`, payload); toast("Produit mis à jour", "success"); }
      else          { await POST("/products", payload);              toast("Produit ajouté", "success"); }
      setShowForm(false);
      await load();
    } catch (e) { toast(e.message); }
    finally { setSaving(false); }
  };

  // Réapprovisionnement rapide : le cas courant est d'ajouter des unités, pas
  // de ressaisir un stock absolu.
  const adjust = async (p, delta) => {
    const next = Math.max(0, (parseInt(p.stock) || 0) + delta);
    try {
      await PUT(`/products/${p.id}`, { stock: next });
      setProducts(list => list.map(x => x.id === p.id ? { ...x, stock: next } : x));
    } catch (e) { toast(e.message); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Désactiver « ${p.name} » ?\n\nIl disparaîtra de la caisse mais restera dans l'historique des ventes.`)) return;
    try { await DELETE(`/products/${p.id}`); toast("Produit désactivé", "success"); await load(); }
    catch (e) { toast(e.message); }
  };

  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div>
          <div style={c.pageTitle}>Produits</div>
          <div style={c.pageSub}>
            {products.length} produit{products.length !== 1 ? "s" : ""} — valeur du stock {fmt(valeurStock)}
          </div>
        </div>
        <button style={c.addBtn} onClick={openAdd}>+ Ajouter</button>
      </div>

      {/* Alertes : la raison d'être du suivi de stock */}
      {(enRupture > 0 || enAlerte > 0) && (
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
          {enRupture > 0 && (
            <button onClick={() => setOnlyAlerts(true)} style={{
              padding:"9px 15px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.3)",
              color:"#f87171", fontSize:13, fontWeight:800 }}>
              {enRupture} en rupture
            </button>
          )}
          {enAlerte > 0 && (
            <button onClick={() => setOnlyAlerts(true)} style={{
              padding:"9px 15px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.3)",
              color:"#f59e0b", fontSize:13, fontWeight:800 }}>
              {enAlerte} sous le seuil d'alerte
            </button>
          )}
          {onlyAlerts && (
            <button onClick={() => setOnlyAlerts(false)} style={{
              padding:"9px 15px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              background:"transparent", border:"1px solid rgba(255,255,255,0.12)",
              color:"#94a3b8", fontSize:13, fontWeight:700 }}>
              Tout afficher
            </button>
          )}
        </div>
      )}

      <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <input style={{ ...c.search, flex: isMobile ? "1 1 100%" : "0 0 280px" }}
          placeholder="Rechercher un produit…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[{ id:"all", name:"Toutes", color:"#f0c987" }, ...categories].map(cat => (
            <button key={cat.id}
              style={{ ...c.tab, ...(filterCat === cat.id
                ? { ...c.tabActive, borderColor:(cat.color || "#f0c987") + "88", color: cat.color || "#f0c987" }
                : {}) }}
              onClick={() => setFilterCat(cat.id)}>{cat.name}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={36} /></div> : (
        <div style={c.table}>
          {!isMobile && (
            <div style={c.tableHead}>
              <span style={{ flex:2.6 }}>Produit</span>
              <span style={{ flex:1.5 }}>Catégorie</span>
              <span style={{ flex:1, textAlign:"right" }}>Prix</span>
              <span style={{ flex:1.8, textAlign:"center" }}>Stock</span>
              <span style={{ flex:1.1, textAlign:"center" }}>État</span>
              <span style={{ flex:0.7, textAlign:"right" }}>Actions</span>
            </div>
          )}
          {filtered.length === 0 ? (
            <EmptyState text={products.length === 0
              ? "Aucun produit. Créez d'abord une catégorie de produits, puis vos articles."
              : "Aucun produit ne correspond"} />
          ) : filtered.map(p => {
            const st = stockState(p);
            return (
              <div key={p.id} style={{ ...c.tableRow, flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 8 : 0 }}>
                <span style={{ flex:2.6, fontWeight:700, fontSize:15 }}>
                  {p.name}
                  {p.barcode && <span style={{ display:"block", fontSize:11, color:"#475569", fontFamily:"monospace", marginTop:2 }}>{p.barcode}</span>}
                </span>
                <span style={{ flex:1.5 }}>
                  {p.category_name
                    ? <span style={{ ...c.chip, background:(p.category_color || "#888") + "22", color: p.category_color || "#888" }}>{p.category_name}</span>
                    : <span style={{ color:"#334155", fontSize:13 }}>—</span>}
                </span>
                <span style={{ flex:1, textAlign: isMobile ? "left" : "right", fontWeight:800,
                  color:"#f0c987", fontSize:15, fontVariantNumeric:"tabular-nums" }}>{fmt(p.price)}</span>

                <span style={{ flex:1.8, display:"flex", alignItems:"center", gap:7,
                  justifyContent: isMobile ? "flex-start" : "center" }}>
                  <button style={{ ...c.iconBtn, width:28, height:28 }} title="Retirer une unité"
                    onClick={() => adjust(p, -1)}>−</button>
                  <span style={{ minWidth:34, textAlign:"center", fontWeight:900, fontSize:16,
                    color: st.color, fontVariantNumeric:"tabular-nums" }}>{p.stock ?? 0}</span>
                  <button style={{ ...c.iconBtn, width:28, height:28 }} title="Ajouter une unité"
                    onClick={() => adjust(p, +1)}>+</button>
                </span>

                <span style={{ flex:1.1, textAlign: isMobile ? "left" : "center" }}>
                  <span style={{ fontSize:11.5, padding:"3px 10px", borderRadius:20,
                    background: st.bg, color: st.color, fontWeight:800 }}>{st.label}</span>
                </span>

                <span style={{ flex:0.7, display:"flex", gap:8, justifyContent: isMobile ? "flex-start" : "flex-end" }}>
                  <button style={c.iconBtn} onClick={() => openEdit(p)}>✎</button>
                  <button style={{ ...c.iconBtn, color:"#f87171" }} onClick={() => handleDelete(p)}>✕</button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editItem ? "Modifier le produit" : "Nouveau produit"} onClose={() => setShowForm(false)}>
          {categories.length === 0 && (
            <div style={{ padding:"12px 15px", borderRadius:9, marginBottom:16, fontSize:13,
              background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", color:"#f59e0b" }}>
              Aucune catégorie de produits n'existe encore. Créez-en une depuis l'écran
              Catégories, onglet « Produits ».
            </div>
          )}
          <div style={c.formGrid}>
            <div style={{ ...c.formGroup, gridColumn:"1/-1" }}>
              <label style={c.label}>Nom</label>
              <input style={c.input} value={form.name} autoFocus
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vernis semi-permanent rouge…" />
            </div>
            <div style={c.formGroup}>
              <label style={c.label}>Catégorie</label>
              <select style={c.input} value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div style={c.formGroup}>
              <label style={c.label}>Prix de vente (€)</label>
              <input style={c.input} type="number" step="0.01" min="0" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="12.00" />
            </div>
            <div style={c.formGroup}>
              <label style={c.label}>Stock actuel</label>
              <input style={c.input} type="number" min="0" value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            </div>
            <div style={c.formGroup}>
              <label style={c.label}>Seuil d'alerte</label>
              <input style={c.input} type="number" min="0" value={form.stock_alert}
                onChange={e => setForm(f => ({ ...f, stock_alert: e.target.value }))} />
              <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>
                En dessous, le produit est signalé à réapprovisionner
              </div>
            </div>
            <div style={c.formGroup}>
              <label style={c.label}>Code-barres</label>
              <input style={c.input} value={form.barcode}
                onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="3760123456789" />
            </div>
            <div style={{ ...c.formGroup, gridColumn:"1/-1" }}>
              <label style={c.label}>Description</label>
              <input style={c.input} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description courte…" />
            </div>
          </div>
          <ModalActions onCancel={() => setShowForm(false)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  );
}
