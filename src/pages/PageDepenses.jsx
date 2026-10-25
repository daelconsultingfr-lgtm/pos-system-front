import { useState, useEffect, useRef, useCallback } from "react";
import { GET, POST, PUT, DELETE, getToken } from "../utils/api";
import { fmt, fmtDate, MONTHS } from "../utils/format";
import { c, navBtn, resetBtn } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { EmptyState, Modal, ModalActions } from "../components/UI";

const API_BASE    = "http://localhost:3000/api/v1";
const SERVER_BASE = "http://localhost:3000"; // pour afficher les fichiers statiques

const CATEGORIES  = ["Matériel","Loyer","Stock","Salaires","Services","Autre"];
const CAT_COLORS  = {
  "Matériel":"#818cf8","Loyer":"#f87171","Stock":"#34d399",
  "Salaires":"#f59e0b","Services":"#60a5fa","Autre":"#94a3b8",
};
const EMPTY_FORM  = { label:"", amount:"", category:"", date:"", notes:"" };

// ─── Upload du fichier vers le backend ───────────────────────────────────────
async function uploadFile(file, date) {
  const fd = new FormData();
  fd.append("file", file);
  if (date) fd.append("date", date);
  const res = await fetch(`${API_BASE}/upload/receipt`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Erreur upload");
  return json.data.url; // ex : /invoices/2026/03/filename.jpg
}

// ─── Extraction IA du montant uniquement ─────────────────────────────────────
async function extractAmountWithAI(file) {
  const toBase64 = (f) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  const isPdf    = file.type === "application/pdf";
  const base64   = await toBase64(file);
  const mediaType = file.type;

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [{
      role: "user",
      content: [
        isPdf
          ? { type:"document", source:{ type:"base64", media_type:"application/pdf", data:base64 } }
          : { type:"image",    source:{ type:"base64", media_type:mediaType,          data:base64 } },
        { type:"text", text:`Extrais uniquement le montant TOTAL TTC de cette facture/ticket.
Réponds en JSON strict : {"amount": nombre}
Exemple : {"amount": 24.50}
Ne renvoie QUE le JSON, sans markdown.` }
      ]
    }]
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const text = (data.content || []).map(b => b.text || "").join("").trim();
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  return parsed.amount ?? null;
}

// ─── Vignette / aperçu d'un fichier ──────────────────────────────────────────
function FilePreview({ src, onRemove, label = "" }) {
  const isPdf = src && (src.endsWith(".pdf") || src.includes("application/pdf"));
  const url   = src?.startsWith("blob:") || src?.startsWith("data:")
    ? src
    : SERVER_BASE + src;

  return (
    <div style={{ position:"relative", textAlign:"center" }}>
      {isPdf ? (
        <div style={{ padding:"20px 14px", borderRadius:9,
          background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.1)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:36 }}>📄</span>
          <div style={{ fontSize:13, color:"#94a3b8", wordBreak:"break-all", maxWidth:220 }}>{label}</div>
          <a href={url} target="_blank" rel="noreferrer"
            style={{ fontSize:12, color:"#f0c987", textDecoration:"none", fontWeight:600 }}>
            Ouvrir le PDF ↗
          </a>
        </div>
      ) : (
        <img src={url} alt="facture"
          style={{ maxHeight:180, maxWidth:"100%", borderRadius:9, objectFit:"contain",
            cursor:"pointer" }}
          onClick={()=>window.open(url,"_blank")}/>
      )}
      {onRemove && (
        <button onClick={onRemove}
          style={{ position:"absolute", top:-10, right:-10,
            width:26, height:26, borderRadius:"50%",
            background:"#f87171", border:"none", color:"#fff",
            fontSize:13, cursor:"pointer", fontWeight:700 }}>✕</button>
      )}
    </div>
  );
}

