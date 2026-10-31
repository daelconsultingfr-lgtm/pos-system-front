import { useEffect } from "react";
import Spinner from "./Spinner";

export function Toast({ msg, type = "error", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  const bg =
    type === "error" ? "#f87171" : type === "success" ? "#10b981" : "#f0c987";
  return (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:300,
      background:bg, color:"#0a0d14", padding:"14px 22px", borderRadius:12,
      fontWeight:700, fontSize:15, boxShadow:"0 4px 24px rgba(0,0,0,0.5)", maxWidth:360 }}>
      {msg}
    </div>
  );
}

export function EmptyState({ icon = "◈", text = "Aucun résultat" }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 24px", color:"#334155" }}>
      <div style={{ fontSize:44, marginBottom:14, opacity:0.4 }}>{icon}</div>
      <div style={{ fontSize:16 }}>{text}</div>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(6px)", padding:16 }}
      onClick={onClose}>
      <div style={{ background:"#0d1117", border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:18, padding:"28px 30px", width:"100%", maxWidth:520,
        maxHeight:"90vh", overflowY:"auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:18, fontWeight:900, color:"#f8fafc" }}>{title}</div>
          {onClose && (
            <button onClick={onClose}
              style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:8, color:"#64748b", cursor:"pointer", fontSize:18,
                width:32, height:32, display:"flex", alignItems:"center",
                justifyContent:"center", flexShrink:0, lineHeight:1 }}>
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ onCancel, onSave, saving }) {
  return (
    <div style={{ display:"flex", gap:10, marginTop:22, justifyContent:"flex-end" }}>
      <button style={{ padding:"11px 18px", borderRadius:9, border:"1px solid rgba(255,255,255,0.1)",
        background:"transparent", color:"#94a3b8", fontSize:14, cursor:"pointer", fontWeight:600 }}
        onClick={onCancel}>
        Annuler
      </button>
      <button style={{ padding:"11px 22px", borderRadius:9, border:"none",
        background:"linear-gradient(135deg,#f0c987,#e8a44e)", color:"#0a0d14",
        fontSize:14, cursor:"pointer", fontWeight:900,
        display:"flex", alignItems:"center", gap:8 }}
        onClick={onSave} disabled={saving}>
        {saving && <Spinner size={16} color="#0a0d14" />}
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
