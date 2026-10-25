import { useState, useEffect, useRef, useCallback } from "react";
import { GET, POST, PUT, DELETE } from "../utils/api";
import { fmt, fmtShort, fmtDate, MONTHS, PMTS, PMT_COLORS } from "../utils/format";
import { c, navBtn, resetBtn } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { EmptyState, Modal, ModalActions } from "../components/UI";

export default function PageRapportJournalier({ toast }) {
  const now0    = new Date();
  const todayStr = now0.toISOString().split("T")[0];

  const [data,      setData]      = useState(null);
  const [expenses,  setExpenses]  = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selDate,   setSelDate]   = useState(todayStr);
  const [exporting, setExporting] = useState(false);
  const { isMobile } = useBreakpoint();

  const PMTS       = {card:"💳 Carte",cash:"💵 Espèces",treatwell:"🌿 Treatwell",planity:"📅 Planity",contactless:"📲 Sans contact",check:"🖊 Chèque",mixed:"⟡ Multi"};
  const PMT_COLORS = {card:"#6366f1",cash:"#10b981",treatwell:"#8b5cf6",planity:"#f59e0b",contactless:"#38bdf8",check:"#94a3b8",mixed:"#64748b"};
  const payColors  = {card:"#6366f1",cash:"#10b981",treatwell:"#8b5cf6",planity:"#f59e0b",mixed:"#94a3b8",contactless:"#38bdf8"};
  const payLabels  = {card:"💳 Carte",cash:"💵 Espèces",treatwell:"🌿 Treatwell",planity:"📅 Planity",mixed:"⟡ Multi",contactless:"📲 Sans contact"};

  const isToday   = selDate === todayStr;
  const prevDay   = () => { const d=new Date(selDate); d.setDate(d.getDate()-1); setSelDate(d.toISOString().split("T")[0]); };
  const nextDay   = () => {
    if(isToday) return;
    const d=new Date(selDate); d.setDate(d.getDate()+1); setSelDate(d.toISOString().split("T")[0]);
  };
  const dayLabel  = () => {
    const d = new Date(selDate+"T12:00:00");
    if(selDate===todayStr) return "Aujourd'hui";
    const yesterday = new Date(now0); yesterday.setDate(now0.getDate()-1);
    if(selDate===yesterday.toISOString().split("T")[0]) return "Hier";
    return d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  };

  useEffect(()=>{
    (async()=>{
      setLoading(true); setData(null); setExpenses([]); setOrders([]);
      try {
        const [rRes, eRes, oRes] = await Promise.all([
          GET(`/reports/sales?from=${selDate}&to=${selDate}&group_by=hour&date_field=order_date`),
          GET(`/expenses?from=${selDate}&to=${selDate}&limit=200`),
          GET(`/orders?from=${selDate}&to=${selDate}&limit=200&date_field=order_date`),
        ]);
        setData(rRes.data);
        setExpenses(eRes.data||[]);
        setOrders(oRes.data||[]);
      } catch(e) { toast(e.message); }
      finally { setLoading(false); }
    })();
  },[selDate]);

  const { by_payment=[], by_employee=[] } = data||{};
  const totalCA       = orders.reduce((s,o)=>s+parseFloat(o.total||0),0);
  const totalDepenses = expenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const resultat      = totalCA - totalDepenses;
  const totalRemises  = orders.reduce((s,o)=>s+parseFloat(o.discount_amount||0),0);
  const totalByPay    = by_payment.reduce((s,r)=>s+parseFloat(r.total||0),0)||1;
  const maxEmpCA      = Math.max(...by_employee.map(e=>parseFloat(e.revenue||0)),1);

  // Regrouper les ventes par heure pour le graphe
  const byHour = Array.from({length:24},(_,h)=>({h,rev:0,cnt:0}));
  orders.forEach(o=>{
    const raw = o.created_at||o.order_date||"";
    const h   = raw.includes("T") ? parseInt(raw.split("T")[1].split(":")[0]) : 0;
    byHour[h].rev += parseFloat(o.total||0);
    byHour[h].cnt += 1;
  });
  const activeHours = byHour.filter(h=>h.rev>0);
  const maxHourRev  = Math.max(...byHour.map(h=>h.rev),1);

  const depByCategory = expenses.reduce((acc,e)=>{
    const cat=e.category||"Autre"; acc[cat]=(acc[cat]||0)+parseFloat(e.amount||0); return acc;
  },{});

  const exportCSV = () => {
    setExporting(true);
    try {
      const rows = [
        `"Rapport journalier — ${dayLabel()} (${selDate})"`,
        "",
        "=== VENTES ===",
        '"Heure";"N° commande";"Client";"Employé";"Paiement";"Remise (€)";"Total (€)"',
        ...orders.map(o=>{
          const raw=o.created_at||""; const h=raw.includes("T")?raw.split("T")[1].slice(0,5):"";
          return `"${h}";"${o.order_number||o.id}";"${o.customer_name||""}";"${o.employee_name||""}";"${o.payment_method||""}";"${parseFloat(o.discount_amount||0).toFixed(2)}";"${parseFloat(o.total||0).toFixed(2)}"`;
        }),
        `"TOTAL";"";"";"";"";"${totalRemises.toFixed(2)}";"${totalCA.toFixed(2)}"`,
        "",
        "=== DÉPENSES ===",
        '"Description";"Catégorie";"Montant (€)"',
        ...expenses.map(e=>`"${(e.label||"").replace(/"/g,'""')}";"${e.category||"Autre"}";"${parseFloat(e.amount||0).toFixed(2)}"`),
        `"TOTAL";"";"";"${totalDepenses.toFixed(2)}"`,
        "",
        `"RÉSULTAT NET";"";"";"${resultat.toFixed(2)}"`,
      ];
      const blob = new Blob(["\uFEFF"+rows.join("\n")],{type:"text/csv;charset=utf-8;"});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href=url; a.download=`rapport_journalier_${selDate}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch(e) { toast("Erreur export"); }
    finally { setExporting(false); }
  };

  return (
    <div style={c.page}>
      {/* Header */}
      <div style={c.pageHeader}>
        <div>
          <div style={c.pageTitle}>Rapport journalier</div>
          <div style={c.pageSub}>{dayLabel()}</div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {!loading && (
            <button onClick={exportCSV} disabled={exporting}
              style={{padding:"10px 18px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)",color:"#94a3b8",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"inherit"}}>
              {exporting?<Spinner size={14}/>:"↓"} Export CSV
            </button>
          )}
          {!loading && <div style={{padding:"12px 22px",borderRadius:11,background:"rgba(240,201,135,0.1)",border:"1px solid rgba(240,201,135,0.2)",color:"#f0c987",fontWeight:900,fontSize:22}}>{fmtShort(totalCA)}</div>}
        </div>
      </div>

      {/* Sélecteur jour */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22,flexWrap:"wrap"}}>
        <button onClick={prevDay} style={navBtn}>‹</button>
        <input type="date" value={selDate} max={todayStr}
          onChange={e=>{ if(e.target.value<=todayStr) setSelDate(e.target.value); }}
          style={{...c.input,padding:"8px 14px",fontSize:14,fontWeight:700,cursor:"pointer",minWidth:160}}/>
        <button onClick={nextDay} disabled={isToday}
          style={{...navBtn,opacity:isToday?0.3:1,cursor:isToday?"not-allowed":"pointer"}}>›</button>
        {!isToday && (
          <button onClick={()=>setSelDate(todayStr)} style={resetBtn}>Aujourd'hui</button>
        )}
        {!loading && <span style={{marginLeft:"auto",fontSize:13,color:"#64748b"}}>{orders.length} vente{orders.length!==1?"s":""}</span>}
      </div>

      {loading ? <div style={{display:"flex",justifyContent:"center",padding:80}}><Spinner size={44}/></div> : (
        <>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:20}}>
            {[
              {label:"Chiffre d'affaires",val:totalCA,      color:"#f0c987",icon:"◈"},
              {label:"Nb ventes",          val:orders.length,color:"#818cf8",icon:"⊞",isCt:true},
              {label:"Panier moyen",        val:orders.length?totalCA/orders.length:0,color:"#34d399",icon:"◇"},
              {label:"Total dépenses",      val:totalDepenses,color:"#f87171",icon:"◻"},
              {label:"Résultat net",         val:resultat,    color:resultat>=0?"#10b981":"#f87171",icon:resultat>=0?"▲":"▼"},
              {label:"Remises",             val:totalRemises, color:"#f59e0b",icon:"−"},
            ].map(k=>(
              <div key={k.label} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${k.color}44`,borderRadius:14,padding:"16px",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:5}}>{k.icon}</div>
                <div style={{fontSize:20,fontWeight:900,color:k.color}}>{k.isCt?k.val:fmtShort(k.val)}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:3}}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Graphe par heure */}
          {activeHours.length>0 && (
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:15,padding:"20px",marginBottom:16}}>
              <div style={c.cardTitle}>Activité par heure</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:3,height:120,paddingTop:12,overflowX:"auto"}}>
                {byHour.map((h,i)=>(
                  <div key={i} style={{flex:"0 0 auto",width:isMobile?22:28,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{width:"100%",height:90,display:"flex",alignItems:"flex-end",position:"relative"}}>
                      {h.rev>0 && (
                        <div className="bar-item" title={`${h.h}h — ${fmt(h.rev)} (${h.cnt} vente${h.cnt>1?"s":""})`}
                          style={{width:"100%",height:`${(h.rev/maxHourRev)*100}%`,background:"linear-gradient(180deg,#f0c987,#e8a44e)",borderRadius:"4px 4px 0 0",minHeight:4,cursor:"pointer",position:"relative"}}>
                          <div className="bar-tooltip" style={{display:"none",position:"absolute",top:-32,left:"50%",transform:"translateX(-50%)",background:"#1e2433",padding:"3px 8px",borderRadius:6,fontSize:11,color:"#f0c987",fontWeight:700,whiteSpace:"nowrap",zIndex:10}}>
                            {fmt(h.rev)} · {h.cnt}v
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{fontSize:9,color:h.rev>0?"#64748b":"#1e293b",textAlign:"center"}}>{h.h}h</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {orders.length===0 && expenses.length===0 && <EmptyState icon="◷" text={`Aucune donnée pour ${dayLabel()}`}/>}

          {/* Ventes du jour */}
          {orders.length>0 && (
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:15,padding:"20px",marginBottom:16}}>
              <div style={c.cardTitle}>Ventes du jour ({orders.length})</div>
              <div style={c.table}>
                {!isMobile && (
                  <div style={c.tableHead}>
                    <span style={{flex:0.7}}>Heure</span>
                    <span style={{flex:1}}>N° commande</span>
                    <span style={{flex:1.5}}>Client</span>
                    <span style={{flex:1.2}}>Employé</span>
                    <span style={{flex:1}}>Paiement</span>
                    <span style={{flex:0.8,textAlign:"right"}}>Remise</span>
                    <span style={{flex:1,textAlign:"right"}}>Total</span>
                  </div>
                )}
                {orders.map(order=>{
                  const raw=order.created_at||"";
                  const heure = raw.includes("T") ? raw.split("T")[1].slice(0,5) : "—";
                  const pmtColor = PMT_COLORS[order.payment_method]||"#64748b";
                  return (
                    <div key={order.id} style={{...c.tableRow,flexDirection:isMobile?"column":"row",gap:isMobile?6:0,alignItems:isMobile?"flex-start":"center"}}>
                      {isMobile ? (
                        <>
                          <div style={{display:"flex",justifyContent:"space-between",width:"100%"}}>
                            <span style={{fontSize:12,color:"#64748b"}}>{heure}</span>
                            <span style={{fontWeight:900,color:"#f0c987",fontSize:16}}>{fmt(order.total)}</span>
                          </div>
                          <div style={{fontSize:14,fontWeight:700}}>{order.order_number||`#${order.id}`}</div>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            {order.customer_name&&<span style={{fontSize:12,color:"#94a3b8"}}>◉ {order.customer_name}</span>}
                            {order.employee_name&&<span style={{fontSize:12,color:"#818cf8"}}>⟡ {order.employee_name}</span>}
                            <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:pmtColor+"18",color:pmtColor,fontWeight:600}}>{PMTS[order.payment_method]||order.payment_method||"—"}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{flex:0.7,fontSize:14,fontWeight:700,color:"#f0c987",fontVariantNumeric:"tabular-nums"}}>{heure}</span>
                          <span style={{flex:1,fontSize:13,color:"#64748b"}}>{order.order_number||`#${order.id}`}</span>
                          <span style={{flex:1.5,fontSize:14}}>{order.customer_name||<span style={{color:"#334155"}}>—</span>}</span>
                          <span style={{flex:1.2,fontSize:13,color:"#818cf8"}}>{order.employee_name||<span style={{color:"#334155"}}>—</span>}</span>
                          <span style={{flex:1}}><span style={{fontSize:12,padding:"3px 9px",borderRadius:20,background:pmtColor+"18",color:pmtColor,fontWeight:600}}>{PMTS[order.payment_method]||order.payment_method||"—"}</span></span>
                          <span style={{flex:0.8,textAlign:"right",fontSize:13,color:"#f59e0b"}}>{parseFloat(order.discount_amount||0)>0?"−"+fmt(order.discount_amount):"—"}</span>
                          <span style={{flex:1,textAlign:"right",fontWeight:900,fontSize:15,color:"#f0c987"}}>{fmt(order.total)}</span>
                        </>
                      )}
                    </div>
                  );
                })}
                <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:4}}>
                  <span style={{fontSize:13,color:"#64748b"}}>{orders.length} vente{orders.length!==1?"s":""}</span>
                  {totalRemises>0&&<span style={{fontSize:13,color:"#f59e0b"}}>Remises −{fmt(totalRemises)}</span>}
                  <span style={{fontWeight:900,fontSize:16,color:"#f0c987"}}>{fmt(totalCA)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Répartition paiements + employés */}
          {(by_payment.length>0||by_employee.length>0) && (
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:16}}>
              {by_payment.length>0 && (
                <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"18px"}}>
                  <div style={c.cardTitle}>Par moyen de paiement</div>
                  {by_payment.map(pb=>{
                    const pct=(parseFloat(pb.total)/totalByPay)*100;
                    return (
                      <div key={pb.method} style={{marginBottom:14}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
                          <span>{payLabels[pb.method]||pb.method}</span>
                          <span style={{fontWeight:800,color:payColors[pb.method]||"#888"}}>{fmt(parseFloat(pb.total))}</span>
                        </div>
                        <div style={{height:5,borderRadius:4,background:"rgba(255,255,255,0.06)"}}>
                          <div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:payColors[pb.method]||"#888"}}/>
                        </div>
                        <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{pct.toFixed(0)}% · {pb.count} vente{pb.count>1?"s":""}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {by_employee.length>0 && (
                <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"18px"}}>
                  <div style={c.cardTitle}>Par employé</div>
                  {by_employee.map((emp,i)=>{
                    const empColor=emp.color||["#f0c987","#818cf8","#34d399","#f472b6"][i%4];
                    return (
                      <div key={emp.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                        <div style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${empColor}66`,background:empColor+"22",color:empColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,flexShrink:0}}>
                          {(emp.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{emp.name}</div>
                          <div style={{height:4,borderRadius:3,background:"rgba(255,255,255,0.06)"}}>
                            <div style={{width:`${(parseFloat(emp.revenue)/maxEmpCA)*100}%`,height:"100%",borderRadius:3,background:empColor}}/>
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:14,fontWeight:800,color:empColor}}>{fmt(parseFloat(emp.revenue||0))}</div>
                          <div style={{fontSize:11,color:"#64748b"}}>{emp.total_orders} vente{emp.total_orders>1?"s":""}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Dépenses du jour */}
          {expenses.length>0 && (
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:14,padding:"18px",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={c.cardTitle}>Dépenses du jour</div>
                <span style={{fontSize:15,fontWeight:900,color:"#f87171"}}>{fmt(totalDepenses)}</span>
              </div>
              {Object.entries(depByCategory).map(([cat,val])=>{
                const catColors={"Matériel":"#818cf8","Loyer":"#f87171","Stock":"#34d399","Salaires":"#f59e0b","Services":"#60a5fa","Autre":"#94a3b8"};
                const col=catColors[cat]||"#94a3b8";
                return (
                  <div key={cat} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <span style={{fontSize:12,padding:"3px 9px",borderRadius:20,background:col+"18",color:col,fontWeight:600}}>{cat}</span>
                    <span style={{fontSize:14,fontWeight:800,color:"#f87171"}}>−{fmt(val)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Résultat net */}
          {(orders.length>0||expenses.length>0) && (
            <div style={{background:resultat>=0?"rgba(16,185,129,0.06)":"rgba(248,113,113,0.06)",border:`1px solid ${resultat>=0?"rgba(16,185,129,0.25)":"rgba(248,113,113,0.25)"}`,borderRadius:14,padding:"20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,color:"#64748b",marginBottom:4}}>Résultat net — {dayLabel()}</div>
                <div style={{fontSize:12,color:"#475569"}}>CA {fmt(totalCA)} − Dépenses {fmt(totalDepenses)}</div>
              </div>
              <div style={{fontSize:28,fontWeight:900,color:resultat>=0?"#10b981":"#f87171"}}>{resultat>=0?"+":""}{fmt(resultat)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

