import { useState, useEffect, useCallback } from "react";
import { GET, POST, PUT, DELETE } from "../utils/api";
import { fmt, MONTHS, PMTS, PMT_COLORS } from "../utils/format";
import { c } from "../utils/styles";
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
  const [confirmDelete, setConfirmDelete] = useState(null); // client à supprimer
  const [deleting, setDeleting]     = useState(false);
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

  const openAdd  = () => { setEditItem(null); setForm({name:"",email:"",phone:"",address:"",loyalty_points:0}); setShowForm(true); };
  const openEdit = (cl) => { setEditItem(cl); setForm({name:cl.name,email:cl.email||"",phone:cl.phone||"",address:cl.address||"",loyalty_points:cl.loyalty_points||0}); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) return toast("Nom requis");
    setSaving(true);
    try {
      if (editItem) { await PUT(`/customers/${editItem.id}`,{...form,loyalty_points:parseInt(form.loyalty_points)||0}); toast("Client mis à jour","success"); }
      else { await POST("/customers",form); toast("Client ajouté","success"); }
      setShowForm(false); await load(search);
    } catch(e) { toast(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await DELETE(`/customers/${confirmDelete.id}`);
      toast("Client supprimé","success");
      setConfirmDelete(null);
      await load(search);
    } catch(e) { toast(e.message); }
    finally { setDeleting(false); }
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
              <span style={{flex:0.5,textAlign:"right"}}>Actions</span>
            </div>
          )}
          {clients.length===0 ? <EmptyState text="Aucun client trouvé"/> : clients.map(cl => (
            <div key={cl.id} style={{...c.tableRow,flexDirection:isMobile?"column":"row",gap:isMobile?8:0}}>
              <span style={{flex:3,display:"flex",alignItems:"center"}}><span style={c.avatar}>{(cl.name||"?")[0]}</span><span style={{fontWeight:700,fontSize:15}}>{cl.name}</span></span>
              <span style={{flex:2,color:"#94a3b8",fontSize:13}}><div>{cl.email}</div><div>{cl.phone}</div></span>
              <span style={{flex:1,textAlign:isMobile?"left":"center"}}><span style={c.loyaltyBadge}>⭐ {cl.loyalty_points||0}</span></span>
              <span style={{flex:1,textAlign:isMobile?"left":"right",fontWeight:800,color:"#f0c987",fontSize:15}}>{fmt(cl.total_spent||0)}</span>
              <span style={{flex:0.5,textAlign:isMobile?"left":"right",display:"flex",gap:6,justifyContent:isMobile?"flex-start":"flex-end"}}>
                <button style={c.iconBtn} onClick={()=>openEdit(cl)}>✎</button>
                <button style={{...c.iconBtn,color:"#f87171",borderColor:"rgba(248,113,113,0.2)"}} onClick={()=>setConfirmDelete(cl)}>🗑</button>
              </span>
            </div>
          ))}
        </div>
      )}
      {confirmDelete && (
        <Modal title="Supprimer le client" onClose={()=>setConfirmDelete(null)}>
          <div style={{textAlign:"center",padding:"10px 0 20px"}}>
            <div style={{fontSize:40,marginBottom:14}}>🗑</div>
            <div style={{fontSize:15,fontWeight:700,color:"#f8fafc",marginBottom:8}}>
              Supprimer <span style={{color:"#f87171"}}>{confirmDelete.name}</span> ?
            </div>
            <div style={{fontSize:13,color:"#64748b",lineHeight:1.6}}>
              Cette action est irréversible.<br/>
              L'historique des commandes associées sera conservé.
            </div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button style={{padding:"11px 18px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#94a3b8",fontSize:14,cursor:"pointer",fontWeight:600}}
              onClick={()=>setConfirmDelete(null)}>Annuler</button>
            <button style={{padding:"11px 22px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#f87171,#ef4444)",color:"#fff",fontSize:14,cursor:"pointer",fontWeight:900,display:"flex",alignItems:"center",gap:8}}
              onClick={handleDelete} disabled={deleting}>
              {deleting && <Spinner size={14} color="#fff"/>}
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
      {showForm && (
        <Modal title={editItem?"Modifier le client":"Nouveau client"} onClose={()=>setShowForm(false)}>
          <div style={c.formGrid}>
            {[["Nom complet *","name","text","Marie Dupont"],["Email","email","email","marie@…"],["Téléphone","phone","tel","06 12 34 56 78"],["Adresse","address","text","12 rue des Lilas…"]].map(([lbl,key,type,ph])=>(
              <div key={key} style={c.formGroup}><label style={c.label}>{lbl}</label><input style={c.input} type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}/></div>
            ))}
            {editItem && (
              <div style={c.formGroup}>
                <label style={c.label}>Points de fidélité ⭐</label>
                <input style={c.input} type="number" min="0" max="100"
                  value={form.loyalty_points}
                  onChange={e=>setForm(f=>({...f,loyalty_points:parseInt(e.target.value)||0}))}
                  placeholder="0"/>
                <div style={{fontSize:11,color:"#64748b",marginTop:4}}>
                  5 pts = −10% · 10 pts = −25% automatique
                </div>
              </div>
            )}
          </div>
          <ModalActions onCancel={()=>setShowForm(false)} onSave={handleSave} saving={saving}/>
        </Modal>
      )}
    </div>
  );
}