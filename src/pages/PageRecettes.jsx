import { useState, useEffect, useCallback } from "react";
import { GET, POST, PUT, DELETE } from "../utils/api";
import { fmt, fmtDate, MONTHS, PMTS, PMT_COLORS, orderRevenue, isRevenueOrder, ORDER_STATUS_LABELS } from "../utils/format";
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
export default function PageRecettes({ toast, user }) {
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
  const [editPayments, setEditPayments] = useState([{id:1,key:"card",amount:""}]);
  const [services,     setServices]     = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [custSearch,   setCustSearch]   = useState("");
  const [custList,     setCustList]     = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const { isMobile } = useBreakpoint();

  // ── Agent IA cahier ──────────────────────────────────────────────────────
  const [agentOpen,     setAgentOpen]     = useState(false);
  const [agentStep,     setAgentStep]     = useState("upload"); // upload | preview | saving
  const [agentImage,    setAgentImage]    = useState(null);     // { file, previewUrl }
  const [agentLoading,  setAgentLoading]  = useState(false);
  const [agentOrders,   setAgentOrders]   = useState([]);       // lignes extraites
  const [agentDate,     setAgentDate]     = useState("");
  const [agentError,    setAgentError]    = useState("");
  const [agentAlerts,   setAgentAlerts]   = useState([]);      // ambiguites signalees par l'IA
  const [agentNonSales, setAgentNonSales] = useState([]);      // lignes internes, non facturees
  const [agentRecon,    setAgentRecon]    = useState(null);    // rapprochement avec les totaux du cahier
  // Les totaux viennent de l'API, jamais d'une somme sur la page affichée :
  // la liste est paginée, en additionner les lignes sous-estimerait la recette
  // dès que le mois dépasse une page.
  const [monthTotals,   setMonthTotals]   = useState({ revenue: 0, orders: 0, discounts: 0, refunds: 0 });
  const [page,          setPage]          = useState(1);
  const [pageInfo,      setPageInfo]      = useState({ total: 0, limit: 50 });

  const atCurrentMonth = selYear===curYear && selMonth===curMonth;
  const prevMonth = () => { if(selMonth===0){setSelMonth(11);setSelYear(y=>y-1);}else setSelMonth(m=>m-1); };
  const nextMonth = () => {
    if(atCurrentMonth) return;
    if(selMonth===11){setSelMonth(0);setSelYear(y=>y+1);}else setSelMonth(m=>m+1);
  };

  const PAGE_SIZE = 50;

  const load = useCallback(async (month, year, pageNum = 1) => {
    setLoading(true);
    try {
      const f  = `${year}-${String(month+1).padStart(2,"0")}-01`;
      const ld = new Date(year,month+1,0).getDate();
      const t  = `${year}-${String(month+1).padStart(2,"0")}-${String(ld).padStart(2,"0")}`;
      const [oRes, eRes, sRes, rRes] = await Promise.all([
        GET(`/orders?from=${f}&to=${t}&limit=${PAGE_SIZE}&page=${pageNum}`),
        GET(`/employees`),
        GET(`/products?limit=500`),
        // Source de vérité des montants : l'API agrège sur la période entière.
        GET(`/reports/sales?from=${f}&to=${t}&group_by=day`),
      ]);
      setOrders(oRes.data||[]);
      setPageInfo(oRes.pagination||{ total:0, limit:PAGE_SIZE });
      setEmployees(eRes.data||[]);
      setServices(sRes.data||[]);

      const periods = rRes.data?.periods || [];
      setMonthTotals({
        revenue:   periods.reduce((a,x)=>a+parseFloat(x.revenue||0),0),
        orders:    periods.reduce((a,x)=>a+parseInt(x.total_orders||0),0),
        discounts: periods.reduce((a,x)=>a+parseFloat(x.discounts||0),0),
        refunds:   periods.reduce((a,x)=>a+parseFloat(x.refunds||0),0),
      });
    } catch(e){ toast(e.message); }
    finally { setLoading(false); }
  },[toast]);

  useEffect(()=>{ setPage(1); },[selMonth,selYear]);
  useEffect(()=>{ load(selMonth,selYear,page); },[selMonth,selYear,page,load]);

  useEffect(()=>{
    if(custSearch.length<2){setCustList([]);return;}
    const t=setTimeout(async()=>{
      // Ne pas avaler l'erreur : une liste vide ne doit pas masquer une panne.
      try{
        const r=await GET(`/customers?search=${encodeURIComponent(custSearch)}&limit=8`);
        setCustList(r.data||[]);
      }catch(e){
        setCustList([]);
        toast(`Recherche client indisponible : ${e.message}`);
      }
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
      employee_id:     String(order.employee_id||""),
      employee_name:   order.employee_name||"",
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
      // Charger les paiements existants
      const rawPmts = res.data?.payments || [];
      if (rawPmts.length > 0) {
        setEditPayments(rawPmts
          .filter(p => p.status !== "refunded")
          .map((p,i) => ({ id: i+1, key: p.method, amount: String(parseFloat(p.amount||0).toFixed(2)) }))
        );
      } else {
        // Fallback : un seul paiement depuis order.payment_method
        setEditPayments([{ id:1, key: order.payment_method||"card", amount: String(parseFloat(order.total||0).toFixed(2)) }]);
      }
    } catch {
      setEditItems([]);
      setEditPayments([{ id:1, key: order.payment_method||"card", amount: String(parseFloat(order.total||0).toFixed(2)) }]);
    }
    setLoadingOrder(false);
  };

  const updateItem = (idx, item) => setEditItems(p=>p.map((it,i)=>i===idx?item:it));
  const removeItem = (idx)       => setEditItems(p=>p.filter((_,i)=>i!==idx));
  const addItem    = ()          => setEditItems(p=>[...p,{product_id:"",name:"",quantity:1,unit_price:0,subtotal:0}]);

  const usedPmtKeys   = editPayments.map(p=>p.key);
  const availPmtMethods = PMT_LIST.filter(m=>!usedPmtKeys.includes(m.key));
  const addPayLine    = () => { const av=PMT_LIST.find(m=>!usedPmtKeys.includes(m.key)); if(!av)return; setEditPayments(p=>[...p,{id:Date.now(),key:av.key,amount:""}]); };
  const removePayLine = (id) => setEditPayments(p=>p.filter(l=>l.id!==id));
  const updatePayLine = (id,field,val) => setEditPayments(p=>p.map(l=>l.id===id?{...l,[field]:val}:l));
  const setPayExact   = (id) => { const other=editPayments.filter(l=>l.id!==id).reduce((s,l)=>s+(parseFloat(l.amount)||0),0); updatePayLine(id,"amount",Math.max(0,computedTotal-other).toFixed(2)); };

  const itemsSubtotal = editItems.reduce((s,i)=>s+i.unit_price*i.quantity,0);
  const discount      = parseFloat(editForm.discount_amount)||0;
  const computedTotal = Math.max(0,itemsSubtotal-discount);
  const totalPaid     = editPayments.reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  const remaining     = computedTotal - totalPaid;

  const handleSave = async () => {
    const validPayments = editPayments.filter(p=>(parseFloat(p.amount)||0)>0);
    if(validPayments.length===0) return toast("Ajoutez au moins un paiement");
    setSaving(true);
    try {
      await PUT(`/orders/${editOrder.id}`,{
        order_date:       editForm.order_date,
        notes:            editForm.notes||undefined,
        discount_amount:  discount,
        customer_id:      editForm.customer_id||undefined,
        employee_id:      editForm.employee_id||undefined,
        payment_breakdown: validPayments.map(p=>({method:p.key,amount:parseFloat(p.amount)})),
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

  // Annulation, et non suppression : la vente reste consultable et sort du
  // chiffre d'affaires, conformément à l'exigence de conservation des
  // écritures d'encaissement.
  const handleDelete = async (order) => {
    const label = order.order_number || `#${order.id}`;
    if(!window.confirm(
      `Annuler la vente ${label} (${fmt(orderRevenue(order))}) ?\n\n`
      + `Elle restera visible dans l'historique, marquée « Annulée », et sortira du chiffre d'affaires. `
      + `L'opération est enregistrée dans le journal.`
    )) return;
    try { await DELETE(`/orders/${order.id}`); toast("Vente annulée","success"); await load(selMonth,selYear); }
    catch(e){ toast(e.message); }
  };

  const filtered     = orders.filter(o=>{
    if(!search) return true;
    const q=search.toLowerCase();
    return (o.order_number||"").toLowerCase().includes(q)||(o.customer_name||"").toLowerCase().includes(q)||(o.employee_name||"").toLowerCase().includes(q);
  });
  // Les tickets annulés ou remboursés restent affichés dans la liste mais ne
  // comptent pas dans la recette, sinon un remboursement resterait facturé.
  // Totaux du mois entier, fournis par l'API. La recherche ne filtre que
  // l'affichage de la page courante : on signale alors que les chiffres
  // portent sur le mois complet, pas sur le résultat filtré.
  const totalCA      = monthTotals.revenue;
  const countCA      = monthTotals.orders;
  const totalRemises = monthTotals.discounts;
  const totalAvoirs  = monthTotals.refunds;
  const pageCount    = Math.max(1, Math.ceil((pageInfo.total||0) / (pageInfo.limit||PAGE_SIZE)));

  // L'export ne peut porter que sur ce qui est chargé : on le dit plutôt que
  // de laisser croire à un export du mois entier.
  const exportCSV = () => {
    if (pageCount > 1 && !window.confirm(
      `L'export porte sur la page affichée (${filtered.length} ventes sur ${pageInfo.total}).\n\n`
      + `Pour le mois complet, utilisez l'export du rapport mensuel. Continuer ?`
    )) return;
    setExporting(true);
    try {
      const rows=[`"Recettes — ${MONTHS[selMonth]} ${selYear}"`,"",
        '"Date";"N° commande";"Client";"Employé";"Paiement";"Statut";"Sous-total (€)";"Remise (€)";"Total (€)"',
        ...filtered.map(o=>`"${fmtDate(o.order_date||o.created_at)}";"${o.order_number||o.id}";"${o.customer_name||""}";"${o.employee_name||""}";"${o.payment_method||""}";"${ORDER_STATUS_LABELS[o.status]||o.status||""}";"${parseFloat(o.subtotal||0).toFixed(2)}";"${parseFloat(o.discount_amount||0).toFixed(2)}";"${orderRevenue(o).toFixed(2)}"`),  
        "",`"TOTAL";"";"";"";"";"";"";"";"${totalCA.toFixed(2)}"`,
      ];
      const blob=new Blob(["\uFEFF"+rows.join("\n")],{type:"text/csv;charset=utf-8;"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download=`recettes_${selYear}-${String(selMonth+1).padStart(2,"0")}.csv`;
      a.click();URL.revokeObjectURL(url);
    }catch{toast("Erreur export");}
    finally{setExporting(false);}
  };

  // ─── Agent : analyse de la photo ──────────────────────────────────────────
  // Secours si le serveur n'a pas su resoudre l'employe. Kim manquait ici :
  // toute recette de sa colonne repartait sans employe rattache.
  const EMPLOYEE_MAP = {
    D:"Duong", TA:"Thuc Anh", M:"Mi", K:"Kim",
    T:"Dai", TH:"Dai", Th:"Dai",
  };

  const analysePhoto = async () => {
    if (!agentImage) return;
    setAgentLoading(true);
    setAgentError("");
    try {
      const toBase64 = f => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const base64    = await toBase64(agentImage.file);
      const mediaType = agentImage.file.type || "image/jpeg";
      const data      = await POST("/ai/extract-notebook", { imageBase64: base64, mediaType });
      if (!data.success) throw new Error(data.message || "Erreur IA");

      const { date, is_continuation, orders: rows, non_sales, reconciliation, alerts } = data.data;

      // Une page de suite ne porte pas de date : on garde celle déjà saisie
      // plutôt que de la remplacer par la date du jour.
      setAgentDate(date || (is_continuation ? agentDate : "") || new Date().toISOString().split("T")[0]);
      setAgentAlerts(alerts || []);
      setAgentNonSales(non_sales || []);
      setAgentRecon(reconciliation || null);

      const enriched = (rows || []).map((row, idx) => {
        // Le serveur résout déjà l'employé contre la fiche du personnel ;
        // la table locale ne sert que de repli.
        const empName = row.employee_name
          || EMPLOYEE_MAP[row.employee_key]
          || row.employee_key
          || "";
        const emp = row.employee_id
          ? employees.find(e => e.id === row.employee_id)
          : employees.find(e => empName && e.name.toLowerCase().includes(empName.toLowerCase()));

        const prestations = (row.matched_products && row.matched_products.length > 0)
          ? row.matched_products.map(p => ({
              label:        p.name,
              product_id:   p.id,
              product_name: p.name,
              unit_price:   p.price,
            }))
          : (row.labels || []).map(label => ({
              label,
              product_id:   "",
              product_name: label,
              unit_price:   0,
            }));

        // `payments` est désormais toujours un tableau. `payment` en dérive
        // pour le sélecteur : il vaut "mixed" dès qu'il y a plusieurs lignes.
        const payments = Array.isArray(row.payments) && row.payments.length
          ? row.payments
          : [{ method: "card", amount: parseFloat(row.amount) || 0 }];

        return {
          _id:              idx,
          prestations,
          amount:           parseFloat(row.amount) || 0,
          payments,
          payment:          payments.length === 1 ? payments[0].method : "mixed",
          discount_percent: row.discount_percent || null,
          additional_fees:  row.additional_fees  || 0,
          fees_type:        row.fees_type        || null,
          catalog_total:    row.catalog_total    || 0,
          manual_fees:      row.additional_fees  || 0,  // éditable par l'utilisateur
          employee_key:     row.employee_key     || "",
          employee_name:    emp?.name || empName,
          employee_id:      emp?.id   || "",
          keep:             true,
        };
      });

      setAgentOrders(enriched);
      setAgentStep("preview");
    } catch(e) {
      setAgentError(e.message || "Erreur lors de l'analyse");
    } finally {
      setAgentLoading(false);
    }
  };

  const handleAgentSave = async () => {
    const toSave = agentOrders.filter(r => r.keep);
    if (!toSave.length) return toast("Aucune recette à enregistrer");
    setAgentStep("saving");
    let ok = 0, ko = 0;
    for (const row of toSave) {
      try {
        // L'API recalcule subtotal et total depuis les prix du catalogue :
        // les envoyer ici n'aurait aucun effet. Le montant réellement facturé
        // se transmet donc via additionnal_fees, qui porte l'écart entre le
        // catalogue et la somme inscrite au cahier (supplément ou remise).
        const breakdown = (row.payments && row.payments.length > 0)
          ? row.payments.map(p => ({ method: p.method, amount: p.amount }))
          : [{ method: row.payment === "mixed" ? "card" : row.payment, amount: row.amount }];

        await POST("/orders", {
          order_date:        agentDate,
          employee_id:       row.employee_id || undefined,
          payment_breakdown: breakdown.filter(p => p.amount > 0),
          discount_amount: row.discount_percent
            ? Math.round(row.amount / (1 - row.discount_percent/100) * (row.discount_percent/100) * 100) / 100
            : 0,
          additionnal_fees: row.manual_fees !== undefined ? row.manual_fees : (row.additional_fees || 0),
          items: row.prestations?.filter(p => p.product_id).map(p => ({
            product_id: p.product_id,
            quantity:   1,
          })) || [],
          notes: row.prestations?.some(p => !p.product_id)
            ? row.prestations.filter(p => !p.product_id).map(p => p.label).join(" + ")
            : undefined,
        });
        ok++;
      } catch { ko++; }
    }
    const koStr = ko > 0 ? ` (${ko} erreur${ko>1?"s":""})` : "";
    toast(ok > 0 ? `${ok} recette${ok>1?"s":""} enregistrée${ok>1?"s":""}${koStr}` : `Échec de l'enregistrement`, ok > 0 ? "success" : "error");
    setAgentOpen(false);
    setAgentStep("upload");
    setAgentImage(null);
    setAgentOrders([]);
    await load(selMonth, selYear);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div>
          <div style={c.pageTitle}>Recettes</div>
          <div style={c.pageSub}>{MONTHS[selMonth]} {selYear} — <span style={{color:"#f0c987",fontWeight:800}}>{fmt(totalCA)}</span></div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["admin","manager"].includes(user?.role) && (
            <button onClick={()=>{setAgentOpen(true);setAgentStep("upload");setAgentImage(null);setAgentOrders([]);setAgentError("");}}
              style={{padding:"10px 18px",borderRadius:10,border:"1px solid rgba(240,201,135,0.3)",
                background:"rgba(240,201,135,0.1)",color:"#f0c987",fontSize:13,fontWeight:700,
                cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"inherit"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="6" fill="currentColor" fillOpacity="0.15"/>
                <text x="3" y="17" fontFamily="inherit" fontSize="11" fontWeight="900" fill="currentColor">AI</text>
                <circle cx="19" cy="5" r="3" fill="#f0c987"/>
              </svg>
              Lime AI
            </button>
          )}
          <button onClick={exportCSV} disabled={exporting||loading}
            style={{padding:"10px 18px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",
              background:"rgba(255,255,255,0.05)",color:"#94a3b8",fontSize:13,fontWeight:700,
              cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"inherit"}}>
            {exporting?<Spinner size={14}/>:"↓"} Export CSV
          </button>
        </div>
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
          {[{label:"Total CA",val:totalCA,color:"#f0c987"},{label:"Nb ventes",val:countCA,color:"#818cf8",isCt:true},{label:"Panier moyen",val:countCA?totalCA/countCA:0,color:"#34d399"},{label:"Remises",val:totalRemises,color:"#f87171"}]
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
              // Un ticket hors CA doit se voir : il reste dans la liste mais
              // ne participe plus au total affiché en bas de page.
              const counted=isRevenueOrder(order);
              const amountStyle=counted
                ? {color:"#f0c987"}
                : {color:"#64748b",textDecoration:"line-through"};
              const statusBadge=counted?null:(
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,marginLeft:6,
                  background:"rgba(248,113,113,0.15)",color:"#f87171",fontWeight:700}}>
                  {ORDER_STATUS_LABELS[order.status]||order.status}
                </span>
              );
              return(
                <div key={order.id} style={{...c.tableRow,flexDirection:isMobile?"column":"row",gap:isMobile?6:0,alignItems:isMobile?"flex-start":"center"}}>
                  {isMobile?(
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",width:"100%",alignItems:"center"}}>
                        <span style={{fontSize:12,color:"#64748b"}}>{dateStr}</span>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <span style={{fontWeight:900,fontSize:16,...amountStyle}}>{fmt(orderRevenue(order))}</span>
                          <button style={c.iconBtn} onClick={()=>openEdit(order)}>✎</button>
                          <button style={{...c.iconBtn,color:"#f87171"}} title="Annuler la vente" onClick={()=>handleDelete(order)}>⊘</button>
                        </div>
                      </div>
                      <div style={{fontSize:14,fontWeight:700}}>{order.order_number||`#${order.id}`}{statusBadge}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {order.customer_name&&<span style={{fontSize:12,color:"#94a3b8"}}>◉ {order.customer_name}</span>}
                        {order.employee_name&&<span style={{fontSize:12,color:"#818cf8"}}>⟡ {order.employee_name}</span>}
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:pmtColor+"18",color:pmtColor,fontWeight:600}}>{PMTS[order.payment_method]||order.payment_method||"—"}</span>
                      </div>
                    </>
                  ):(
                    <>
                      <span style={{flex:0.8,fontSize:13,color:"#64748b"}}>{dateStr}</span>
                      <span style={{flex:1,fontSize:13,fontWeight:700,color:"#94a3b8"}}>{order.order_number||`#${order.id}`}{statusBadge}</span>
                      <span style={{flex:1.4,fontSize:14}}>{order.customer_name||<span style={{color:"#334155"}}>—</span>}</span>
                      <span style={{flex:1.2,fontSize:13,color:"#818cf8"}}>{order.employee_name||<span style={{color:"#334155"}}>—</span>}</span>
                      <span style={{flex:1}}><span style={{fontSize:12,padding:"3px 9px",borderRadius:20,background:pmtColor+"18",color:pmtColor,fontWeight:600}}>{PMTS[order.payment_method]||order.payment_method||"—"}</span></span>
                      <span style={{flex:0.8,textAlign:"right",fontSize:13,color:"#f59e0b"}}>{parseFloat(order.discount_amount||0)>0?"−"+fmt(order.discount_amount):"—"}</span>
                      <span style={{flex:1,textAlign:"right",fontWeight:900,fontSize:15,...amountStyle}}>{fmt(orderRevenue(order))}</span>
                      <span style={{flex:0.5,display:"flex",gap:6,justifyContent:"flex-end"}}>
                        <button style={c.iconBtn} onClick={()=>openEdit(order)}>✎</button>
                        <button style={{...c.iconBtn,color:"#f87171"}} title="Annuler la vente" onClick={()=>handleDelete(order)}>⊘</button>
                      </span>
                    </>
                  )}
                </div>
              );
            })}
            {/* Le total porte sur le MOIS entier, la liste sur la page
                courante : le dire explicitement évite de croire à un écart. */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,
              flexWrap:"wrap",padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:4}}>
              <span style={{fontSize:13,fontWeight:700,color:"#64748b"}}>
                {pageCount>1
                  ? `${filtered.length} affichée${filtered.length!==1?"s":""} sur ${pageInfo.total}`
                  : `${filtered.length} vente${filtered.length!==1?"s":""}`}
              </span>
              <span style={{display:"flex",gap:14,alignItems:"baseline",flexWrap:"wrap"}}>
                {totalRemises>0&&<span style={{fontSize:13,color:"#f59e0b"}}>Remises : −{fmt(totalRemises)}</span>}
                {totalAvoirs>0&&<span style={{fontSize:13,color:"#f87171"}}>Avoirs : −{fmt(totalAvoirs)}</span>}
                <span style={{fontWeight:900,fontSize:16,color:"#f0c987"}}>{fmt(totalCA)}</span>
                <span style={{fontSize:11,color:"#475569"}}>total du mois</span>
              </span>
            </div>

            {pageCount>1&&(
              <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10,
                padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}
                  style={{...navBtn,opacity:page<=1?0.35:1,cursor:page<=1?"not-allowed":"pointer"}}>‹</button>
                <span style={{fontSize:13,color:"#94a3b8",fontWeight:700,minWidth:110,textAlign:"center"}}>
                  Page {page} / {pageCount}
                </span>
                <button onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={page>=pageCount}
                  style={{...navBtn,opacity:page>=pageCount?0.35:1,cursor:page>=pageCount?"not-allowed":"pointer"}}>›</button>
              </div>
            )}
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

                {/* ── 3. Remise ── */}
                <section>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#475569",marginBottom:12}}>Ajustements</div>
                  <div style={c.formGroup}>
                    <label style={c.label}>Remise (€)</label>
                    <input type="number" min="0" step="0.01" style={c.input}
                      value={editForm.discount_amount}
                      onChange={e=>setEditForm(f=>({...f,discount_amount:e.target.value}))}/>
                  </div>
                </section>

                {/* ── 4. Paiements multi-lignes ── */}
                <section>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#475569"}}>Modes de paiement</div>
                    {availPmtMethods.length>0&&(
                      <button onClick={addPayLine}
                        style={{padding:"5px 14px",borderRadius:8,border:"1px solid rgba(240,201,135,0.3)",
                          background:"rgba(240,201,135,0.08)",color:"#f0c987",fontSize:12,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit"}}>+ Ajouter</button>
                    )}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {editPayments.map(line=>{
                      return(
                        <div key={line.id} style={{padding:"12px 14px",borderRadius:11,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.02)"}}>
                          {/* Sélecteur méthode */}
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                            {PMT_LIST.map(m=>{
                              const active=line.key===m.key;
                              const taken=usedPmtKeys.includes(m.key)&&!active;
                              return(
                                <button key={m.key} disabled={taken} onClick={()=>updatePayLine(line.id,"key",m.key)}
                                  style={{padding:"5px 10px",borderRadius:8,cursor:taken?"not-allowed":"pointer",
                                    fontFamily:"inherit",fontSize:11,fontWeight:active?700:500,opacity:taken?0.3:1,
                                    border:`1px solid ${active?m.color+"66":"rgba(255,255,255,0.08)"}`,
                                    background:active?m.color+"18":"rgba(255,255,255,0.03)",
                                    color:active?m.color:"#64748b",transition:"all 0.15s",
                                    display:"flex",alignItems:"center",gap:4}}>
                                  <span>{m.icon}</span><span>{m.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          {/* Montant + actions */}
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <div style={{position:"relative",flex:1,display:"flex",alignItems:"center"}}>
                              <input type="number" min="0" step="0.01" placeholder="0.00"
                                style={{...c.input,width:"100%",paddingRight:28}}
                                value={line.amount}
                                onChange={e=>updatePayLine(line.id,"amount",e.target.value)}/>
                              <span style={{position:"absolute",right:10,color:"#64748b",fontSize:13,pointerEvents:"none"}}>€</span>
                            </div>
                            <button onClick={()=>setPayExact(line.id)}
                              style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(240,201,135,0.2)",
                                background:"rgba(240,201,135,0.06)",color:"#f0c987",fontSize:11,
                                cursor:"pointer",fontWeight:700,fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
                              Exact
                            </button>
                            {editPayments.length>1&&(
                              <button onClick={()=>removePayLine(line.id)}
                                style={{width:34,height:34,borderRadius:8,border:"1px solid rgba(248,113,113,0.2)",
                                  background:"rgba(248,113,113,0.05)",color:"#f87171",fontSize:16,
                                  cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Résumé */}
                  <div style={{marginTop:10,display:"flex",justifyContent:"flex-end",gap:16,fontSize:13}}>
                    <span style={{color:"#64748b"}}>Payé : <span style={{color:"#f8fafc",fontWeight:700}}>{fmt(totalPaid)}</span></span>
                    {Math.abs(remaining)>0.005&&(
                      <span style={{color:remaining>0?"#f87171":"#10b981",fontWeight:700}}>
                        {remaining>0?`Reste : ${fmt(remaining)}`:`Excédent : ${fmt(-remaining)}`}
                      </span>
                    )}
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

      {/* ══════════ MODAL AGENT IA CAHIER ══════════ */}
      {agentOpen && ["admin","manager"].includes(user?.role) && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,
          display:"flex",alignItems:"center",justifyContent:"center",
          backdropFilter:"blur(8px)",padding:16}}>
          <div style={{background:"#0d1117",border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:20,width:"100%",maxWidth:720,maxHeight:"93vh",boxSizing:"border-box",
            display:"flex",flexDirection:"column",overflow:"hidden"}}>

            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"22px 28px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",flexShrink:0}}>
              <div>
                <div style={{fontSize:17,fontWeight:900,color:"#f8fafc"}}>📷 Agent IA — Saisie cahier</div>
                <div style={{fontSize:13,color:"#64748b",marginTop:2}}>
                  {agentStep==="upload" && "Prends en photo ta page de cahier et laisse l'IA extraire les recettes"}
                  {agentStep==="preview" && `${agentOrders.filter(r=>r.keep).length} recette(s) détectée(s) — vérifie avant d'enregistrer`}
                  {agentStep==="saving" && "Enregistrement en cours…"}
                </div>
              </div>
              {agentStep !== "saving" && (
                <button style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",
                  borderRadius:9,color:"#64748b",cursor:"pointer",fontSize:18,
                  width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center"}}
                  onClick={()=>setAgentOpen(false)}>✕</button>
              )}
            </div>

            <div style={{padding:"22px 28px",display:"flex",flexDirection:"column",gap:20,minWidth:0,flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

              {/* ── ÉTAPE 1 : Upload ── */}
              {agentStep === "upload" && (
                <>
                  {/* Zone drop/click */}
                  <label style={{display:"block",cursor:"pointer"}}>
                    <input type="file" accept="image/*" style={{display:"none"}}
                      onChange={e=>{
                        const f=e.target.files?.[0];
                        if(!f)return;
                        setAgentImage({file:f,previewUrl:URL.createObjectURL(f)});
                      }}/>
                    <div style={{border:"2px dashed rgba(240,201,135,0.3)",borderRadius:14,
                      padding:"32px 20px",textAlign:"center",cursor:"pointer",
                      background:"rgba(240,201,135,0.03)",transition:"all 0.2s"}}
                      onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="rgba(240,201,135,0.7)";}}
                      onDragLeave={e=>{e.currentTarget.style.borderColor="rgba(240,201,135,0.3)";}}
                      onDrop={e=>{
                        e.preventDefault();
                        const f=e.dataTransfer.files?.[0];
                        if(f&&f.type.startsWith("image/"))setAgentImage({file:f,previewUrl:URL.createObjectURL(f)});
                        e.currentTarget.style.borderColor="rgba(240,201,135,0.3)";
                      }}>
                      {agentImage ? (
                        <img src={agentImage.previewUrl} alt="preview"
                          style={{maxHeight:320,maxWidth:"100%",borderRadius:10,objectFit:"contain"}}/>
                      ) : (
                        <>
                          <div style={{fontSize:48,marginBottom:12}}>📷</div>
                          <div style={{fontSize:15,fontWeight:700,color:"#f0c987",marginBottom:6}}>
                            Clique ou glisse une photo
                          </div>
                          <div style={{fontSize:13,color:"#64748b"}}>
                            Photo de ta page de cahier — JPG, PNG
                          </div>
                        </>
                      )}
                    </div>
                  </label>

                  {agentImage && (
                    <button style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",
                      fontSize:13,textDecoration:"underline",textAlign:"left"}}
                      onClick={()=>setAgentImage(null)}>✕ Changer la photo</button>
                  )}

                  {agentError && (
                    <div style={{padding:"12px 16px",borderRadius:10,background:"rgba(248,113,113,0.1)",
                      border:"1px solid rgba(248,113,113,0.2)",color:"#f87171",fontSize:13}}>
                      ⚠ {agentError}
                    </div>
                  )}

                  <button disabled={!agentImage||agentLoading}
                    onClick={analysePhoto}
                    style={{padding:"14px",borderRadius:12,border:"none",
                      background:agentImage?"linear-gradient(135deg,#f0c987,#e8a44e)":"rgba(255,255,255,0.06)",
                      color:agentImage?"#0a0d14":"#334155",fontWeight:900,fontSize:15,
                      cursor:agentImage?"pointer":"not-allowed",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                    {agentLoading ? <><Spinner size={18} color="#0a0d14"/> Analyse en cours…</> : "🔍 Analyser la photo"}
                  </button>
                </>
              )}

              {/* ── ÉTAPE 2 : Prévisualisation ── */}
              {agentStep === "preview" && (
                <>
                  {/* Date détectée */}
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",
                    borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                    <span style={{fontSize:12,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>Date détectée</span>
                    <input type="date" style={{...c.input,flex:1,maxWidth:180}}
                      value={agentDate} onChange={e=>setAgentDate(e.target.value)}/>
                    <span style={{fontSize:12,color:"#64748b"}}>Modifiable si besoin</span>
                  </div>

                  {/* Rapprochement avec les totaux manuscrits du bas de page :
                      le cahier porte sa propre somme de contrôle. */}
                  {agentRecon && (agentRecon.handwritten?.grand_total != null
                                  || agentRecon.handwritten?.card != null
                                  || agentRecon.handwritten?.cash != null) && (
                    <div style={{padding:"12px 16px",borderRadius:10,
                      background: agentRecon.matches ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                      border: `1px solid ${agentRecon.matches ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.3)"}`}}>
                      <div style={{fontSize:12,fontWeight:800,marginBottom:6,
                        color: agentRecon.matches ? "#10b981" : "#f59e0b"}}>
                        {agentRecon.matches ? "✓ Concorde avec les totaux du cahier" : "⚠ Écart avec les totaux du cahier"}
                      </div>
                      <div style={{display:"flex",gap:18,flexWrap:"wrap",fontSize:12,color:"#94a3b8"}}>
                        {[["CB","card"],["Espèces","cash"],["Total","grand_total"]].map(([lbl,key])=>{
                          const w = agentRecon.handwritten?.[key];
                          const e = key==="grand_total" ? agentRecon.extracted?.total : agentRecon.extracted?.[key];
                          if (w == null) return null;
                          return (
                            <span key={key}>
                              {lbl} : <b style={{color:"#e2e8f0"}}>{fmt(e)}</b>
                              <span style={{color:"#64748b"}}> / cahier {fmt(w)}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Points à vérifier remontés par l'IA */}
                  {agentAlerts.length > 0 && (
                    <div style={{padding:"12px 16px",borderRadius:10,
                      background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.25)"}}>
                      <div style={{fontSize:12,fontWeight:800,color:"#f59e0b",marginBottom:6}}>
                        ⚠ {agentAlerts.length} point{agentAlerts.length>1?"s":""} à vérifier
                      </div>
                      <ul style={{margin:0,paddingLeft:18,fontSize:12,color:"#cbd5e1",lineHeight:1.7}}>
                        {agentAlerts.map((a,i)=><li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Lignes internes écartées : ni ventes, ni recettes */}
                  {agentNonSales.length > 0 && (
                    <div style={{padding:"12px 16px",borderRadius:10,
                      background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)"}}>
                      <div style={{fontSize:12,fontWeight:800,color:"#94a3b8",marginBottom:6}}>
                        {agentNonSales.length} ligne{agentNonSales.length>1?"s":""} écartée{agentNonSales.length>1?"s":""} — mouvements internes, pas des ventes
                      </div>
                      <ul style={{margin:0,paddingLeft:18,fontSize:12,color:"#64748b",lineHeight:1.7}}>
                        {agentNonSales.map((n,i)=>(
                          <li key={i}>« {n.raw} »{n.amount!=null?` — ${fmt(n.amount)}`:""} {n.reason?`· ${n.reason}`:""}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Aperçu miniature */}
                  {agentImage && (
                    <img src={agentImage.previewUrl} alt="cahier"
                      style={{maxHeight:140,maxWidth:"100%",borderRadius:9,objectFit:"contain",opacity:0.7}}/>
                  )}

                  {/* Tableau des lignes */}
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {agentOrders.map((row, idx) => (
                      <div key={idx} style={{borderRadius:12,border:"1px solid rgba(255,255,255,0.07)",
                        background:row.keep?"rgba(255,255,255,0.02)":"rgba(248,113,113,0.03)",
                        opacity:row.keep?1:0.5,overflow:"hidden"}}>

                        {/* Ligne header de la commande */}
                        <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",
                          borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.02)",
                          flexWrap:"wrap"}}>
                          <input type="checkbox" checked={row.keep}
                            onChange={e=>setAgentOrders(p=>p.map((r,i)=>i===idx?{...r,keep:e.target.checked}:r))}
                            style={{width:15,height:15,cursor:"pointer",accentColor:"#f0c987",flexShrink:0}}/>

                          {/* Employé */}
                          <select style={{...c.input,fontSize:12,padding:"4px 7px",minWidth:100,flex:"1 1 100px"}}
                            value={row.employee_id}
                            onChange={e=>{
                              const emp=employees.find(em=>em.id===e.target.value);
                              setAgentOrders(p=>p.map((r,i)=>i===idx?{...r,employee_id:e.target.value,employee_name:emp?.name||""}:r));
                            }}>
                            <option value="">— Employé —</option>
                            {employees.map(emp=><option key={emp.id} value={emp.id}>{emp.name}</option>)}
                          </select>

                          {/* Paiement — un paiement mixte reste tel quel, le
                              détail par moyen venant du cahier */}
                          {row.payment === "mixed" ? (
                            <span style={{fontSize:12,padding:"4px 9px",borderRadius:8,minWidth:110,
                              background:"rgba(148,163,184,0.15)",color:"#94a3b8",fontWeight:700}}
                              title={row.payments.map(p=>`${p.method} ${p.amount} €`).join(" + ")}>
                              ⟡ Multi · {row.payments.map(p=>`${fmt(p.amount)}`).join(" + ")}
                            </span>
                          ) : (
                            <select style={{...c.input,fontSize:12,padding:"4px 7px",minWidth:110,flex:"1 1 110px"}}
                              value={row.payment}
                              onChange={e=>setAgentOrders(p=>p.map((r,i)=>i===idx?{
                                ...r,
                                payment:  e.target.value,
                                payments: [{ method: e.target.value, amount: r.amount }],
                              }:r))}>
                              {PMT_LIST.map(m=><option key={m.key} value={m.key}>{m.icon} {m.label}</option>)}
                            </select>
                          )}

                          {/* Montant + remise */}
                          <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
                            {row.discount_percent && (
                              <span style={{fontSize:11,padding:"2px 7px",borderRadius:20,
                                background:"rgba(248,113,113,0.12)",color:"#f87171",fontWeight:700}}>
                                -{row.discount_percent}%
                              </span>
                            )}
                          {/* Champ remise/supplément éditable */}
                          {(row.additional_fees !== 0 || row.catalog_total > 0) && (
                            <div style={{display:"flex",alignItems:"center",gap:3}}>
                              <span style={{fontSize:10,color:"#64748b",flexShrink:0}}>
                                {(row.manual_fees||0) < 0 ? "remise" : (row.manual_fees||0) > 0 ? "suppl." : "±"}
                              </span>
                              <input type="number" step="0.01"
                                style={{...c.input,fontSize:11,padding:"2px 6px",width:60,textAlign:"right",
                                  color: (row.manual_fees||0) < 0 ? "#f87171" : (row.manual_fees||0) > 0 ? "#10b981" : "#64748b",
                                  fontWeight:700}}
                                value={row.manual_fees ?? row.additional_fees ?? 0}
                                onChange={e=>setAgentOrders(p=>p.map((r,i)=>i===idx?{...r,
                                  manual_fees: parseFloat(e.target.value)||0
                                }:r))}
                                title="Négatif = remise, positif = supplément"
                              />
                              <span style={{fontSize:10,color:"#64748b"}}>€</span>
                            </div>
                          )}
                            <input type="number" min="0" step="0.01"
                              style={{...c.input,fontSize:14,padding:"4px 8px",width:72,textAlign:"right",fontWeight:900,color:"#f0c987"}}
                              value={row.amount}
                              onChange={e=>setAgentOrders(p=>p.map((r,i)=>i===idx?{...r,amount:parseFloat(e.target.value)||0}:r))}/>
                            <span style={{fontSize:12,color:"#64748b"}}>€</span>
                            <button style={{width:26,height:26,borderRadius:7,border:"none",
                              background:"rgba(248,113,113,0.1)",color:"#f87171",cursor:"pointer",
                              fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}
                              onClick={()=>setAgentOrders(p=>p.filter((_,i)=>i!==idx))}>✕</button>
                          </div>
                        </div>

                        {/* Prestations de la commande */}
                        <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:6}}>
                          {(row.prestations||[]).map((prest, pi) => (
                            <div key={pi} style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                              <span style={{fontSize:11,color:"#475569",flexShrink:0,width:14}}>{pi+1}.</span>
                              <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:3}}>
                                {/* Label IA détecté */}
                                {prest.label && !prest.product_id && (
                                  <div style={{fontSize:11,color:"#f59e0b",fontStyle:"italic",
                                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                    IA: "{prest.label}"
                                  </div>
                                )}
                                {/* Select prestation */}
                                <select
                                  style={{...c.input,fontSize:12,padding:"5px 8px",width:"100%",boxSizing:"border-box"}}
                                  value={prest.product_id}
                                  onChange={e=>{
                                    const svc=services.find(s=>s.id===e.target.value);
                                    setAgentOrders(p=>p.map((r,i)=>i===idx?{...r,
                                      prestations:r.prestations.map((pr,pj)=>pj===pi
                                        ?{...pr,product_id:e.target.value,product_name:svc?.name||pr.label}
                                        :pr)
                                    }:r));
                                  }}>
                                  <option value="">— Sélectionner une prestation —</option>
                                  {services.map(s=>(
                                    <option key={s.id} value={s.id}>{s.name} · {fmt(s.price)}</option>
                                  ))}
                                </select>
                              </div>
                              <button style={{width:22,height:22,borderRadius:6,border:"1px solid rgba(248,113,113,0.2)",
                                background:"rgba(248,113,113,0.06)",color:"#f87171",cursor:"pointer",fontSize:11,
                                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
                                onClick={()=>setAgentOrders(p=>p.map((r,i)=>i===idx?{...r,
                                  prestations:r.prestations.filter((_,pj)=>pj!==pi)
                                }:r))}>✕</button>
                            </div>
                          ))}
                          <button style={{alignSelf:"flex-start",padding:"4px 12px",borderRadius:8,
                            border:"1px solid rgba(240,201,135,0.25)",background:"rgba(240,201,135,0.07)",
                            color:"#f0c987",fontSize:11,cursor:"pointer",fontWeight:700,marginTop:2}}
                            onClick={()=>setAgentOrders(p=>p.map((r,i)=>i===idx?{...r,
                              prestations:[...(r.prestations||[]),{label:"",product_id:"",product_name:""}]
                            }:r))}>
                            + Ajouter prestation
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total récap */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"10px 16px",borderRadius:10,background:"rgba(240,201,135,0.06)",
                    border:"1px solid rgba(240,201,135,0.15)"}}>
                    <span style={{fontSize:13,color:"#94a3b8"}}>
                      {agentOrders.filter(r=>r.keep).length} recette(s) sélectionnée(s)
                    </span>
                    <span style={{fontSize:18,fontWeight:900,color:"#f0c987"}}>
                      {fmt(agentOrders.filter(r=>r.keep).reduce((s,r)=>s+r.amount,0))}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center"}}>
                    <button style={{padding:"10px 16px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",
                      background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer",fontWeight:600}}
                      onClick={()=>setAgentStep("upload")}>← Reprendre</button>
                    <button style={{padding:"12px 28px",borderRadius:9,border:"none",
                      background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",
                      fontWeight:900,fontSize:14,cursor:"pointer",
                      display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 20px rgba(16,185,129,0.3)"}}
                      onClick={handleAgentSave}
                      disabled={agentOrders.filter(r=>r.keep).length===0}>
                      ✓ Enregistrer {agentOrders.filter(r=>r.keep).length} recette(s)
                    </button>
                  </div>
                </>
              )}

              {/* ── ÉTAPE 3 : Saving ── */}
              {agentStep === "saving" && (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 0",gap:16}}>
                  <Spinner size={40} color="#f0c987"/>
                  <div style={{fontSize:15,color:"#94a3b8",fontWeight:600}}>Enregistrement en cours…</div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}