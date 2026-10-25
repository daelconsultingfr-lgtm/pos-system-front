export const navBtn = {
  width: 36, height: 36, borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#94a3b8", fontSize: 20, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "inherit",
};

export const resetBtn = {
  padding: "7px 14px", borderRadius: 9,
  border: "1px solid rgba(240,201,135,0.25)",
  background: "rgba(240,201,135,0.08)",
  color: "#f0c987", fontSize: 13, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};

export const c = {
  page:        { flex: 1, padding: "clamp(14px,2vw,28px)", overflowY: "auto", maxHeight: "calc(100vh - 72px)" },
  pageHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "clamp(16px,2vw,24px)" },
  pageTitle:   { fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.01em" },
  pageSub:     { fontSize: "clamp(12px,1.2vw,15px)", color: "#64748b", marginTop: 4 },
  addBtn:      { padding: "clamp(9px,1vw,12px) clamp(16px,1.5vw,22px)", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f0c987,#e8a44e)", color: "#0a0d14", fontWeight: 900, fontSize: "clamp(13px,1.2vw,15px)", cursor: "pointer", flexShrink: 0 },
  search:      { padding: "clamp(9px,1vw,12px) clamp(12px,1.2vw,16px)", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontSize: "clamp(13px,1.2vw,15px)", outline: "none" },
  tab:         { padding: "clamp(6px,0.7vw,9px) clamp(11px,1vw,16px)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#64748b", fontSize: "clamp(12px,1.1vw,14px)", cursor: "pointer", fontWeight: 500 },
  tabActive:   { background: "rgba(240,201,135,0.12)", borderColor: "rgba(240,201,135,0.3)", color: "#f0c987", fontWeight: 700 },
  table:       { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, overflow: "hidden" },
  tableHead:   { display: "flex", padding: "clamp(9px,1vw,12px) clamp(14px,1.5vw,20px)", background: "rgba(255,255,255,0.03)", fontSize: "clamp(10px,0.9vw,12px)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  tableRow:    { display: "flex", alignItems: "center", padding: "clamp(11px,1.2vw,15px) clamp(14px,1.5vw,20px)", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "clamp(13px,1.2vw,15px)", color: "#cbd5e1" },
  chip:        { display: "inline-flex", alignItems: "center", padding: "4px 11px", borderRadius: 20, fontSize: "clamp(11px,1vw,13px)", fontWeight: 600 },
  avatar:      { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: "rgba(240,201,135,0.15)", color: "#f0c987", fontWeight: 900, fontSize: 13, marginRight: 10, flexShrink: 0 },
  loyaltyBadge:{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 10px", borderRadius: 20, background: "rgba(251,191,36,0.12)", color: "#fbbf24", fontSize: "clamp(11px,1vw,13px)", fontWeight: 700 },
  iconBtn:     { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "clamp(15px,1.3vw,18px)", padding: "3px 7px", borderRadius: 6, lineHeight: 1 },
  formGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(10px,1.2vw,16px)" },
  formGroup:   { display: "flex", flexDirection: "column", gap: 6 },
  label:       { fontSize: "clamp(10px,0.9vw,12px)", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" },
  input:       { padding: "clamp(10px,1vw,13px) clamp(12px,1.2vw,14px)", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontSize: "clamp(13px,1.2vw,15px)", outline: "none", boxSizing: "border-box" },
  saveBtn:     { padding: "clamp(10px,1vw,13px) clamp(18px,1.8vw,24px)", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#f0c987,#e8a44e)", color: "#0a0d14", fontSize: "clamp(13px,1.2vw,15px)", cursor: "pointer", fontWeight: 900 },
  cancelBtn:   { padding: "clamp(10px,1vw,13px) clamp(14px,1.5vw,18px)", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontSize: "clamp(13px,1.2vw,15px)", cursor: "pointer", fontWeight: 600 },
  cardTitle:   { fontSize: "clamp(10px,0.9vw,12px)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", marginBottom: "clamp(10px,1.2vw,15px)" },
};

export const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width:100%; height:100%; overflow:hidden; background:#0a0d14; }
  body { background: #0a0d14; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 5px; }
  .nav-item:hover  { background: rgba(255,255,255,0.05) !important; color: #e2e8f0 !important; }
  .menu-btn:hover  { background: rgba(255,255,255,0.09) !important; }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.3); }
  .success-card { animation: fadeUp 0.5s ease; }
  .success-icon { animation: pop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pop    { from { transform:scale(0.5); opacity:0; } to { transform:scale(1); opacity:1; } }
  .spinner { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .bar-item:hover .bar-tooltip { display: block !important; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input[type=number] { -moz-appearance: textfield; }
  input:focus, select:focus { border-color: rgba(240,201,135,0.45) !important; }
  select option { background: #0d1117; color: #e2e8f0; }
  .caisse-root { display:grid; grid-template-columns:170px 1fr 300px; grid-template-rows:1fr; grid-template-areas:"cats main recap"; height:calc(100vh - 72px); width:100%; overflow:hidden; }
  .caisse-cats { grid-area:cats; display:flex; flex-direction:column; gap:3px; padding:12px 8px; border-right:1px solid rgba(255,255,255,0.06); overflow-y:auto; background:rgba(255,255,255,0.01); }
  .caisse-cats-title { font-size:10px; letter-spacing:0.12em; color:#475569; text-transform:uppercase; padding:4px 10px 10px; font-weight:700; flex-shrink:0; }
  .caisse-cat-btn { display:flex; align-items:center; gap:8px; padding:10px 11px; border-radius:9px; border:1px solid transparent; background:transparent; color:#64748b; font-size:13px; font-weight:500; cursor:pointer; text-align:left; transition:all 0.15s; width:100%; position:relative; font-family:inherit; }
  .caisse-cat-btn:hover  { background:rgba(255,255,255,0.04); color:#e2e8f0; }
  .caisse-cat-btn.active { font-weight:700; }
  .caisse-cat-icon { font-size:14px; width:18px; text-align:center; flex-shrink:0; }
  .caisse-cat-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .caisse-cat-dot { position:absolute; right:10px; width:5px; height:5px; border-radius:50%; }
  .caisse-main { grid-area:main; display:flex; flex-direction:column; overflow:hidden; padding:14px 16px; }
  .caisse-main-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-shrink:0; }
  .caisse-main-title { font-size:15px; font-weight:700; color:#f8fafc; }
  .caisse-main-count { font-size:12px; color:#475569; }
  .caisse-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; overflow-y:auto; padding-right:4px; align-content:start; align-items:stretch; }
  .caisse-service-btn { position:relative; padding:14px 13px; border-radius:11px; border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.04); color:#cbd5e1; cursor:pointer; text-align:left; display:flex; flex-direction:column; gap:3px; transition:all 0.15s; font-family:inherit; min-height:90px; height:100%; }
  .caisse-service-btn:hover { border-color:rgba(240,201,135,0.3) !important; background:rgba(240,201,135,0.07) !important; transform:translateY(-1px); }
  .caisse-badge { position:absolute; top:6px; right:6px; width:20px; height:20px; border-radius:50%; font-size:11px; font-weight:900; display:flex; align-items:center; justify-content:center; }
  .caisse-sv-name  { font-size:13px; font-weight:700; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word; }
  .caisse-sv-dur   { font-size:12px; color:#64748b; }
  .caisse-sv-price { font-size:14px; font-weight:800; margin-top:auto; padding-top:3px; flex-shrink:0; }
  .caisse-recap { grid-area:recap; display:flex; flex-direction:column; border-left:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.015); overflow:hidden; }
  .caisse-recap-header { display:flex; justify-content:space-between; align-items:center; padding:14px 16px 12px; border-bottom:1px solid rgba(255,255,255,0.06); flex-shrink:0; }
  .caisse-recap-title { font-size:13px; font-weight:700; letter-spacing:0.05em; }
  .caisse-vider-btn  { font-size:12px; color:#f87171; background:none; border:none; cursor:pointer; padding:3px 8px; border-radius:6px; font-family:inherit; }
  .caisse-recap-items { flex:1; overflow-y:auto; padding:6px 14px; }
  .caisse-empty-cart  { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:120px; color:#334155; font-size:13px; text-align:center; gap:4px; }
  .caisse-cart-item   { display:flex; align-items:center; gap:6px; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
  .caisse-cart-info   { flex:1; min-width:0; }
  .caisse-cart-name   { font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .caisse-cart-sub    { font-size:11px; color:#64748b; margin-top:2px; }
  .caisse-cart-controls { display:flex; align-items:center; gap:3px; }
  .caisse-qty-btn { width:22px; height:22px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#cbd5e1; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:inherit; }
  .caisse-qty-btn:hover { background:rgba(255,255,255,0.08); }
  .caisse-qty-val { width:18px; text-align:center; font-size:12px; font-weight:700; }
  .caisse-cart-total  { font-size:12px; font-weight:800; color:#f0c987; min-width:50px; text-align:right; }
  .caisse-del-btn  { background:none; border:none; color:#475569; cursor:pointer; font-size:10px; padding:2px; }
  .caisse-recap-footer { padding:12px 14px 16px; border-top:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:8px; flex-shrink:0; }
  .caisse-total-row   { display:flex; justify-content:space-between; font-size:13px; }
  .caisse-divider     { height:1px; background:rgba(255,255,255,0.06); }
  .caisse-checkout-btn { padding:13px; border-radius:11px; border:none; background:linear-gradient(135deg,#f0c987,#e8a44e); color:#0a0d14; font-weight:900; font-size:15px; cursor:pointer; transition:all 0.2s; font-family:inherit; }
  .caisse-checkout-btn:hover:not(.disabled) { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 6px 24px rgba(240,201,135,0.35); }
  .caisse-checkout-btn.disabled { background:rgba(255,255,255,0.06); color:#334155; cursor:not-allowed; }
  .encaisser-btn:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); }
  .checkout-btn:hover:not(:disabled)  { filter:brightness(1.08); transform:translateY(-1px); }
  @media (max-width:1023px) { .caisse-root { grid-template-columns:140px 1fr 260px; } .caisse-cat-btn { font-size:12px; padding:9px 9px; } .caisse-grid { grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:8px; } .caisse-sv-name { font-size:11px; } .caisse-sv-price { font-size:12px; } }
  @media (max-width:639px) { .caisse-root { grid-template-columns:1fr; grid-template-rows:auto 1fr auto; grid-template-areas:"cats" "main" "recap"; height:calc(100vh - 58px); } .caisse-cats { flex-direction:row; overflow-x:auto; overflow-y:hidden; padding:8px 12px; gap:6px; border-right:none; border-bottom:1px solid rgba(255,255,255,0.06); } .caisse-cats-title { display:none; } .caisse-cat-btn { flex-direction:row; flex-shrink:0; width:auto; padding:7px 13px; border-radius:20px; font-size:12px; white-space:nowrap; } .caisse-cat-dot { display:none; } .caisse-main { padding:10px 12px; } .caisse-grid { grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:7px; } .caisse-recap { border-left:none; border-top:1px solid rgba(255,255,255,0.06); max-height:42vh; } .caisse-recap-items { max-height:120px; } }
  @media (min-width:1440px) { .caisse-root { grid-template-columns:200px 1fr 340px; } .caisse-cat-btn { font-size:14px; padding:11px 13px; } .caisse-grid { grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; } .caisse-sv-name { font-size:13px; } .caisse-sv-price { font-size:15px; } .caisse-service-btn { padding:14px 13px; min-height:100px; } }
  @media (min-width:1920px) { .caisse-root { grid-template-columns:220px 1fr 380px; } .caisse-grid { grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; } .caisse-sv-name { font-size:14px; } .caisse-sv-price { font-size:16px; } .caisse-service-btn { padding:16px 14px; min-height:100px; } .caisse-cat-btn { font-size:15px; padding:12px 14px; } }
`;