// ─── Modal visionneuse de justificatif ───────────────────────────────────────
function ReceiptViewer({ expense, onClose }) {
  const isPdf = expense.receipt_url?.endsWith(".pdf");
  const url   = SERVER_BASE + expense.receipt_url;
  return (
    <Modal title={`Justificatif — ${expense.label}`} onClose={onClose}>
      <div style={{ textAlign:"center" }}>
        {isPdf ? (
          <>
            <div style={{ fontSize:52, marginBottom:12 }}>📄</div>
            <a href={url} target="_blank" rel="noreferrer"
              style={{ display:"inline-block", padding:"11px 22px", borderRadius:9,
                background:"linear-gradient(135deg,#f0c987,#e8a44e)", color:"#0a0d14",
                fontWeight:900, fontSize:14, textDecoration:"none" }}>
              Ouvrir le PDF ↗
            </a>
          </>
        ) : (
          <img src={url} alt="justificatif"
            style={{ maxWidth:"100%", maxHeight:"70vh", borderRadius:12,
              objectFit:"contain", cursor:"pointer" }}
            onClick={()=>window.open(url,"_blank")}/>
        )}
        <div style={{ marginTop:14, fontSize:12, color:"#475569" }}>
          Cliquez pour ouvrir en grand
        </div>
      </div>
    </Modal>
  );
}

