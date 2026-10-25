
// ═══════════════════════════════════════════════════════════════════════════════
// PAGE PRESTATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function PagePrestations({ toast }) {
  const [services, setServices]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [form, setForm]             = useState({ name:"", category_id:"", duration:"", price:"", description:"" });
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState("all");
  const [saving, setSaving]         = useState(false);
  const { isMobile }                = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes,cRes] = await Promise.all([GET("/products?limit=200"), GET("/categories")]);
      setServices(sRes.data); setCategories(cRes.data);
    } catch(e) { toast(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = services.filter(s =>
    (filterCat==="all" || s.category_id===filterCat) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd  = () => { setEditItem(null); setForm({ name:"", category_id:categories[0]?.id||"", duration:"", price:"", description:"" }); setShowForm(true); };
  const openEdit = (sv) => { setEditItem(sv); setForm({ name:sv.name, category_id:sv.category_id, duration:sv.duration||"", price:sv.price, description:sv.description||"" }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name||!form.price) return toast("Nom et prix requis");
    setSaving(true);
    try {
      if (editItem) { await PUT(`/products/${editItem.id}`, {...editItem,...form,price:parseFloat(form.price)}); toast("Prestation mise à jour","success"); }
      else { await POST("/products", {...form,price:parseFloat(form.price)}); toast("Prestation ajoutée","success"); }
      setShowForm(false); await load();
    } catch(e) { toast(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (sv) => {
    if (!window.confirm(`Désactiver « ${sv.name} » ?`)) return;
    try { await DELETE(`/products/${sv.id}`); toast("Désactivée","success"); await load(); }
    catch(e) { toast(e.message); }
  };

  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div>
          <div style={c.pageTitle}>Prestations</div>
          <div style={c.pageSub}>{services.length} prestations enregistrées</div>
        </div>
        <button style={c.addBtn} onClick={openAdd}>+ Ajouter</button>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <input style={{ ...c.search, flex:isMobile?"1 1 100%":"0 0 280px" }}
          placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[{id:"all",name:"Toutes",color:"#f0c987"},...categories].map(cat => (
            <button key={cat.id} style={{ ...c.tab, ...(filterCat===cat.id?{...c.tabActive,borderColor:(cat.color||"#f0c987")+"88",color:cat.color||"#f0c987"}:{}) }}
              onClick={()=>setFilterCat(cat.id)}>{cat.name}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ display:"flex",justifyContent:"center",padding:60 }}><Spinner size={36}/></div> : (
        <div style={c.table}>
          {!isMobile && (
            <div style={c.tableHead}>
              <span style={{flex:3}}>Prestation</span><span style={{flex:2}}>Catégorie</span>
              <span style={{flex:1}}>Durée</span><span style={{flex:1,textAlign:"right"}}>Prix</span>
              <span style={{flex:0.6,textAlign:"right"}}>Actions</span>
            </div>
          )}
          {filtered.length===0 ? <EmptyState text="Aucune prestation trouvée"/> : filtered.map(sv => (
            <div key={sv.id} style={{ ...c.tableRow, flexDirection:isMobile?"column":"row", alignItems:isMobile?"flex-start":"center", gap:isMobile?8:0 }}>
              <span style={{flex:3,fontWeight:700,fontSize:15}}>{sv.name}</span>
              {sv.category_name && <span style={{flex:2}}><span style={{...c.chip,background:(sv.category_color||"#888")+"22",color:sv.category_color||"#888"}}>{sv.category_name}</span></span>}
              <span style={{flex:1,color:"#94a3b8",fontSize:13}}>{sv.duration||"—"} min</span>
              <span style={{flex:1,textAlign:isMobile?"left":"right",fontWeight:800,color:"#f0c987",fontSize:16}}>{fmt(sv.price)}</span>
              <span style={{flex:0.6,display:"flex",gap:8,justifyContent:isMobile?"flex-start":"flex-end"}}>
                <button style={c.iconBtn} onClick={()=>openEdit(sv)}>✎</button>
                <button style={{...c.iconBtn,color:"#f87171"}} onClick={()=>handleDelete(sv)}>✕</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editItem?"Modifier la prestation":"Nouvelle prestation"} onClose={()=>setShowForm(false)}>
          <div style={c.formGrid}>
            <div style={{...c.formGroup,gridColumn:"1/-1"}}><label style={c.label}>Nom</label><input style={c.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Soin hydratant…"/></div>
            <div style={c.formGroup}><label style={c.label}>Catégorie</label><select style={c.input} value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))}><option value="">— Sélectionner —</option>{categories.map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
            <div style={c.formGroup}><label style={c.label}>Durée</label><input style={c.input} value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="45 min"/></div>
            <div style={c.formGroup}><label style={c.label}>Prix (€)</label><input style={c.input} type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="65"/></div>
            <div style={c.formGroup}><label style={c.label}>Description</label><input style={c.input} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Description courte…"/></div>
          </div>
          <ModalActions onCancel={()=>setShowForm(false)} onSave={handleSave} saving={saving}/>
        </Modal>
      )}
    </div>
  );
}
