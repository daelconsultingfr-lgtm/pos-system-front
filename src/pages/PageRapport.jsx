import { useState, useEffect, useRef, useCallback } from "react";
import { GET, POST, PUT, DELETE } from "../utils/api";
import { fmt, fmtShort, fmtDate, MONTHS, PMTS, PMT_COLORS } from "../utils/format";
import { c, navBtn, resetBtn } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { EmptyState, Modal, ModalActions } from "../components/UI";

export default function PageRapport({ type, toast }) {
  const isAnnual   = type==="annuel";
  const now0       = new Date();
  const curYear    = now0.getFullYear();
  const curMonth   = now0.getMonth();

  const [data,     setData]     = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selMonth, setSelMonth] = useState(curMonth);
  const [selYear,  setSelYear]  = useState(curYear);
  const [exporting,setExporting]= useState(false);
  const { isMobile } = useBreakpoint();

  const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const years  = Array.from({length:5},(_,i)=>curYear-i);

  const prevMonth = () => { if(selMonth===0){setSelMonth(11);setSelYear(y=>y-1);}else setSelMonth(m=>m-1); };
  const nextMonth = () => {
    if(selYear===curYear && selMonth===curMonth) return;
    if(selMonth===11){setSelMonth(0);setSelYear(y=>y+1);}else setSelMonth(m=>m+1);
  };
  const atCurrentMonth = selYear===curYear && selMonth===curMonth;
  const atCurrentYear  = selYear===curYear;

  const from = isAnnual ? `${selYear}-01-01` : `${selYear}-${String(selMonth+1).padStart(2,"0")}-01`;
  const to   = isAnnual ? `${selYear}-12-31` : (() => { const d=new Date(selYear,selMonth+1,0); return d.toISOString().split("T")[0]; })();
  const periodLabel = isAnnual ? `Exercice ${selYear}` : `${MONTHS[selMonth]} ${selYear}`;

  useEffect(()=>{
    (async()=>{
      setLoading(true); setData(null); setExpenses([]); setOrders([]);
      try {
        const [rRes, eRes, oRes] = await Promise.all([
          GET(`/reports/sales?from=${from}&to=${to}&group_by=${isAnnual?"month":"day"}&date_field=order_date`),
          GET(`/expenses?from=${from}&to=${to}&limit=500`),
          GET(`/orders?from=${from}&to=${to}&limit=500&date_field=order_date`),
        ]);
        setData(rRes.data);
        setExpenses(eRes.data||[]);
        setOrders(oRes.data||[]);
      } catch(e) { toast(e.message); }
      finally { setLoading(false); }
    })();
  },[type, selMonth, selYear]);

  const { periods=[], by_payment=[], by_employee=[] } = data||{};
  const totalCA      = periods.reduce((s,r)=>s+parseFloat(r.revenue||0),0);
  const totalDepenses= expenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const resultat     = totalCA - totalDepenses;
  const maxBar       = Math.max(...periods.map(r=>parseFloat(r.revenue||0)),1);
  const payColors    = {card:"#6366f1",cash:"#10b981",treatwell:"#8b5cf6",planity:"#f59e0b",mixed:"#94a3b8"};
  const payLabels    = {card:"💳 Carte",cash:"💵 Espèces",treatwell:"🌿 Treatwell",planity:"📅 Planity",mixed:"⟡ Multi"};
  const totalByPay   = by_payment.reduce((s,r)=>s+parseFloat(r.total||0),0)||1;
  const maxEmpCA     = Math.max(...by_employee.map(e=>parseFloat(e.revenue||0)),1);
  const monthName    = (p) => { const d=new Date(p); return d.toLocaleDateString("fr-FR",isAnnual?{month:"short"}:{day:"numeric",month:"short"}); };

  // ── Regroupement dépenses par catégorie
  const depByCategory = expenses.reduce((acc,e)=>{
    const cat = e.category||"Autre";
    acc[cat] = (acc[cat]||0) + parseFloat(e.amount||0);
    return acc;
  }, {});

  // ── Export CSV
  const exportCSV = () => {
    setExporting(true);
    try {
      const rows = [];
      // En-tête
      rows.push(`"Rapport ${isAnnual?"annuel":"mensuel"} — ${periodLabel}"`);
      rows.push("");

      // Ventes
      rows.push("=== VENTES ===");
      rows.push(isAnnual
        ? '"Mois";"CA (€)";"Nb commandes";"Remises (€)"'
        : '"Date";"CA (€)";"Nb commandes";"Remises (€)"');
      periods.forEach(r => {
        const d = new Date(r.period);
        const label = isAnnual
          ? d.toLocaleDateString("fr-FR",{month:"long",year:"numeric"})
          : d.toLocaleDateString("fr-FR");
        rows.push(`"${label}";"${parseFloat(r.revenue||0).toFixed(2)}";"${r.total_orders||0}";"${parseFloat(r.discounts||0).toFixed(2)}"`);
      });
      rows.push(`"TOTAL";"${totalCA.toFixed(2)}";"${periods.reduce((s,r)=>s+parseInt(r.total_orders||0),0)}";""`);
      rows.push("");

      // Liste des commandes détaillées
      if (orders.length>0) {
        rows.push("=== DÉTAIL DES VENTES ===");
        rows.push('"Date";"N° commande";"Client";"Employé";"Paiement";"Total (€)";"Remise (€)"');
        orders.forEach(o => {
          rows.push(`"${o.order_date||o.created_at?.split("T")[0]||""}";"${o.order_number||o.id}";"${o.customer_name||""}";"${o.employee_name||""}";"${o.payment_method||""}";"${parseFloat(o.total||0).toFixed(2)}";"${parseFloat(o.discount_amount||0).toFixed(2)}"`);
        });
        rows.push("");
      }

      // Dépenses
      rows.push("=== DÉPENSES ===");
      rows.push('"Date";"Description";"Catégorie";"Montant (€)"');
      expenses.forEach(e => {
        rows.push(`"${e.date||""}";"${(e.label||"").replace(/"/g,'""')}";"${e.category||"Autre"}";"${parseFloat(e.amount||0).toFixed(2)}"`);
      });
      rows.push(`"TOTAL";"";"";"${totalDepenses.toFixed(2)}"`);
      rows.push("");
      rows.push(`"RÉSULTAT NET";"";"";"${resultat.toFixed(2)}"`);

      const csv = rows.join("\n");
      const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `rapport_${isAnnual?selYear:`${selYear}-${String(selMonth+1).padStart(2,"0")}`}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch(e) { toast("Erreur export : "+e.message); }
    finally { setExporting(false); }
  };

  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div>
          <div style={c.pageTitle}>Rapport {isAnnual?"annuel":"mensuel"}</div>
          <div style={c.pageSub}>{periodLabel}</div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {!loading && (
            <button onClick={exportCSV} disabled={exporting}
              style={{padding:"10px 18px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)",color:"#94a3b8",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"inherit"}}>
              {exporting ? <Spinner size={14}/> : "↓"} Export CSV
            </button>
          )}
          {!loading && <div style={{padding:"12px 22px",borderRadius:11,background:"rgba(240,201,135,0.1)",border:"1px solid rgba(240,201,135,0.2)",color:"#f0c987",fontWeight:900,fontSize:22}}>{fmtShort(totalCA)}</div>}
        </div>
      </div>

      {/* ── Sélecteur période ── */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22,flexWrap:"wrap"}}>
        {isAnnual ? (
          <>
            <button onClick={()=>setSelYear(y=>y-1)} disabled={selYear<=curYear-4} style={{...navBtn,opacity:selYear<=curYear-4?0.3:1}}>‹</button>
            <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))} style={{...c.input,padding:"8px 14px",fontSize:15,fontWeight:800,cursor:"pointer",minWidth:90}}>
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={()=>setSelYear(y=>y+1)} disabled={atCurrentYear} style={{...navBtn,opacity:atCurrentYear?0.3:1,cursor:atCurrentYear?"not-allowed":"pointer"}}>›</button>
            {!atCurrentYear && <button onClick={()=>setSelYear(curYear)} style={resetBtn}>Année actuelle</button>}
          </>
        ) : (
          <>
            <button onClick={prevMonth} style={navBtn}>‹</button>
            <div style={{display:"flex",gap:8}}>
              <select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))} style={{...c.input,padding:"8px 12px",fontSize:14,fontWeight:700,cursor:"pointer",minWidth:120}}>
                {MONTHS.map((m,i)=><option key={i} value={i} disabled={selYear===curYear&&i>curMonth}>{m}</option>)}
              </select>
              <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))} style={{...c.input,padding:"8px 12px",fontSize:14,fontWeight:700,cursor:"pointer",minWidth:80}}>
                {years.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={nextMonth} disabled={atCurrentMonth} style={{...navBtn,opacity:atCurrentMonth?0.3:1,cursor:atCurrentMonth?"not-allowed":"pointer"}}>›</button>
            {!atCurrentMonth && <button onClick={()=>{setSelMonth(curMonth);setSelYear(curYear);}} style={resetBtn}>Mois actuel</button>}
          </>
        )}
      </div>

      {loading ? <div style={{display:"flex",justifyContent:"center",padding:80}}><Spinner size={44}/></div> : (
        <>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12,marginBottom:20}}>
            {[
              {label:"Chiffre d'affaires",val:totalCA,color:"#f0c987",icon:"◈"},
              {label:"Nb commandes",val:periods.reduce((s,r)=>s+parseInt(r.total_orders||0),0),color:"#818cf8",icon:"⊞",isCt:true},
              {label:"Panier moyen",val:periods.length?totalCA/Math.max(periods.reduce((s,r)=>s+parseInt(r.total_orders||0),0),1):0,color:"#34d399",icon:"◇"},
              {label:"Total dépenses",val:totalDepenses,color:"#f87171",icon:"◻"},
              {label:"Résultat net",val:resultat,color:resultat>=0?"#10b981":"#f87171",icon:resultat>=0?"▲":"▼"},
              {label:"Remises accordées",val:periods.reduce((s,r)=>s+parseFloat(r.discounts||0),0),color:"#f59e0b",icon:"−"},
            ].map(k=>(
              <div key={k.label} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${k.color}44`,borderRadius:14,padding:"18px 16px",textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
                <div style={{fontSize:22,fontWeight:900,color:k.color}}>{k.isCt?k.val:fmtShort(k.val)}</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Graphe CA */}
          {periods.length>0 && (
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:15,padding:"20px",marginBottom:16}}>
              <div style={c.cardTitle}>Évolution du CA — {periodLabel}</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:140,paddingTop:16}}>
                {periods.map((r,i)=>{
                  const val=parseFloat(r.revenue||0);
                  return (
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{width:"100%",height:110,display:"flex",alignItems:"flex-end"}}>
                        <div className="bar-item" style={{width:"100%",height:`${(val/maxBar)*100}%`,background:"linear-gradient(180deg,#f0c987,#e8a44e)",borderRadius:"4px 4px 0 0",minHeight:3,position:"relative"}}>
                          <div className="bar-tooltip" style={{display:"none",position:"absolute",top:-24,left:"50%",transform:"translateX(-50%)",background:"#1e2433",padding:"3px 8px",borderRadius:6,fontSize:11,color:"#f0c987",fontWeight:700,whiteSpace:"nowrap",zIndex:10}}>{fmtShort(val)}</div>
                        </div>
                      </div>
                      <div style={{fontSize:9,color:"#475569",textAlign:"center"}}>{monthName(r.period)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {periods.length===0 && <EmptyState icon="▦" text={`Aucune vente pour ${periodLabel}`}/>}

          {/* Ligne : paiements + employés */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"18px"}}>
              <div style={c.cardTitle}>Par moyen de paiement</div>
              {by_payment.length===0 ? <EmptyState text="Aucune donnée"/> : by_payment.map(pb=>{
                const pct=(parseFloat(pb.total)/totalByPay)*100;
                return (
                  <div key={pb.method} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
                      <span>{payLabels[pb.method]||pb.method}</span>
                      <span style={{fontWeight:800,color:payColors[pb.method]||"#888"}}>{fmtShort(parseFloat(pb.total))}</span>
                    </div>
                    <div style={{height:5,borderRadius:4,background:"rgba(255,255,255,0.06)"}}>
                      <div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:payColors[pb.method]||"#888"}}/>
                    </div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{pct.toFixed(1)}% · {pb.count} ventes</div>
                  </div>
                );
              })}
            </div>

            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"18px"}}>
              <div style={c.cardTitle}>Par employé</div>
              {by_employee.length===0 ? <EmptyState text="Aucune donnée"/> : by_employee.map((emp,i)=>{
                const empColor=emp.color||["#f0c987","#818cf8","#34d399","#f472b6"][i%4];
                return (
                  <div key={emp.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                    <div style={{width:38,height:38,borderRadius:"50%",border:`2px solid ${empColor}66`,background:empColor+"22",color:empColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,flexShrink:0}}>
                      {(emp.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{emp.name}</div>
                      <div style={{height:4,borderRadius:3,background:"rgba(255,255,255,0.06)"}}>
                        <div style={{width:`${(parseFloat(emp.revenue)/maxEmpCA)*100}%`,height:"100%",borderRadius:3,background:empColor}}/>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:800,color:empColor}}>{fmtShort(parseFloat(emp.revenue||0))}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{emp.total_orders} ventes</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dépenses par catégorie */}
          {totalDepenses>0 && (
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:14,padding:"18px",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={c.cardTitle}>Dépenses par catégorie</div>
                <span style={{fontSize:15,fontWeight:900,color:"#f87171"}}>{fmtShort(totalDepenses)}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                {Object.entries(depByCategory).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>{
                  const pct=(val/totalDepenses)*100;
                  const catColors={"Matériel":"#818cf8","Loyer":"#f87171","Stock":"#34d399","Salaires":"#f59e0b","Services":"#60a5fa","Autre":"#94a3b8"};
                  const col=catColors[cat]||"#94a3b8";
                  return (
                    <div key={cat} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${col}22`,borderRadius:10,padding:"12px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontSize:12,color:col,fontWeight:700}}>{cat}</span>
                        <span style={{fontSize:12,color:"#64748b"}}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{fontSize:16,fontWeight:900,color:"#f8fafc"}}>{fmtShort(val)}</div>
                      <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.06)",marginTop:8}}>
                        <div style={{width:`${pct}%`,height:"100%",borderRadius:2,background:col}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Résultat net */}
          <div style={{background:resultat>=0?"rgba(16,185,129,0.06)":"rgba(248,113,113,0.06)",border:`1px solid ${resultat>=0?"rgba(16,185,129,0.25)":"rgba(248,113,113,0.25)"}`,borderRadius:14,padding:"20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,color:"#64748b",marginBottom:4}}>Résultat net {periodLabel}</div>
              <div style={{fontSize:12,color:"#475569"}}>CA {fmtShort(totalCA)} − Dépenses {fmtShort(totalDepenses)}</div>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:resultat>=0?"#10b981":"#f87171"}}>{resultat>=0?"+":""}{fmtShort(resultat)}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE RECETTES — liste des ventes mois par mois basée sur order_date
// ═══════════════════════════════════════════════════════════════════════════════