// ─── Page Dépenses ────────────────────────────────────────────────────────────
export default function PageDepenses({ toast }) {
  const now0       = new Date();
  const curYear    = now0.getFullYear();
  const curMonth   = now0.getMonth();
  const years      = Array.from({length:5},(_,i)=>curYear-i);

  const [expenses,  setExpenses]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState({...EMPTY_FORM, date: now0.toISOString().split("T")[0]});
  const [selMonth,  setSelMonth]  = useState(curMonth);
  const [selYear,   setSelYear]   = useState(curYear);
  const [saving,    setSaving]    = useState(false);
  const [total,     setTotal]     = useState(0);

  // justificatif
  const [selectedFile,  setSelectedFile]  = useState(null);   // File object
  const [filePreview,   setFilePreview]   = useState(null);   // URL locale (blob) ou null
  const [uploading,     setUploading]     = useState(false);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiDone,        setAiDone]        = useState(false);
  const [receiptUrl,    setReceiptUrl]    = useState("");      // URL serveur enregistrée

  // visionneuse
  const [viewExpense, setViewExpense] = useState(null);

  const fileRef = useRef();
  const { isMobile } = useBreakpoint();

  const isCurrentMonth = selYear===curYear && selMonth===curMonth;
  const prevMonth = () => { if(selMonth===0){setSelMonth(11);setSelYear(y=>y-1);}else setSelMonth(m=>m-1); };
  const nextMonth = () => {
    if(isCurrentMonth) return;
    if(selMonth===11){setSelMonth(0);setSelYear(y=>y+1);}else setSelMonth(m=>m+1);
  };

  const load = useCallback(async (month, year) => {
    setLoading(true);
    try {
      const from = `${year}-${String(month+1).padStart(2,"0")}-01`;
      const ld   = new Date(year,month+1,0).getDate();
      const to   = `${year}-${String(month+1).padStart(2,"0")}-${String(ld).padStart(2,"0")}`;
      const res  = await GET(`/expenses?from=${from}&to=${to}&limit=200`);
      setExpenses(res.data);
      setTotal(res.data.reduce((s,e)=>s+parseFloat(e.amount),0));
    } catch(e) { toast(e.message); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(selMonth,selYear); },[selMonth,selYear]);

  // ── Ouverture du formulaire ──
  const openAdd = () => {
    setEditItem(null);
    setForm({...EMPTY_FORM, date: now0.toISOString().split("T")[0]});
    resetFile();
    setShowForm(true);
  };
  const openEdit = (e) => {
    setEditItem(e);
    setForm({ 
      label:e.label, 
      amount:e.amount, 
      category:e.category||"",
      date:(e.date||"").split("T")[0], 
      notes:e.notes||"" });
    resetFile();
    setReceiptUrl(e.receipt_url||"");
    setShowForm(true);
  };

  const resetFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setReceiptUrl("");
    setAiDone(false);
  };

  // ── Sélection d'un fichier ──
  const handleFileSelect = async (evt) => {
    const file = evt.target.files[0];
    if (!file) return;

    // Prévisualisation locale immédiate
    const isPdf = file.type === "application/pdf";
    setSelectedFile(file);
    setFilePreview(isPdf ? null : URL.createObjectURL(file));
    setAiDone(false);

    // Extraction IA du montant
    setAiLoading(true);
    try {
      const amount = await extractAmountWithAI(file);
      if (amount !== null) {
        setForm(f=>({...f, amount: String(amount)}));
        setAiDone(true);
        toast(`Montant extrait : ${fmt(amount)}`, "success");
      } else {
        toast("Montant non détecté — à saisir manuellement", "warn");
      }
    } catch {
      toast("Extraction automatique échouée — renseignez le montant manuellement", "warn");
    } finally { setAiLoading(false); }
  };

  // ── Sauvegarde ──
  const handleSave = async () => {
    if (!form.label || !form.amount) return toast("Description et montant requis");
    setSaving(true);
    try {
      let finalReceiptUrl = receiptUrl; // déjà uploadée (mode édition) ou vide

      // Upload du nouveau fichier si présent
      if (selectedFile) {
        setUploading(true);
        try {
          finalReceiptUrl = await uploadFile(selectedFile, form.date);
        } catch(e) {
          toast(`Erreur upload : ${e.message}`);
          setSaving(false); setUploading(false);
          return;
        }
        setUploading(false);
      }

      const payload = { ...form, receipt_url: finalReceiptUrl || undefined };

      if (editItem) {
        await PUT(`/expenses/${editItem.id}`, payload);
        toast("Mise à jour", "success");
      } else {
        await POST("/expenses", payload);
        toast("Dépense enregistrée", "success");
      }
      setShowForm(false);
      await load(selMonth, selYear);
    } catch(e) { toast(e.message); }
    finally { setSaving(false); setUploading(false); }
  };

  const handleDelete = async (e) => {
    if (!window.confirm(`Supprimer « ${e.label} » ?`)) return;
    try {
      await DELETE(`/expenses/${e.id}`);
      toast("Supprimée","success");
      await load(selMonth, selYear);
    } catch(err) { toast(err.message); }
  };

  const [exporting, setExporting] = useState(false);
  const isBusy = saving || uploading || aiLoading;


  const exportZip = async () => {
    if (!expenses.length) return toast("Aucune dépense à exporter");
    setExporting(true);
    try {
      const mm  = String(selMonth + 1).padStart(2, "0");
      const url = `${API_BASE}/export/depenses?year=${selYear}&month=${mm}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error("Erreur export");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href  = URL.createObjectURL(blob);
      link.download = `export_comptable_depenses_${selYear}_${mm}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch(e) { toast("Erreur lors de l'export : " + e.message); }
    finally { setExporting(false); }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div>
          <div style={c.pageTitle}>Dépenses</div>
          <div style={c.pageSub}>Total : <span style={{color:"#f87171",fontWeight:800}}>{fmt(total)}</span></div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={exportZip} disabled={exporting||loading||!expenses.length}
            style={{padding:"10px 16px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",
              background:"rgba(255,255,255,0.05)",color:"#94a3b8",fontSize:13,fontWeight:700,
              cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"inherit",
              opacity:(exporting||loading||!expenses.length)?0.45:1}}>
            {exporting?<Spinner size={14}/>:<span>⬇</span>}
            {exporting?"Export…":"Export ZIP"}
          </button>
          <button style={c.addBtn} onClick={openAdd}>+ Ajouter</button>
        </div>
      </div>

      {/* Sélecteur mois */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <div style={{display:"flex",gap:8}}>
          <select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))}
            style={{...c.input,padding:"8px 12px",fontSize:14,fontWeight:700,cursor:"pointer",minWidth:120}}>
            {MONTHS.map((m,i)=>(
              <option key={i} value={i} disabled={selYear===curYear&&i>curMonth}>{m}</option>
            ))}
          </select>
          <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))}
            style={{...c.input,padding:"8px 12px",fontSize:14,fontWeight:700,cursor:"pointer",minWidth:80}}>
            {years.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={nextMonth} disabled={isCurrentMonth}
          style={{...navBtn,opacity:isCurrentMonth?0.3:1,cursor:isCurrentMonth?"not-allowed":"pointer"}}>›</button>
        {!isCurrentMonth && (
          <button onClick={()=>{setSelMonth(curMonth);setSelYear(curYear);}} style={resetBtn}>Mois actuel</button>
        )}
        <div style={{marginLeft:"auto",fontSize:14,color:"#64748b"}}>
          {expenses.length} dépense{expenses.length!==1?"s":""}
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner size={36}/></div>
      ) : (
        <div style={c.table}>
          {!isMobile && (
            <div style={c.tableHead}>
              <span style={{flex:3}}>Description</span>
              <span style={{flex:1.5}}>Catégorie</span>
              <span style={{flex:1}}>Date</span>
              <span style={{flex:0.6,textAlign:"center"}}>Justif.</span>
              <span style={{flex:1,textAlign:"right"}}>Montant</span>
              <span style={{flex:0.6,textAlign:"right"}}>Actions</span>
            </div>
          )}
          {expenses.length===0 ? (
            <EmptyState text="Aucune dépense ce mois"/>
          ) : expenses.map(e=>(
            <div key={e.id} style={{...c.tableRow,
              flexDirection:isMobile?"column":"row",
              gap:isMobile?8:0, alignItems:isMobile?"flex-start":"center"}}>

              <span style={{flex:3,fontWeight:700,fontSize:15}}>
                {e.label}
                {e.notes && <span style={{fontWeight:400,color:"#64748b",fontSize:13}}> · {e.notes}</span>}
              </span>

              <span style={{flex:1.5}}>
                <span style={{...c.chip,
                  background:(CAT_COLORS[e.category]||"#888")+"22",
                  color:CAT_COLORS[e.category]||"#888"}}>
                  {e.category||"Autre"}
                </span>
              </span>

              <span style={{flex:1,color:"#94a3b8",fontSize:13}}>{fmtDate(e.date)}</span>

              {/* Bouton justificatif */}
              <span style={{flex:0.6,textAlign:"center"}}>
                {e.receipt_url ? (
                  <button
                    onClick={()=>setViewExpense(e)}
                    style={{ background:"rgba(240,201,135,0.1)",border:"1px solid rgba(240,201,135,0.3)",
                      borderRadius:8, color:"#f0c987", cursor:"pointer", fontSize:16,
                      padding:"4px 10px", fontFamily:"inherit" }}
                    title="Voir le justificatif">
                    🧾
                  </button>
                ) : (
                  <span style={{color:"#334155",fontSize:12}}>—</span>
                )}
              </span>

              <span style={{flex:1,textAlign:isMobile?"left":"right",
                fontWeight:800,color:"#f87171",fontSize:15}}>
                −{fmt(e.amount)}
              </span>

              <span style={{flex:0.6,display:"flex",gap:8,
                justifyContent:isMobile?"flex-start":"flex-end"}}>
                <button style={c.iconBtn} onClick={()=>openEdit(e)}>✎</button>
                <button style={{...c.iconBtn,color:"#f87171"}} onClick={()=>handleDelete(e)}>✕</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ══ Modal ajout / modification ══ */}
      {showForm && (
        <Modal
          title={editItem ? "Modifier la dépense" : "Nouvelle dépense"}
          onClose={()=>{ setShowForm(false); resetFile(); }}>

          {/* Zone justificatif */}
          <div style={{marginBottom:18}}>
            <label style={{...c.label,display:"block",marginBottom:8}}>
              Justificatif (photo ou PDF)
            </label>

            {/* Fichier déjà enregistré en base (mode édition) */}
            {!selectedFile && receiptUrl ? (
              <div style={{position:"relative",display:"inline-block"}}>
                <FilePreview src={receiptUrl} label={receiptUrl.split("/").pop()}
                  onRemove={()=>setReceiptUrl("")}/>
                <div style={{marginTop:8,fontSize:12,color:"#64748b",textAlign:"center"}}>
                  Fichier existant · <button
                    style={{background:"none",border:"none",color:"#f0c987",
                      cursor:"pointer",fontSize:12,fontWeight:700}}
                    onClick={()=>fileRef.current?.click()}>
                    Remplacer
                  </button>
                </div>
              </div>
            ) : selectedFile ? (
              /* Nouveau fichier sélectionné */
              <div style={{position:"relative"}}>
                {selectedFile.type==="application/pdf" ? (
                  <div style={{padding:"16px",borderRadius:10,
                    background:"rgba(255,255,255,0.04)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:28}}>📄</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selectedFile.name}</div>
                      <div style={{fontSize:12,color:"#64748b",marginTop:2}}>
                        {(selectedFile.size/1024).toFixed(0)} Ko
                      </div>
                    </div>
                  </div>
                ) : (
                  <img src={filePreview} alt="aperçu"
                    style={{maxHeight:180,maxWidth:"100%",borderRadius:9,objectFit:"contain",display:"block"}}/>
                )}

                {/* Overlay IA en cours */}
                {aiLoading && (
                  <div style={{position:"absolute",inset:0,background:"rgba(10,13,20,0.88)",
                    borderRadius:9,display:"flex",flexDirection:"column",
                    alignItems:"center",justifyContent:"center",gap:12}}>
                    <Spinner size={32}/>
                    <div style={{color:"#f0c987",fontWeight:700,fontSize:14}}>Extraction du montant…</div>
                  </div>
                )}

                <button onClick={()=>resetFile()}
                  style={{position:"absolute",top:-10,right:-10,width:26,height:26,
                    borderRadius:"50%",background:"#f87171",border:"none",
                    color:"#fff",fontSize:13,cursor:"pointer",fontWeight:700}}>✕</button>

                {aiDone && !aiLoading && (
                  <div style={{marginTop:8,fontSize:13,color:"#10b981",fontWeight:600,textAlign:"center"}}>
                    ✓ Montant extrait par l'IA — vérifiez avant d'enregistrer
                  </div>
                )}
              </div>
            ) : (
              /* Zone de dépôt vide */
              <div
                style={{border:"2px dashed rgba(255,255,255,0.1)",borderRadius:12,
                  padding:"24px",cursor:"pointer",textAlign:"center",
                  transition:"border-color 0.15s"}}
                onClick={()=>fileRef.current?.click()}
                onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="rgba(240,201,135,0.4)";}}
                onDragLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}
                onDrop={e=>{
                  e.preventDefault();
                  e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";
                  const file=e.dataTransfer.files[0];
                  if(file) handleFileSelect({target:{files:[file]}});
                }}>
                <div style={{fontSize:32,marginBottom:8}}>📎</div>
                <div style={{fontWeight:600,fontSize:14,color:"#94a3b8",marginBottom:4}}>
                  Cliquez ou glissez un fichier ici
                </div>
                <div style={{fontSize:12,color:"#475569"}}>
                  JPEG, PNG, WEBP, HEIC ou PDF · max 15 Mo<br/>
                  <span style={{color:"#818cf8",fontWeight:600}}>
                    ✦ Le montant sera extrait automatiquement
                  </span>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              style={{display:"none"}} onChange={handleFileSelect}/>
          </div>

          {/* Champs du formulaire */}
          <div style={c.formGrid}>
            <div style={{...c.formGroup,gridColumn:"1/-1"}}>
              <label style={c.label}>Description *</label>
              <input style={c.input} value={form.label}
                onChange={e=>setForm(f=>({...f,label:e.target.value}))}
                placeholder="Achat fournitures…"/>
            </div>

            <div style={c.formGroup}>
              <label style={c.label}>
                Montant (€) *
                {aiLoading && <span style={{color:"#818cf8",marginLeft:6,fontSize:11}}>IA en cours…</span>}
                {aiDone    && <span style={{color:"#10b981",marginLeft:6,fontSize:11}}>✓ extrait</span>}
              </label>
              <input style={{...c.input, borderColor:aiDone?"rgba(16,185,129,0.4)":undefined}}
                type="number" step="0.01" value={form.amount}
                onChange={e=>setForm(f=>({...f,amount:e.target.value}))}
                placeholder="0,00"/>
            </div>

            <div style={c.formGroup}>
              <label style={c.label}>Catégorie</label>
              <select style={c.input} value={form.category}
                onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                <option value="">Sélectionner…</option>
                {CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div style={c.formGroup}>
              <label style={c.label}>Date</label>
              <input style={c.input} type="date" value={form.date}
                onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
            </div>

            <div style={c.formGroup}>
              <label style={c.label}>Notes</label>
              <input style={c.input} value={form.notes}
                onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                placeholder="Remarques…"/>
            </div>
          </div>

          {/* Statut upload */}
          {uploading && (
            <div style={{display:"flex",alignItems:"center",gap:10,
              padding:"10px 14px",borderRadius:9,
              background:"rgba(129,140,248,0.08)",
              border:"1px solid rgba(129,140,248,0.2)",marginTop:14}}>
              <Spinner size={18} color="#818cf8"/>
              <span style={{fontSize:13,color:"#818cf8",fontWeight:600}}>
                Envoi du fichier en cours…
              </span>
            </div>
          )}

          <ModalActions
            onCancel={()=>{ setShowForm(false); resetFile(); }}
            onSave={handleSave}
            saving={isBusy}/>
        </Modal>
      )}

      {/* ══ Visionneuse justificatif ══ */}
      {viewExpense && (
        <ReceiptViewer expense={viewExpense} onClose={()=>setViewExpense(null)}/>
      )}
    </div>
  );
}