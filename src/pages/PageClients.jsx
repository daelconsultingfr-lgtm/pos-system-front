import { useState, useEffect, useRef, useCallback } from "react";
import { GET, POST, PUT, DELETE } from "../utils/api";
import { fmt, fmtShort, fmtDate, MONTHS, PMTS, PMT_COLORS } from "../utils/format";
import { c, navBtn, resetBtn } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { EmptyState, Modal, ModalActions } from "../components/UI";

export default function PageClients({ toast }) {
  const [clients, setClients]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [form, setForm]             = useState({name:"",email:"",phone:"",address:""});
  const [search, setSearch]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [pagination, setPagination] = useState({total:0});
  const { isMobile }                = useBreakpoint();

  const load = useCallback(async (s="") => {
    setLoading(true);
    try {
      const res = await GET(`/customers?search=${encodeURIComponent(s)}&limit=50`);
      setClients(res.data); setPagination(res.pagination);
    } catch(e) { toast(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{ const t=setTimeout(()=>load(search),350); return ()=>clearTimeout(t); },[search]);

  const openAdd  = () => { setEditItem(null); setForm({name:"",email:"",phone:"",address:""}); setShowForm(true); };
  const openEdit = (cl) => { setEditItem(cl); setForm({name:cl.name,email:cl.email||"",phone:cl.phone||"",address:cl.address||""}); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) return toast("Nom requis");
    setSaving(true);
    try {
      if (editItem) { await PUT(`/customers/${editItem.id}`,form); toast("Client mis à jour","success"); }
      else { await POST("/customers",form); toast("Client ajouté","success"); }
      setShowForm(false); await load(search);
    } catch(e) { toast(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div><div style={c.pageTitle}>Clients</div><div style={c.pageSub}>{pagination.total} clients enregistrés</div></div>
        <button style={c.addBtn} onClick={openAdd}>+ Ajouter</button>
      </div>
      <input style={{...c.search,marginBottom:20,width:isMobile?"100%":"320px"}}
        placeholder="Rechercher un client…" value={search} onChange={e=>setSearch(e.target.value)}/>
      {loading ? <div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner size={36}/></div> : (
        <div style={c.table}>
          {!isMobile && (
            <div style={c.tableHead}>
              <span style={{flex:3}}>Client</span><span style={{flex:2}}>Contact</span>
              <span style={{flex:1,textAlign:"center"}}>Points</span>
              <span style={{flex:1,textAlign:"right"}}>Total dépensé</span>
              <span style={{flex:0.5,textAlign:"right"}}>✎</span>
            </div>
          )}
          {clients.length===0 ? <EmptyState text="Aucun client trouvé"/> : clients.map(cl => (
            <div key={cl.id} style={{...c.tableRow,flexDirection:isMobile?"column":"row",gap:isMobile?8:0}}>
              <span style={{flex:3,display:"flex",alignItems:"center"}}><span style={c.avatar}>{(cl.name||"?")[0]}</span><span style={{fontWeight:700,fontSize:15}}>{cl.name}</span></span>
              <span style={{flex:2,color:"#94a3b8",fontSize:13}}><div>{cl.email}</div><div>{cl.phone}</div></span>
              <span style={{flex:1,textAlign:isMobile?"left":"center"}}><span style={c.loyaltyBadge}>⭐ {cl.loyalty_points||0}</span></span>
              <span style={{flex:1,textAlign:isMobile?"left":"right",fontWeight:800,color:"#f0c987",fontSize:15}}>{fmt(cl.total_spent||0)}</span>
              <span style={{flex:0.5,textAlign:isMobile?"left":"right"}}><button style={c.iconBtn} onClick={()=>openEdit(cl)}>✎</button></span>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <Modal title={editItem?"Modifier le client":"Nouveau client"} onClose={()=>setShowForm(false)}>
          <div style={c.formGrid}>
            {[["Nom complet *","name","text","Marie Dupont"],["Email","email","email","marie@…"],["Téléphone","phone","tel","06 12 34 56 78"],["Adresse","address","text","12 rue des Lilas…"]].map(([lbl,key,type,ph])=>(
              <div key={key} style={c.formGroup}><label style={c.label}>{lbl}</label><input style={c.input} type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}/></div>
            ))}
          </div>
          <ModalActions onCancel={()=>setShowForm(false)} onSave={handleSave} saving={saving}/>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE EMPLOYÉS
// ═══════════════════════════════════════════════════════════════════════════════
