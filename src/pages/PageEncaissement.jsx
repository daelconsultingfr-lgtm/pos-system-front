import { useState, useEffect, useRef, useCallback } from "react";
import { GET, POST, PUT, DELETE } from "../utils/api";
import { fmt, fmtShort, fmtDate, MONTHS, PMTS, PMT_COLORS, PAYMENT_METHODS } from "../utils/format";
import { c, navBtn, resetBtn } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { EmptyState, Modal, ModalActions } from "../components/UI";

export default function PageEncaissement({ toast }) {
  const [screen, setScreen]           = useState("caisse");
  const [categories, setCategories]   = useState([]);
  const [services, setServices]       = useState([]);
  const [customers, setCustomers]     = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [serviceSearch, setServiceSearch]   = useState("");
  const [cart, setCart]               = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch]     = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch]     = useState("");
  const [discount, setDiscount]       = useState("");
  const [additionalFees, setAdditionalFees]     = useState("");
  const [feesType, setFeesType]       = useState("add");
  const [paymentLines, setPaymentLines] = useState([{id:1,key:"card",amount:""}]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [notes, setNotes]             = useState("");
  const [orderDate, setOrderDate]     = useState(new Date().toISOString().split("T")[0]);
  const [catOpen, setCatOpen]         = useState(false);
  const { isMobile, isTablet, w }     = useBreakpoint();

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        const [sRes,cRes,eRes] = await Promise.all([
          GET("/products?limit=500"),
          GET("/categories"),
          GET("/employees"),
        ]);
        setServices(sRes.data); setCategories(cRes.data); setEmployees(eRes.data);
      } catch(e) { toast(e.message); }
      finally { setLoading(false); }
    })();
  },[]);

  useEffect(()=>{
    if (customerSearch.length<2) { setCustomers([]); return; }
    const t = setTimeout(async()=>{ try { const res=await GET(`/customers?search=${encodeURIComponent(customerSearch)}&limit=10`); setCustomers(res.data); } catch{} },300);
    return ()=>clearTimeout(t);
  },[customerSearch]);

  const allCats = [{id:"all",name:"Tout",color:"#f0c987",icon:"✦"},...categories];
  const filtered = (activeCategory==="all" ? services : services.filter(s=>s.category_id===activeCategory))
    .filter(s => !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
  const filteredEmps = employees.filter(e => !employeeSearch || e.name.toLowerCase().includes(employeeSearch.toLowerCase()));

  const addToCart = (sv) => setCart(prev=>{
    const ex=prev.find(i=>i.id===sv.id);
    if (ex) return prev.map(i=>i.id===sv.id?{...i,qty:i.qty+1}:i);
    return [...prev,{...sv,qty:1}];
  });
  const removeFromCart  = (id) => setCart(prev=>{ const item=prev.find(i=>i.id===id); if(item.qty>1) return prev.map(i=>i.id===id?{...i,qty:i.qty-1}:i); return prev.filter(i=>i.id!==id); });
  const deleteFromCart  = (id) => setCart(prev=>prev.filter(i=>i.id!==id));

  const subtotal       = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const discountAmount = discount ? subtotal*(parseFloat(discount)/100) : 0;
  const feesVal        = parseFloat(additionalFees)||0;
  const feesAmount     = feesType==="add" ? feesVal : -feesVal;
  const total          = Math.max(0,subtotal-discountAmount+feesAmount);
  const usedKeys       = paymentLines.map(p=>p.key);
  const availMethods   = PAYMENT_METHODS.filter(m=>!usedKeys.includes(m.key));
  const totalPaid      = paymentLines.reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  const remaining      = total-totalPaid;
  const cashPaid       = parseFloat(paymentLines.find(p=>p.key==="cash")?.amount)||0;
  const nonCashPaid    = paymentLines.filter(p=>p.key!=="cash").reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  const changeDue      = cashPaid>0 ? Math.max(0,cashPaid+nonCashPaid-total) : 0;
  const canCheckout    = cart.length>0;
  const canPay         = remaining<=0.005 && totalPaid>0;

  const addPayLine    = () => { const av=PAYMENT_METHODS.find(m=>!usedKeys.includes(m.key)); if(!av)return; setPaymentLines(prev=>[...prev,{id:Date.now(),key:av.key,amount:""}]); };
  const removePayLine = (id) => setPaymentLines(prev=>prev.filter(p=>p.id!==id));
  const updateLine    = (id,field,val) => setPaymentLines(prev=>prev.map(p=>p.id===id?{...p,[field]:val}:p));
  const setExact      = (id) => { const other=paymentLines.filter(p=>p.id!==id).reduce((s,p)=>s+(parseFloat(p.amount)||0),0); updateLine(id,"amount",Math.max(0,total-other).toFixed(2)); };

  const handleEncaisser = async () => {
    setSubmitting(true);
    try {
      const res = await POST("/orders",{
        customer_id:  selectedCustomer?.id||undefined,
        employee_id:  selectedEmployee?.id||undefined,
        order_date:   orderDate,
        items: cart.map(i=>({product_id:i.id,quantity:i.qty,discount:0})),
        discount_amount: discountAmount,
        additionnal_fees: feesAmount,
        notes: notes||undefined,
        payment_breakdown: paymentLines.filter(p=>(parseFloat(p.amount)||0)>0).map(p=>({method:p.key,amount:parseFloat(p.amount)})),
      });
      setSuccessData(res.data); setScreen("success");
    } catch(e) { toast(e.message); }
    finally { setSubmitting(false); }
  };

  const reset = () => {
    setCart([]); setDiscount(""); setAdditionalFees(""); setFeesType("add");
    setPaymentLines([{id:1,key:"card",amount:""}]);
    setSuccessData(null); setNotes(""); setServiceSearch("");
    setSelectedCustomer(null); setCustomerSearch("");
    setSelectedEmployee(null); setEmployeeSearch("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setScreen("caisse");
  };

  // ── ÉCRAN CAISSE ──────────────────────────────────────────────────────────
  if (screen==="caisse") return (
    <div className="caisse-root">
      {/* ── Catégories : colonne gauche desktop, barre top mobile ── */}
      <aside className="caisse-cats">
        <div className="caisse-cats-title">Catégories</div>
        {loading ? <div style={{padding:16,display:"flex",justifyContent:"center"}}><Spinner size={20}/></div>
          : allCats.map(cat => {
          const active = activeCategory===cat.id;
          return (
            <button key={cat.id} className={`caisse-cat-btn${active?" active":""}`}
              style={active?{background:(cat.color||"#f0c987")+"18",color:cat.color||"#f0c987",borderColor:(cat.color||"#f0c987")+"44"}:{}}
              onClick={()=>setActiveCategory(cat.id)}>
              <span className="caisse-cat-icon">{cat.icon||"✦"}</span>
              <span className="caisse-cat-label">{cat.name}</span>
              {active && <span className="caisse-cat-dot" style={{background:cat.color||"#f0c987"}}/>}
            </button>
          );
        })}
      </aside>

      {/* ── Grille prestations ── */}
      <main className="caisse-main">
        {/* Barre de recherche */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexShrink:0}}>
          <div style={{position:"relative",flex:1}}>
            <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#475569",pointerEvents:"none"}}>🔍</span>
            <input style={{...c.input,width:"100%",padding:"9px 36px 9px 34px",fontSize:13}}
              placeholder="Rechercher une prestation…"
              value={serviceSearch}
              onChange={e=>setServiceSearch(e.target.value)}/>
            {serviceSearch && (
              <button onClick={()=>setServiceSearch("")}
                style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>✕</button>
            )}
          </div>
          <span style={{fontSize:12,color:"#475569",whiteSpace:"nowrap",flexShrink:0}}>{filtered.length} résultat{filtered.length!==1?"s":""}</span>
        </div>
        {loading
          ? <div style={{display:"flex",justifyContent:"center",padding:40}}><Spinner/></div>
          : filtered.length===0
            ? <EmptyState text={serviceSearch ? `Aucun résultat pour « ${serviceSearch} »` : "Aucune prestation dans cette catégorie"}/>
            : <div className="caisse-grid">
                {filtered.map(sv=>{
                  const inCart = cart.find(i=>i.id===sv.id);
                  const color  = sv.category_color||"#f0c987";
                  return (
                    <button key={sv.id} className="caisse-service-btn service-btn"
                      style={inCart?{borderColor:color+"66",background:color+"10"}:{}}
                      onClick={()=>addToCart(sv)}>
                      {inCart && <span className="caisse-badge" style={{background:color,color:"#0a0d14"}}>{inCart.qty}</span>}
                      <span className="caisse-sv-name" style={inCart?{paddingRight:24}:{}}>{sv.name}</span>
                      <span className="caisse-sv-price" style={{color}}>{fmt(sv.price)}</span>
                    </button>
                  );
                })}
              </div>
        }
      </main>

      {/* ── Récap panier — toujours à droite ── */}
      <aside className="caisse-recap">
        <div className="caisse-recap-header">
          <span className="caisse-recap-title">Panier</span>
          {cart.length>0 && <button className="caisse-vider-btn" onClick={()=>setCart([])}>Vider</button>}
        </div>

        <div className="caisse-recap-items">
          {cart.length===0
            ? <div className="caisse-empty-cart">
                <div style={{fontSize:32,opacity:0.2,marginBottom:8}}>◈</div>
                <div>Aucune prestation</div>
                <div style={{fontSize:12,color:"#334155",marginTop:3}}>Sélectionnez dans la grille</div>
              </div>
            : cart.map(item=>(
                <div key={item.id} className="caisse-cart-item">
                  <div className="caisse-cart-info">
                    <div className="caisse-cart-name">{item.name}</div>
                    {item.duration && <div className="caisse-cart-sub">{item.duration} · {fmt(item.price)}</div>}
                  </div>
                  <div className="caisse-cart-controls">
                    <button className="caisse-qty-btn" onClick={()=>removeFromCart(item.id)}>−</button>
                    <span className="caisse-qty-val">{item.qty}</span>
                    <button className="caisse-qty-btn" onClick={()=>addToCart(item)}>+</button>
                  </div>
                  <div className="caisse-cart-total">{fmt(item.price*item.qty)}</div>
                  <button className="caisse-del-btn" onClick={()=>deleteFromCart(item.id)}>✕</button>
                </div>
              ))
          }
        </div>

        <div className="caisse-recap-footer">
          <div className="caisse-total-row">
            <span style={{color:"#94a3b8"}}>Sous-total</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div className="caisse-divider"/>
          <div className="caisse-total-row" style={{fontWeight:800,fontSize:"clamp(15px,1.4vw,18px)"}}>
            <span>Total</span>
            <span style={{color:"#f0c987",fontSize:"clamp(18px,1.8vw,22px)"}}>{fmt(subtotal)}</span>
          </div>
          <button
            className={`caisse-checkout-btn checkout-btn${canCheckout?"":" disabled"}`}
            disabled={!canCheckout}
            onClick={()=>setScreen("paiement")}>
            Encaisser →
          </button>
        </div>
      </aside>
    </div>
  );

  // ── ÉCRAN PAIEMENT ────────────────────────────────────────────────────────
  if (screen==="paiement") return (
    <div style={{display:"flex",flex:1,height:`calc(100vh - ${isMobile?58:72}px)`,overflow:"hidden",flexDirection:isMobile?"column":"row"}}>
      {/* Colonne gauche */}
      <div style={{flex:1,padding:isMobile?"14px":"22px 26px",overflowY:"auto",borderRight:isMobile?"none":"1px solid rgba(255,255,255,0.06)"}}>
        <button style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",color:"#94a3b8",padding:"8px 14px",borderRadius:9,cursor:"pointer",fontSize:14,marginBottom:18}} onClick={()=>setScreen("caisse")}>← Retour</button>
        <div style={{fontSize:isMobile?18:22,fontWeight:900,marginBottom:18}}>Finaliser la vente</div>

        {/* Articles */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:13,padding:"16px 18px",marginBottom:14}}>
          <div style={c.cardTitle}>Prestations</div>
          {cart.map(item=>(
            <div key={item.id} style={{display:"flex",justifyContent:"space-between",fontSize:14,padding:"4px 0",color:"#cbd5e1"}}>
              <span>{item.name}{item.qty>1&&<span style={{color:"#64748b",fontSize:12}}> ×{item.qty}</span>}</span>
              <span style={{fontWeight:700}}>{fmt(item.price*item.qty)}</span>
            </div>
          ))}
          <div style={{height:1,background:"rgba(255,255,255,0.06)",margin:"8px 0"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:15}}><span>Sous-total</span><span>{fmt(subtotal)}</span></div>
        </div>

        {/* Client, Employé & Notes */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:13,padding:"16px 18px",marginBottom:14}}>
          <div style={c.cardTitle}>Client & Employé</div>

          {/* Date */}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Date de la vente</label>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="date" style={{...c.input,flex:1}}
                value={orderDate} max={new Date().toISOString().split("T")[0]}
                onChange={e=>setOrderDate(e.target.value)}/>
              {orderDate!==new Date().toISOString().split("T")[0] && (
                <span style={{fontSize:12,color:"#f87171",fontWeight:700,padding:"5px 10px",borderRadius:8,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",flexShrink:0,whiteSpace:"nowrap"}}>⚠ Antidatée</span>
              )}
            </div>
          </div>

          {/* Sélecteur client */}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Client (optionnel)</label>
            <div style={{position:"relative"}}>
              {selectedCustomer ? (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:"rgba(240,201,135,0.08)",border:"1px solid rgba(240,201,135,0.2)"}}>
                  <span style={c.avatar}>{(selectedCustomer.name||"?")[0]}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selectedCustomer.name}</div>
                    {selectedCustomer.phone && <div style={{fontSize:12,color:"#64748b"}}>{selectedCustomer.phone}</div>}
                  </div>
                  <button style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16,lineHeight:1}} onClick={()=>{setSelectedCustomer(null);setCustomerSearch("");}}>✕</button>
                </div>
              ) : (
                <>
                  <input style={{...c.input,width:"100%"}} placeholder="Rechercher un client…" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/>
                  {customers.length>0 && (
                    <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#0d1117",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,zIndex:30,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
                      {customers.map(cl=>(
                        <div key={cl.id} style={{padding:"11px 15px",cursor:"pointer",fontSize:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}
                          onMouseDown={e=>{e.preventDefault();setSelectedCustomer(cl);setCustomers([]);setCustomerSearch("");}}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <span style={{fontWeight:600}}>{cl.name}</span>
                          <span style={{color:"#64748b",fontSize:12}}>{cl.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sélecteur employé */}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Employé (optionnel)</label>
            <div style={{position:"relative"}}>
              {selectedEmployee ? (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:(selectedEmployee.color||"#818cf8")+"12",border:`1px solid ${(selectedEmployee.color||"#818cf8")}44`}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:(selectedEmployee.color||"#818cf8")+"22",color:selectedEmployee.color||"#818cf8",fontSize:12,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {(selectedEmployee.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selectedEmployee.name}</div>
                    <div style={{fontSize:12,color:"#64748b",textTransform:"capitalize"}}>{selectedEmployee.role}</div>
                  </div>
                  <button style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16,lineHeight:1}} onClick={()=>{setSelectedEmployee(null);setEmployeeSearch("");}}>✕</button>
                </div>
              ) : (
                <>
                  <input style={{...c.input,width:"100%"}} placeholder="Rechercher un employé…" value={employeeSearch} onChange={e=>setEmployeeSearch(e.target.value)}/>
                  {employeeSearch.length > 0 && filteredEmps.length > 0 && (
                    <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#0d1117",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,zIndex:30,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.5)",maxHeight:220,overflowY:"auto"}}>
                      {filteredEmps.map(emp=>(
                        <div key={emp.id} style={{padding:"11px 15px",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",gap:12}}
                          onMouseDown={e=>{e.preventDefault();setSelectedEmployee(emp);setEmployeeSearch("");}}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <div style={{width:30,height:30,borderRadius:"50%",background:(emp.color||"#818cf8")+"22",color:emp.color||"#818cf8",fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            {(emp.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <span style={{fontWeight:600,flex:1}}>{emp.name}</span>
                          <span style={{color:"#64748b",fontSize:12,textTransform:"capitalize"}}>{emp.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Notes (optionnel)</label>
            <input style={{...c.input,width:"100%"}} placeholder="Remarques…" value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>
        </div>

        {/* Ajustements */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:13,padding:"16px 18px"}}>
          <div style={c.cardTitle}>Ajustements</div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            <div style={{flex:"1 1 140px",display:"flex",flexDirection:"column",gap:7}}>
              <label style={{fontSize:12,color:"#94a3b8",fontWeight:500}}>Réduction (%)</label>
              <div style={{position:"relative",display:"flex",alignItems:"center"}}>
                <input type="number" min="0" max="100" style={{...c.input,width:"100%",paddingRight:28}} value={discount} onChange={e=>setDiscount(e.target.value)} placeholder="0"/>
                <span style={{position:"absolute",right:10,color:"#64748b",fontSize:13,pointerEvents:"none"}}>%</span>
              </div>
              {discountAmount>0 && <span style={{fontSize:13,color:"#f0c987",fontWeight:700}}>− {fmt(discountAmount)}</span>}
            </div>
            <div style={{flex:"1 1 160px",display:"flex",flexDirection:"column",gap:7}}>
              <label style={{fontSize:12,color:"#94a3b8",fontWeight:500}}>Frais additionnels</label>
              <div style={{display:"flex",gap:8}}>
                <button style={{width:36,height:44,borderRadius:8,border:`1px solid ${feesType==="add"?"rgba(240,201,135,0.4)":"rgba(255,255,255,0.1)"}`,background:feesType==="add"?"rgba(240,201,135,0.15)":"transparent",color:feesType==="add"?"#f0c987":"#94a3b8",fontSize:18,cursor:"pointer",fontWeight:700,flexShrink:0}} onClick={()=>setFeesType("add")}>+</button>
                <button style={{width:36,height:44,borderRadius:8,border:`1px solid ${feesType==="sub"?"rgba(240,201,135,0.4)":"rgba(255,255,255,0.1)"}`,background:feesType==="sub"?"rgba(240,201,135,0.15)":"transparent",color:feesType==="sub"?"#f0c987":"#94a3b8",fontSize:18,cursor:"pointer",fontWeight:700,flexShrink:0}} onClick={()=>setFeesType("sub")}>−</button>
                <div style={{position:"relative",flex:1,display:"flex",alignItems:"center"}}>
                  <input type="number" min="0" style={{...c.input,width:"100%",paddingRight:28}} value={additionalFees} onChange={e=>setAdditionalFees(e.target.value)} placeholder="0"/>
                  <span style={{position:"absolute",right:10,color:"#64748b",fontSize:13,pointerEvents:"none"}}>€</span>
                </div>
              </div>
              {feesVal>0 && <span style={{fontSize:13,color:"#f0c987",fontWeight:700}}>{feesType==="add"?"+":"−"} {fmt(feesVal)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Colonne droite */}
      <div style={{width:isMobile?"100%":isTablet?"310px":"380px",flexShrink:0,padding:isMobile?"14px":"22px 20px",overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
        {/* Total */}
        <div style={{background:"linear-gradient(135deg,rgba(240,201,135,0.12),rgba(232,164,78,0.08))",border:"1px solid rgba(240,201,135,0.25)",borderRadius:15,padding:"22px",textAlign:"center"}}>
          <div style={{fontSize:12,color:"#94a3b8",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Total à encaisser</div>
          <div style={{fontSize:isMobile?32:38,fontWeight:900,color:"#f0c987",letterSpacing:"-0.02em"}}>{fmt(total)}</div>
          {(discountAmount>0||feesVal>0) && (
            <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:10,flexWrap:"wrap"}}>
              {discountAmount>0 && <span style={{fontSize:12,color:"#94a3b8",background:"rgba(255,255,255,0.06)",padding:"4px 10px",borderRadius:20}}>Remise −{fmt(discountAmount)}</span>}
              {feesVal>0 && <span style={{fontSize:12,color:"#94a3b8",background:"rgba(255,255,255,0.06)",padding:"4px 10px",borderRadius:20}}>{feesType==="add"?"+":"−"}{fmt(feesVal)}</span>}
            </div>
          )}
        </div>

        {/* Paiements */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:13,padding:"16px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={c.cardTitle}>Modes de paiement</div>
            {availMethods.length>0 && <button style={{fontSize:12,color:"#f0c987",background:"rgba(240,201,135,0.1)",border:"1px solid rgba(240,201,135,0.2)",borderRadius:8,padding:"5px 11px",cursor:"pointer",fontWeight:700}} onClick={addPayLine}>+ Ajouter</button>}
          </div>
          {paymentLines.map(line=>{
            const method=PAYMENT_METHODS.find(m=>m.key===line.key);
            const amt=parseFloat(line.amount)||0;
            return (
              <div key={line.id} style={{marginBottom:14,padding:"13px 14px",borderRadius:11,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.02)"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:11,flexWrap:"wrap"}}>
                  {PAYMENT_METHODS.map(m=>(
                    <button key={m.key} disabled={usedKeys.includes(m.key)&&m.key!==line.key}
                      style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${line.key===m.key?m.color:"rgba(255,255,255,0.1)"}`,background:line.key===m.key?m.color+"18":"transparent",color:line.key===m.key?m.color:"#64748b",fontSize:13,cursor:usedKeys.includes(m.key)&&m.key!==line.key?"not-allowed":"pointer",fontWeight:line.key===m.key?700:500,opacity:usedKeys.includes(m.key)&&m.key!==line.key?0.3:1}}
                      onClick={()=>updateLine(line.id,"key",m.key)}>{m.icon} {m.label}</button>
                  ))}
                  {paymentLines.length>1 && <button style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,marginLeft:"auto"}} onClick={()=>removePayLine(line.id)}>✕</button>}
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{position:"relative",flex:1,display:"flex",alignItems:"center"}}>
                    <input type="number" min="0" step="0.01"
                      style={{width:"100%",padding:"12px 36px 12px 14px",borderRadius:9,border:`1px solid ${amt>0?(method?.color||"#f0c987"):"rgba(255,255,255,0.1)"}`,background:"rgba(255,255,255,0.05)",color:"#f8fafc",fontSize:isMobile?22:24,fontWeight:900,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
                      value={line.amount} onChange={e=>updateLine(line.id,"amount",e.target.value)} placeholder="0,00"/>
                    <span style={{position:"absolute",right:12,color:"#64748b",fontSize:15,pointerEvents:"none"}}>€</span>
                  </div>
                  <button style={{padding:"9px 14px",borderRadius:9,border:`1px solid ${method?.color}`,background:"transparent",color:method?.color,fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}} onClick={()=>setExact(line.id)}>Solde</button>
                </div>
                {line.key==="cash"&&changeDue>0.005 && (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,padding:"8px 12px",borderRadius:9,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)"}}>
                    <span style={{fontSize:13,color:"#10b981",fontWeight:600}}>Monnaie à rendre</span>
                    <span style={{fontSize:18,fontWeight:900,color:"#10b981"}}>{fmt(changeDue)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Balance */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:11,padding:"13px 16px",display:"flex",flexDirection:"column",gap:7}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:14}}><span style={{color:"#94a3b8"}}>Total réglé</span><span style={{fontWeight:700}}>{fmt(totalPaid)}</span></div>
          <div style={{height:1,background:"rgba(255,255,255,0.06)"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:800}}>
            <span>Reste à régler</span>
            <span style={{fontSize:isMobile?16:18,fontWeight:900,color:remaining>0.005?"#f87171":"#10b981"}}>{remaining>0.005?fmt(remaining):"✓ Soldé"}</span>
          </div>
        </div>

        <button style={{padding:"15px",borderRadius:12,border:"none",background:canPay?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,0.06)",color:canPay?"#fff":"#334155",fontWeight:900,fontSize:isMobile?15:16,cursor:canPay?"pointer":"not-allowed",boxShadow:canPay?"0 4px 24px rgba(16,185,129,0.35)":"none",transition:"all 0.2s",opacity:submitting?0.7:1}} className="encaisser-btn"
          disabled={!canPay||submitting} onClick={handleEncaisser}>
          {submitting ? <span style={{display:"flex",gap:8,justifyContent:"center",alignItems:"center"}}><Spinner size={18} color="#fff"/> Enregistrement…</span> : "✓ Valider l'encaissement"}
        </button>
      </div>
    </div>
  );

  // ── ÉCRAN SUCCÈS ──────────────────────────────────────────────────────────
  if (screen==="success"&&successData) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"radial-gradient(ellipse at center,rgba(16,185,129,0.08) 0%,transparent 70%)"}}>
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,padding:isMobile?"32px 22px":"48px 42px",textAlign:"center",maxWidth:420,width:"100%"}} className="success-card">
        <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:30,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",boxShadow:"0 0 50px rgba(16,185,129,0.4)"}} className="success-icon">✓</div>
        <div style={{fontSize:isMobile?20:24,fontWeight:900,marginBottom:5}}>Encaissement validé</div>
        <div style={{fontSize:13,color:"#64748b",letterSpacing:"0.1em",marginBottom:24}}>{successData.order_number}</div>
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"16px",marginBottom:22,textAlign:"left"}}>
          {(successData.items||[]).map((item,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:14,padding:"4px 0",color:"#cbd5e1"}}>
              <span>{item.product_name}{item.quantity>1?` ×${item.quantity}`:""}</span>
              <span>{fmt(item.subtotal)}</span>
            </div>
          ))}
          <div style={{height:1,background:"rgba(255,255,255,0.06)",margin:"8px 0"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:isMobile?17:20,color:"#f8fafc"}}><span>Total</span><span>{fmt(successData.total)}</span></div>
          <div style={{height:1,background:"rgba(255,255,255,0.06)",margin:"8px 0"}}/>
          {(successData.payments||[]).map((pl,i)=>{ const m=PAYMENT_METHODS.find(m=>m.key===pl.method); return (
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0",color:"#94a3b8"}}>
              <span>{m?.icon} {m?.label||pl.method}</span><span>{fmt(pl.amount)}</span>
            </div>
          ); })}
          {parseFloat(successData.change_due)>0.005 && (
            <div style={{display:"flex",justifyContent:"space-between",fontSize:14,padding:"4px 0",color:"#10b981",fontWeight:700}}><span>Monnaie rendue</span><span>{fmt(successData.change_due)}</span></div>
          )}
          {successData.customer_name && <div style={{marginTop:8,fontSize:12,color:"#64748b",textAlign:"center"}}>Client : {successData.customer_name}</div>}
        </div>
        <div style={{display:"flex",gap:11}}>
          <button style={{flex:1,padding:"12px",borderRadius:11,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#94a3b8",fontSize:14,cursor:"pointer",fontWeight:600}} onClick={()=>window.print()}>🖨 Imprimer</button>
          <button style={{flex:2,padding:"12px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#f0c987,#e8a44e)",color:"#0a0d14",fontWeight:900,fontSize:14,cursor:"pointer"}} onClick={reset} className="checkout-btn">Nouvelle vente →</button>
        </div>
      </div>
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL & ACTIONS — composants partagés
// ═══════════════════════════════════════════════════════════════════════════════
