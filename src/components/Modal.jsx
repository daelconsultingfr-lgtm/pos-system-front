
// ═══════════════════════════════════════════════════════════════════════════════
// MODAL & ACTIONS — composants partagés
// ═══════════════════════════════════════════════════════════════════════════════
function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)",padding:16}}>
      <div style={{background:"#0d1117",border:"1px solid rgba(255,255,255,0.1)",borderRadius:18,padding:"28px 30px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontSize:18,fontWeight:900,marginBottom:20,color:"#f8fafc"}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSave, saving }) {
  return (
    <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end"}}>
      <button style={{padding:"11px 18px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#94a3b8",fontSize:14,cursor:"pointer",fontWeight:600}} onClick={onCancel}>Annuler</button>
      <button style={{padding:"11px 22px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#f0c987,#e8a44e)",color:"#0a0d14",fontSize:14,cursor:"pointer",fontWeight:900,display:"flex",alignItems:"center",gap:8}} onClick={onSave} disabled={saving}>
        {saving && <Spinner size={16} color="#0a0d14"/>}{saving?"Enregistrement…":"Enregistrer"}
      </button>
    </div>
  );
}
