import { useState, useEffect, useRef, useCallback } from "react";
import { GET, POST, PUT, DELETE } from "../utils/api";
import { fmt, fmtShort, fmtDate, MONTHS, PMTS, PMT_COLORS } from "../utils/format";
import { c, navBtn, resetBtn } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { EmptyState, Modal, ModalActions } from "../components/UI";

export default function PageCategories({ toast }) {
  const [cats, setCats]         = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState({ name:"", color:"#f0c987", icon:"✦" });
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes,pRes] = await Promise.all([GET("/categories"),GET("/products?limit=500")]);
      setCats(cRes.data); setProducts(pRes.data);
    } catch(e) { toast(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{load();},[load]);

  const countFor = (id) => products.filter(p=>p.category_id===id).length;
  const openAdd  = () => { setEditItem(null); setForm({name:"",color:"#f0c987",icon:"✦"}); setShowForm(true); };
  const openEdit = (cat) => { setEditItem(cat); setForm({name:cat.name,color:cat.color||"#f0c987",icon:cat.icon||"✦"}); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) return toast("Nom requis");
    setSaving(true);
    try {
      if (editItem) { await PUT(`/categories/${editItem.id}`,form); toast("Mise à jour","success"); }
      else { await POST("/categories",form); toast("Catégorie ajoutée","success"); }
      setShowForm(false); await load();
    } catch(e) { toast(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div><div style={c.pageTitle}>Catégories</div><div style={c.pageSub}>{cats.length} catégories</div></div>
        <button style={c.addBtn} onClick={openAdd}>+ Ajouter</button>
      </div>
      {loading ? <div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner size={36}/></div> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
          {cats.map(cat => {
            const count = countFor(cat.id);
            return (
              <div key={cat.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${cat.color||"#888"}44`,
                borderRadius:15,padding:"22px",cursor:"pointer",transition:"all 0.15s"}}
                onClick={()=>openEdit(cat)} className="card-hover">
                <div style={{width:46,height:46,borderRadius:12,background:(cat.color||"#888")+"22",
                  color:cat.color||"#888",display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:22,marginBottom:13}}>{cat.icon||"✦"}</div>
                <div style={{fontSize:16,fontWeight:700,color:"#f8fafc",marginBottom:4}}>{cat.name}</div>
                <div style={{fontSize:13,color:"#64748b",marginBottom:10}}>{count} prestation{count!==1?"s":""}</div>
                <div style={{height:5,borderRadius:4,background:"rgba(255,255,255,0.06)"}}>
                  <div style={{width:`${Math.min(100,count*14)}%`,height:"100%",background:cat.color||"#888",borderRadius:4}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <Modal title={editItem?"Modifier la catégorie":"Nouvelle catégorie"} onClose={()=>setShowForm(false)}>
          <div style={c.formGrid}>
            <div style={c.formGroup}><label style={c.label}>Nom</label><input style={c.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Soins visage…"/></div>
            <div style={c.formGroup}><label style={c.label}>Icône</label><input style={c.input} value={form.icon} onChange={e=>setForm(f=>({...f,icon:e.target.value}))} placeholder="✦"/></div>
            <div style={c.formGroup}><label style={c.label}>Couleur</label>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{width:50,height:44,borderRadius:9,border:"none",cursor:"pointer"}}/>
                <div style={{width:34,height:34,borderRadius:9,background:form.color}}/>
              </div>
            </div>
          </div>
          <ModalActions onCancel={()=>setShowForm(false)} onSave={handleSave} saving={saving}/>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE CLIENTS
// ═══════════════════════════════════════════════════════════════════════════════
