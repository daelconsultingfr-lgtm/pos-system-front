import { useState, useEffect, useCallback } from "react";
import { GET, PUT, DELETE, getToken } from "../utils/api";
import { fmt, fmtDate, MONTHS, PMTS, PMT_COLORS } from "../utils/format";
import { c, navBtn, resetBtn } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { EmptyState } from "../components/UI";

const PMT_LIST = [
  { key:"card",        label:"Carte bancaire", icon:"💳", color:"#6366f1" },
  { key:"cash",        label:"Espèces",        icon:"💵", color:"#10b981" },
  { key:"contactless", label:"Sans contact",   icon:"📲", color:"#38bdf8" },
  { key:"check",       label:"Chèque",         icon:"🖊",  color:"#94a3b8" },
  { key:"treatwell",   label:"Treatwell",      icon:"🌿", color:"#8b5cf6" },
  { key:"planity",     label:"Planity",        icon:"📅", color:"#f59e0b" },
];

// ─── Ligne de prestation éditable ────────────────────────────────────────────
function ItemRow({ item, services, onChange, onRemove }) {
  const [search, setSearch] = useState("");
  const [open,   setOpen]   = useState(false);
  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  return (
    <div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"10px 0",
      borderBottom:"1px solid rgba(255,255,255,0.05)"}}>

      {/* Prestation */}
      <div style={{flex:2,position:"relative"}}>
        {item.product_id ? (
          <div style={{padding:"9px 12px",borderRadius:9,
            background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
            fontSize:13,fontWeight:600,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</span>
            <button style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",
              fontSize:12,flexShrink:0,marginLeft:6}}
              onClick={()=>onChange({...item,product_id:"",name:""})}>✎</button>
          </div>
        ) : (
          <>
            <input style={{...c.input,width:"100%",fontSize:13}}
              placeholder="Rechercher…"
              value={search}
              onChange={e=>{setSearch(e.target.value);setOpen(true);}}
              onFocus={()=>setOpen(true)}
              onBlur={()=>setTimeout(()=>setOpen(false),150)}/>
            {open && filtered.length>0 && (
              <div style={{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,
                background:"#0d1117",border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:10,zIndex:50,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.6)"}}>
                {filtered.map(s=>(
                  <div key={s.id}
                    style={{padding:"9px 13px",cursor:"pointer",fontSize:13,
                      display:"flex",justifyContent:"space-between",alignItems:"center"}}
                    onMouseDown={e=>{
                      e.preventDefault();
                      onChange({...item,product_id:s.id,name:s.name,
                        unit_price:parseFloat(s.price),
                        subtotal:parseFloat(s.price)*item.quantity});
                      setSearch(""); setOpen(false);
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{fontWeight:600}}>{s.name}</span>
                    <span style={{color:"#f0c987",fontWeight:700,fontSize:12}}>{fmt(s.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quantité */}
      <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
        <button style={{width:26,height:26,borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",
          background:"transparent",color:"#cbd5e1",fontSize:15,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>{const q=Math.max(1,item.quantity-1);onChange({...item,quantity:q,subtotal:item.unit_price*q});}}>−</button>
        <span style={{width:22,textAlign:"center",fontSize:13,fontWeight:700}}>{item.quantity}</span>
        <button style={{width:26,height:26,borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",
          background:"transparent",color:"#cbd5e1",fontSize:15,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>{const q=item.quantity+1;onChange({...item,quantity:q,subtotal:item.unit_price*q});}}>+</button>
      </div>

      {/* Prix unitaire */}
      <input type="number" min="0" step="0.01"
        style={{...c.input,padding:"7px 10px",fontSize:13,width:82,flexShrink:0}}
        value={item.unit_price}
        onChange={e=>{const p=parseFloat(e.target.value)||0;onChange({...item,unit_price:p,subtotal:p*item.quantity});}}/>

      {/* Sous-total */}
      <div style={{width:72,textAlign:"right",flexShrink:0,
        fontSize:13,fontWeight:800,color:"#f0c987",paddingTop:9}}>
        {fmt(item.unit_price*item.quantity)}
      </div>

      {/* Supprimer */}
      <button style={{...c.iconBtn,color:"#f87171",flexShrink:0,paddingTop:6}}
        onClick={onRemove}>✕</button>
    </div>
  );
}

// ─── Page Recettes ────────────────────────────────────────────────────────────
export default function PageRecettes({ toast }) {
  const now0     = new Date();
  const curYear  = now0.getFullYear();
  const curMonth = now0.getMonth();
  const years    = Array.from({length:5},(_,i)=>curYear-i);

  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selMonth,   setSelMonth]   = useState(curMonth);
  const [selYear,    setSelYear]    = useState(curYear);
  const [search,     setSearch]     = useState("");
  const [exporting,  setExporting]  = useState(false);

  // modal
  const [editOrder,    setEditOrder]    = useState(null);
  const [editForm,     setEditForm]     = useState({});
  const [editItems,    setEditItems]    = useState([]);
  const [services,     setServices]     = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [custSearch,   setCustSearch]   = useState("");
  const [custList,     setCustList]     = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const { isMobile } = useBreakpoint();

  const atCurrentMonth = selYear===curYear && selMonth===curMonth;
  const prevMonth = () => { if(selMonth===0){setSelMonth(11);setSelYear(y=>y-1);}else setSelMonth(m=>m-1); };
  const nextMonth = () => {
    if(atCurrentMonth) return;
    if(selMonth===11){setSelMonth(0);setSelYear(y=>y+1);}else setSelMonth(m=>m+1);
  };

  const load = useCallback(async (month, year) => {
    setLoading(true);
    try {
      const f  = `${year}-${String(month+1).padStart(2,"0")}-01`;
      const ld = new Date(year,month+1,0).getDate();
      const t  = `${year}-${String(month+1).padStart(2,"0")}-${String(ld).padStart(2,"0")}`;
      const [oRes, eRes, sRes] = await Promise.all([
        GET(`/orders?from=${f}&to=${t}&limit=500&date_field=order_date`),
        GET(`/employees`),
        GET(`/products?limit=500`),
      ]);
      setOrders(oRes.data||[]);
      setEmployees(eRes.data||[]);
      setServices(sRes.data||[]);
    } catch(e){ toast(e.message); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(selMonth,selYear); },[selMonth,selYear]);

  useEffect(()=>{
    if(custSearch.length<2){setCustList([]);return;}
    const t=setTimeout(async()=>{
      try{const r=await GET(`/customers?search=${encodeURIComponent(custSearch)}&limit=8`);setCustList(r.data||[]);}catch{}
    },300);
    return()=>clearTimeout(t);
  },[custSearch]);

  const openEdit = async (order) => {
    setLoadingOrder(true);
    setEditOrder(order);
    setEditForm({
      order_date:      (order.order_date||order.created_at||"").split("T")[0],
      notes:           order.notes||"",
      discount_amount: parseFloat(order.discount_amount)||0,
      customer_id:     order.customer_id||"",
      customer_name:   order.customer_name||"",
      employee_id:     String(order.cashier_id||""),
      employee_name:   order.employee_name||"",
      payment_method:  order.payment_method||"card",
      amount_paid:     parseFloat(order.total)||0,
    });
    setCustSearch(""); setCustList([]);
    try {
      const res = await GET(`/orders/${order.id}`);
      const raw = res.data?.items || res.data?.order_items || [];
      setEditItems(raw.map(i=>({
        id:         i.id,
        product_id: i.product_id,
        name:       i.product_name||i.name||"",
        quantity:   i.quantity||1,
        unit_price: parseFloat(i.unit_price||i.price||0),
        subtotal:   parseFloat(i.subtotal||0)||parseFloat(i.unit_price||i.price||0)*(i.quantity||1),
      })));
    } catch { setEditItems([]); }
    setLoadingOrder(false);
  };

  const updateItem = (idx, item) => setEditItems(p=>p.map((it,i)=>i===idx?item:it));
  const removeItem = (idx)       => setEditItems(p=>p.filter((_,i)=>i!==idx));
  const addItem    = ()          => setEditItems(p=>[...p,{product_id:"",name:"",quantity:1,unit_price:0,subtotal:0}]);

  const itemsSubtotal = editItems.reduce((s,i)=>s+i.unit_price*i.quantity,0);
  const discount      = parseFloat(editForm.discount_amount)||0;
  const computedTotal = Math.max(0,itemsSubtotal-discount);

  const handleSave = async () => {
    if(!editForm.payment_method) return toast("Choisissez un mode de paiement");
    setSaving(true);
    try {
      await PUT(`/orders/${editOrder.id}`,{
        order_date:      editForm.order_date,
        notes:           editForm.notes||undefined,
        discount_amount: discount,
        customer_id:     editForm.customer_id||undefined,
        employee_id:     editForm.employee_id||undefined,
        payment_method:  editForm.payment_method,
        amount_paid:     parseFloat(editForm.amount_paid)||computedTotal,
        items: editItems
          .filter(i=>i.product_id)
          .map(i=>({product_id:i.product_id,quantity:i.quantity,unit_price:i.unit_price})),
      });
      toast("Vente mise à jour","success");
      setEditOrder(null);
      await load(selMonth,selYear);
    } catch(e){ toast(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (order) => {
    if(!window.confirm(`Supprimer la vente ${order.order_number||"#"+order.id} (${fmt(order.total)}) ?`)) return;
    try { await DELETE(`/orders/${order.id}`); toast("Vente supprimée","success"); await load(selMonth,selYear); }
    catch(e){ toast(e.message); }
  };

  const filtered     = orders.filter(o=>{
    if(!search) return true;
    const q=search.toLowerCase();
    return (o.order_number||"").toLowerCase().includes(q)||(o.customer_name||"").toLowerCase().includes(q)||(o.employee_name||"").toLowerCase().includes(q);
  });
  const totalCA      = filtered.reduce((s,o)=>s+parseFloat(o.total||0),0);
  const totalRemises = filtered.reduce((s,o)=>s+parseFloat(o.discount_amount||0),0);

  const exportXLSX = async () => {
    if (!filtered.length) return toast("Aucune recette à exporter");
    setExporting(true);
    try {
      const mm = String(selMonth + 1).padStart(2, "0");
      const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin",
                         "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
      const PMT_LABELS = { card:"Carte", cash:"Espèces", contactless:"Sans contact",
                           check:"Chèque", treatwell:"Treatwell", planity:"Planity" };

      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const wb   = XLSX.utils.book_new();

      // ── Feuille Recettes ──
      const wsData = [
        [`Recettes — ${MONTHS_FR[selMonth]} ${selYear}`],
        [],
        ["Date","N° commande","Client","Employé","Mode paiement","Sous-total (€)","Remise (€)","Total (€)"],
        ...filtered.map(o => [
          (o.order_date || o.created_at || "").split("T")[0],
          o.order_number || String(o.id),
          o.customer_name || "",
          o.employee_name || "",
          PMT_LABELS[o.payment_method] || o.payment_method || "",
          parseFloat(o.subtotal || 0),
          parseFloat(o.discount_amount || 0),
          parseFloat(o.total || 0),
        ]),
        [],
        ["","","","","","Remises totales :", totalRemises, ""],
        ["","","","","","TOTAL CA :", "", totalCA],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [{wch:14},{wch:16},{wch:24},{wch:20},{wch:16},{wch:16},{wch:12},{wch:14}];
      ws["!merges"] = [{ s:{r:0,c:0}, e:{r:0,c:7} }];
      XLSX.utils.book_append_sheet(wb, ws, "Recettes");

      // ── Feuille Résumé par mode de paiement ──
      const byPmt = {};
      filtered.forEach(o => {
        const k = PMT_LABELS[o.payment_method] || o.payment_method || "Autre";
        byPmt[k] = (byPmt[k] || 0) + parseFloat(o.total || 0);
      });
      const summaryData = [
        [`Résumé — ${MONTHS_FR[selMonth]} ${selYear}`],
        [],
        ["Mode de paiement", "Total (€)", "% du CA"],
        ...Object.entries(byPmt).map(([k,v]) => [
          k, v, totalCA > 0 ? parseFloat(((v/totalCA)*100).toFixed(1)) : 0
        ]),
        [],
        ["TOTAL", totalCA, 100],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary["!cols"] = [{wch:20},{wch:14},{wch:12}];
      wsSummary["!merges"] = [{ s:{r:0,c:0}, e:{r:0,c:2} }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé paiements");

      XLSX.writeFile(wb, `recettes_${selYear}_${mm}.xlsx`);
    } catch(e) {
      console.error(e);
      toast("Erreur export : " + e.message);
    } finally { setExporting(false); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div>
          <div style={c.pageTitle}>Recettes</div>
          <div style={c.pageSub}>{MONTHS[selMonth]} {selYear} — <span style={{color:"#f0c987",fontWeight:800}}>{fmt(totalCA)}</span></div>
        </div>
        <button onClick={exportXLSX} disabled={exporting||loading}
          style={{padding:"10px 18px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",
            background:"rgba(255,255,255,0.05)",color:"#94a3b8",fontSize:13,fontWeight:700,
            cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"inherit"}}>
          {exporting?<Spinner size={14}/>:<span>⬇</span>} Export XLSX
        </button>
      </div>

      {/* Sélecteur mois */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <div style={{display:"flex",gap:8}}>
          <select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))}
            style={{...c.input,padding:"8px 12px",fontSize:14,fontWeight:700,cursor:"pointer",minWidth:120}}>
            {MONTHS.map((m,i)=><option key={i} value={i} disabled={selYear===curYear&&i>curMonth}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))}
            style={{...c.input,padding:"8px 12px",fontSize:14,fontWeight:700,cursor:"pointer",minWidth:80}}>
            {years.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={nextMonth} disabled={atCurrentMonth}
          style={{...navBtn,opacity:atCurrentMonth?0.3:1,cursor:atCurrentMonth?"not-allowed":"pointer"}}>›</button>
        {!atCurrentMonth&&<button onClick={()=>{setSelMonth(curMonth);setSelYear(curYear);}} style={resetBtn}>Mois actuel</button>}
        <div style={{marginLeft:"auto",fontSize:13,color:"#64748b"}}>{filtered.length} vente{filtered.length!==1?"s":""}</div>
      </div>

      {/* KPIs */}
      {!loading&&orders.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:16}}>
          {[{label:"Total CA",val:totalCA,color:"#f0c987"},{label:"Nb ventes",val:filtered.length,color:"#818cf8",isCt:true},{label:"Panier moyen",val:filtered.length?totalCA/filtered.length:0,color:"#34d399"},{label:"Remises",val:totalRemises,color:"#f87171"}]
            .map(k=>(
              <div key={k.label} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${k.color}33`,borderRadius:12,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:900,color:k.color}}>{k.isCt?k.val:fmt(k.val)}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:3}}>{k.label}</div>
              </div>
            ))}
        </div>
      )}

      {/* Recherche */}
      <div style={{position:"relative",marginBottom:14}}>
        <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#475569",pointerEvents:"none"}}>🔍</span>
        <input style={{...c.input,width:"100%",paddingLeft:34,fontSize:13}}
          placeholder="Rechercher par n° commande, client, employé…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14}}>✕</button>}
      </div>

      {/* Tableau */}
      {loading?<div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner size={36}/></div>
        :filtered.length===0?<EmptyState icon="◑" text="Aucune vente ce mois"/>
        :(
          <div style={c.table}>
            {!isMobile&&(
              <div style={c.tableHead}>
                <span style={{flex:0.8}}>Date</span>
                <span style={{flex:1}}>N° commande</span>
                <span style={{flex:1.4}}>Client</span>
                <span style={{flex:1.2}}>Employé</span>
                <span style={{flex:1}}>Paiement</span>
                <span style={{flex:0.8,textAlign:"right"}}>Remise</span>
                <span style={{flex:1,textAlign:"right"}}>Total</span>
                <span style={{flex:0.5,textAlign:"right"}}>Actions</span>
              </div>
            )}
            {filtered.map(order=>{
              const pmtColor=PMT_COLORS[order.payment_method]||"#64748b";
              const dateStr=fmtDate(order.order_date||order.created_at);
              return(
                <div key={order.id} style={{...c.tableRow,flexDirection:isMobile?"column":"row",gap:isMobile?6:0,alignItems:isMobile?"flex-start":"center"}}>
                  {isMobile?(
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",width:"100%",alignItems:"center"}}>
                        <span style={{fontSize:12,color:"#64748b"}}>{dateStr}</span>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <span style={{fontWeight:900,color:"#f0c987",fontSize:16}}>{fmt(order.total)}</span>
                          <button style={c.iconBtn} onClick={()=>openEdit(order)}>✎</button>
                          <button style={{...c.iconBtn,color:"#f87171"}} onClick={()=>handleDelete(order)}>✕</button>
                        </div>
                      </div>
                      <div style={{fontSize:14,fontWeight:700}}>{order.order_number||`#${order.id}`}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {order.customer_name&&<span style={{fontSize:12,color:"#94a3b8"}}>◉ {order.customer_name}</span>}
                        {order.employee_name&&<span style={{fontSize:12,color:"#818cf8"}}>⟡ {order.employee_name}</span>}
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:pmtColor+"18",color:pmtColor,fontWeight:600}}>{PMTS[order.payment_method]||order.payment_method||"—"}</span>
                      </div>
                    </>
                  ):(
                    <>
                      <span style={{flex:0.8,fontSize:13,color:"#64748b"}}>{dateStr}</span>
                      <span style={{flex:1,fontSize:13,fontWeight:700,color:"#94a3b8"}}>{order.order_number||`#${order.id}`}</span>
                      <span style={{flex:1.4,fontSize:14}}>{order.customer_name||<span style={{color:"#334155"}}>—</span>}</span>
                      <span style={{flex:1.2,fontSize:13,color:"#818cf8"}}>{order.employee_name||<span style={{color:"#334155"}}>—</span>}</span>
                      <span style={{flex:1}}><span style={{fontSize:12,padding:"3px 9px",borderRadius:20,background:pmtColor+"18",color:pmtColor,fontWeight:600}}>{PMTS[order.payment_method]||order.payment_method||"—"}</span></span>
                      <span style={{flex:0.8,textAlign:"right",fontSize:13,color:"#f59e0b"}}>{parseFloat(order.discount_amount||0)>0?"−"+fmt(order.discount_amount):"—"}</span>
                      <span style={{flex:1,textAlign:"right",fontWeight:900,fontSize:15,color:"#f0c987"}}>{fmt(order.total)}</span>
                      <span style={{flex:0.5,display:"flex",gap:6,justifyContent:"flex-end"}}>
                        <button style={c.iconBtn} onClick={()=>openEdit(order)}>✎</button>
                        <button style={{...c.iconBtn,color:"#f87171"}} onClick={()=>handleDelete(order)}>✕</button>
                      </span>
                    </>
                  )}
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:4}}>
              <span style={{fontSize:13,fontWeight:700,color:"#64748b"}}>{filtered.length} vente{filtered.length!==1?"s":""}</span>
              {totalRemises>0&&<span style={{fontSize:13,color:"#f59e0b"}}>Remises : −{fmt(totalRemises)}</span>}
              <span style={{fontWeight:900,fontSize:16,color:"#f0c987"}}>{fmt(totalCA)}</span>
            </div>
          </div>
        )
      }

      {/* ══════════ MODAL MODIFICATION ══════════ */}
      {editOrder&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:100,
          display:"flex",alignItems:"center",justifyContent:"center",
          backdropFilter:"blur(6px)",padding:16}}>
          <div style={{background:"#0d1117",border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:20,width:"100%",maxWidth:700,maxHeight:"93vh",
            overflowY:"auto",display:"flex",flexDirection:"column"}}>

            {/* En-tête */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"22px 28px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",flexShrink:0}}>
              <div>
                <div style={{fontSize:17,fontWeight:900,color:"#f8fafc"}}>Modifier la vente</div>
                <div style={{fontSize:13,color:"#64748b",marginTop:2}}>{editOrder.order_number||"#"+editOrder.id}</div>
              </div>
              <button style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:9,color:"#64748b",cursor:"pointer",fontSize:18,
                width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center"}}
                onClick={()=>setEditOrder(null)}>✕</button>
            </div>

            {loadingOrder?(
              <div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner size={36}/></div>
            ):(
              <div style={{padding:"22px 28px",display:"flex",flexDirection:"column",gap:22}}>

                {/* ── 1. Infos générales ── */}
                <section>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#475569",marginBottom:12}}>Informations générales</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div style={c.formGroup}>
                      <label style={c.label}>Date de la vente</label>
                      <input type="date" style={c.input} value={editForm.order_date}
                        max={new Date().toISOString().split("T")[0]}
                        onChange={e=>setEditForm(f=>({...f,order_date:e.target.value}))}/>
                    </div>
                    <div style={c.formGroup}>
                      <label style={c.label}>Employé</label>
                      <select style={c.input} value={editForm.employee_id}
                        onChange={e=>{const emp=employees.find(em=>String(em.id)===e.target.value);setEditForm(f=>({...f,employee_id:e.target.value,employee_name:emp?.name||""}));}}>
                        <option value="">— Aucun —</option>
                        {employees.map(emp=><option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                    <div style={{...c.formGroup,gridColumn:"1/-1"}}>
                      <label style={c.label}>Client</label>
                      {editForm.customer_id?(
                        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:"rgba(240,201,135,0.08)",border:"1px solid rgba(240,201,135,0.2)"}}>
                          <span style={c.avatar}>{(editForm.customer_name||"?")[0]}</span>
                          <span style={{flex:1,fontSize:14,fontWeight:600}}>{editForm.customer_name}</span>
                          <button style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16}} onClick={()=>setEditForm(f=>({...f,customer_id:"",customer_name:""}))}>✕</button>
                        </div>
                      ):(
                        <div style={{position:"relative"}}>
                          <input style={c.input} placeholder="Rechercher un client…" value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
                          {custList.length>0&&(
                            <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#0d1117",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,zIndex:30,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
                              {custList.map(cl=>(
                                <div key={cl.id} style={{padding:"10px 14px",cursor:"pointer",fontSize:14,display:"flex",justifyContent:"space-between"}}
                                  onMouseDown={e=>{e.preventDefault();setEditForm(f=>({...f,customer_id:cl.id,customer_name:cl.name}));setCustSearch("");setCustList([]);}}
                                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                  <span style={{fontWeight:600}}>{cl.name}</span>
                                  <span style={{color:"#64748b",fontSize:12}}>{cl.phone}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{...c.formGroup,gridColumn:"1/-1"}}>
                      <label style={c.label}>Notes</label>
                      <input style={c.input} placeholder="Remarques…" value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))}/>
                    </div>
                  </div>
                </section>

                {/* ── 2. Prestations ── */}
                <section>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#475569"}}>Prestations</div>
                    <button onClick={addItem}
                      style={{padding:"5px 14px",borderRadius:8,border:"1px solid rgba(240,201,135,0.3)",
                        background:"rgba(240,201,135,0.08)",color:"#f0c987",fontSize:12,
                        fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      + Ajouter
                    </button>
                  </div>
                  <div style={{display:"flex",gap:8,padding:"0 0 6px",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#475569"}}>
                    <span style={{flex:2}}>Prestation</span>
                    <span style={{width:88,textAlign:"center"}}>Qté</span>
                    <span style={{width:82,textAlign:"center"}}>Prix unit.</span>
                    <span style={{width:72,textAlign:"right"}}>Total</span>
                    <span style={{width:28}}></span>
                  </div>
                  {editItems.length===0?(
                    <div style={{padding:"20px",textAlign:"center",color:"#334155",fontSize:13,border:"1px dashed rgba(255,255,255,0.08)",borderRadius:10}}>
                      Aucune prestation — cliquez "+ Ajouter"
                    </div>
                  ):editItems.map((item,idx)=>(
                    <ItemRow key={idx} item={item} services={services}
                      onChange={updated=>updateItem(idx,updated)}
                      onRemove={()=>removeItem(idx)}/>
                  ))}
                  {editItems.length>0&&(
                    <div style={{display:"flex",justifyContent:"flex-end",padding:"10px 0 0",fontSize:13,color:"#64748b"}}>
                      Sous-total :&nbsp;<span style={{fontWeight:800,color:"#f8fafc"}}>{fmt(itemsSubtotal)}</span>
                    </div>
                  )}
                </section>

                {/* ── 3. Paiement ── */}
                <section>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#475569",marginBottom:12}}>Paiement</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                    {PMT_LIST.map(pm=>{
                      const active=editForm.payment_method===pm.key;
                      return(
                        <button key={pm.key} onClick={()=>setEditForm(f=>({...f,payment_method:pm.key}))}
                          style={{padding:"10px 8px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",
                            fontSize:12,fontWeight:active?700:500,
                            border:`1px solid ${active?pm.color+"66":"rgba(255,255,255,0.08)"}`,
                            background:active?pm.color+"18":"rgba(255,255,255,0.03)",
                            color:active?pm.color:"#64748b",
                            display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.15s"}}>
                          <span style={{fontSize:18}}>{pm.icon}</span>
                          <span>{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div style={c.formGroup}>
                      <label style={c.label}>Remise (€)</label>
                      <input type="number" min="0" step="0.01" style={c.input}
                        value={editForm.discount_amount}
                        onChange={e=>setEditForm(f=>({...f,discount_amount:e.target.value}))}/>
                    </div>
                    <div style={c.formGroup}>
                      <label style={c.label}>Montant encaissé (€)</label>
                      <input type="number" min="0" step="0.01" style={c.input}
                        value={editForm.amount_paid}
                        onChange={e=>setEditForm(f=>({...f,amount_paid:e.target.value}))}/>
                    </div>
                  </div>
                </section>

                {/* ── Total calculé ── */}
                <div style={{background:"rgba(240,201,135,0.06)",border:"1px solid rgba(240,201,135,0.2)",
                  borderRadius:12,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,color:"#64748b"}}>
                    {itemsSubtotal>0&&<span>{fmt(itemsSubtotal)}{discount>0?` − remise ${fmt(discount)}`:""}</span>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"#64748b",marginBottom:2}}>Total calculé</div>
                    <div style={{fontSize:26,fontWeight:900,color:"#f0c987"}}>{fmt(computedTotal)}</div>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                  <button style={{padding:"11px 18px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",
                    background:"transparent",color:"#94a3b8",fontSize:14,cursor:"pointer",fontWeight:600}}
                    onClick={()=>setEditOrder(null)}>Annuler</button>
                  <button style={{padding:"11px 28px",borderRadius:9,border:"none",
                    background:"linear-gradient(135deg,#f0c987,#e8a44e)",color:"#0a0d14",
                    fontSize:14,cursor:"pointer",fontWeight:900,
                    display:"flex",alignItems:"center",gap:8}}
                    onClick={handleSave} disabled={saving}>
                    {saving&&<Spinner size={16} color="#0a0d14"/>}
                    {saving?"Enregistrement…":"Enregistrer"}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}