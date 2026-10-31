import { useState, useEffect } from "react";
import { GET, POST, getToken, setToken, clearToken } from "./utils/api";
import { NAV_ITEMS } from "./utils/format";
import { c, css } from "./utils/styles";
import useBreakpoint from "./hooks/useBreakpoint";
import Spinner from "./components/Spinner";
import { Toast } from "./components/UI";

import PageEncaissement      from "./pages/PageEncaissement";
import PagePrestations       from "./pages/PagePrestations";
import PageCategories        from "./pages/PageCategories";
import PageClients           from "./pages/PageClients";
import PageEmployes          from "./pages/PageEmployes";
import PageDepenses          from "./pages/PageDepenses";
import PageRecettes          from "./pages/PageRecettes";
import PageRapportJournalier from "./pages/PageRapportJournalier";
import PageRapport           from "./pages/PageRapport";

// ─── Thème par défaut & persistance ──────────────────────────────────────────
const DEFAULT_THEME = {
  bgApp:     "#0a0d14",   // fond principal
  bgNav:     "#0d1117",   // fond nav
  accent:    "#f0c987",   // couleur accent (or)
  textColor: "#e2e8f0",   // couleur texte principal
  fontSize:  15,          // taille police nav (px)
};

function loadTheme() {
  try {
    const saved = localStorage.getItem("app_theme");
    return saved ? { ...DEFAULT_THEME, ...JSON.parse(saved) } : DEFAULT_THEME;
  } catch { return DEFAULT_THEME; }
}
function saveTheme(t) {
  localStorage.setItem("app_theme", JSON.stringify(t));
}

// ─── Panneau paramètres thème ─────────────────────────────────────────────────
function ThemePanel({ theme, onChange, onClose }) {
  const [local, setLocal] = useState(theme);

  const set = (key, val) => {
    const next = { ...local, [key]: val };
    setLocal(next);
    onChange(next);          // aperçu en temps réel
  };

  const reset = () => { setLocal(DEFAULT_THEME); onChange(DEFAULT_THEME); };

  const PRESETS = [
    { label:"Nuit dorée",  bgApp:"#0a0d14", bgNav:"#0d1117", accent:"#f0c987", textColor:"#e2e8f0" },
    { label:"Minuit bleu", bgApp:"#07080f", bgNav:"#0b0d1a", accent:"#818cf8", textColor:"#e2e8f0" },
    { label:"Forêt",       bgApp:"#080f0d", bgNav:"#0a1510", accent:"#34d399", textColor:"#d1fae5" },
    { label:"Rose",        bgApp:"#120a10", bgNav:"#180e15", accent:"#f472b6", textColor:"#fce7f3" },
    { label:"Gris clair",  bgApp:"#f1f5f9", bgNav:"#e2e8f0", accent:"#6366f1", textColor:"#0f172a" },
  ];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      display:"flex", justifyContent:"flex-end",
    }}>
      {/* Overlay */}
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)"}}
        onClick={onClose}/>

      {/* Panneau */}
      <div style={{
        position:"relative", width:320, height:"100%",
        background:theme.bgNav, borderLeft:"1px solid rgba(255,255,255,0.08)",
        display:"flex", flexDirection:"column", overflowY:"auto",
        boxShadow:"-8px 0 32px rgba(0,0,0,0.5)",
        animation:"slideInRight 0.25s ease",
      }}>
        <style>{`@keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }`}</style>

        {/* En-tête */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"22px 20px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{fontSize:16,fontWeight:900,color:theme.textColor}}>⚙ Apparence</div>
          <button onClick={onClose}
            style={{background:"none",border:"none",color:"#64748b",
              cursor:"pointer",fontSize:20,lineHeight:1}}>✕</button>
        </div>

        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:22}}>

          {/* Présets */}
          <div>
            <div style={labelStyle(theme)}>Thèmes prédéfinis</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {PRESETS.map(p=>(
                <button key={p.label}
                  onClick={()=>{ const next={...local,...p}; setLocal(next); onChange(next); }}
                  style={{
                    display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                    borderRadius:10,border:`1px solid rgba(255,255,255,0.08)`,
                    background:"rgba(255,255,255,0.04)",cursor:"pointer",
                    fontFamily:"inherit",textAlign:"left",
                  }}>
                  {/* Aperçu couleurs */}
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    {[p.bgApp,p.bgNav,p.accent].map((col,i)=>(
                      <div key={i} style={{width:14,height:14,borderRadius:"50%",
                        background:col,border:"1px solid rgba(255,255,255,0.15)"}}/>
                    ))}
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:theme.textColor}}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{height:1,background:"rgba(255,255,255,0.06)"}}/>

          {/* Couleur de fond principal */}
          <div>
            <div style={labelStyle(theme)}>Fond principal</div>
            <ColorRow value={local.bgApp} onChange={v=>set("bgApp",v)} theme={theme}/>
          </div>

          {/* Couleur fond nav */}
          <div>
            <div style={labelStyle(theme)}>Fond navigation</div>
            <ColorRow value={local.bgNav} onChange={v=>set("bgNav",v)} theme={theme}/>
          </div>

          {/* Couleur accent */}
          <div>
            <div style={labelStyle(theme)}>Couleur accent</div>
            <ColorRow value={local.accent} onChange={v=>set("accent",v)} theme={theme}/>
          </div>

          {/* Couleur texte */}
          <div>
            <div style={labelStyle(theme)}>Couleur du texte</div>
            <ColorRow value={local.textColor} onChange={v=>set("textColor",v)} theme={theme}/>
          </div>

          {/* Taille police */}
          <div>
            <div style={{...labelStyle(theme),display:"flex",justifyContent:"space-between"}}>
              <span>Taille de police</span>
              <span style={{color:theme.accent,fontWeight:700}}>{local.fontSize}px</span>
            </div>
            <input type="range" min={12} max={18} step={1}
              value={local.fontSize}
              onChange={e=>set("fontSize",Number(e.target.value))}
              style={{width:"100%",accentColor:theme.accent,cursor:"pointer"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#475569",marginTop:4}}>
              <span>Aa petit</span><span>Aa grand</span>
            </div>
          </div>

          <div style={{height:1,background:"rgba(255,255,255,0.06)"}}/>

          {/* Actions */}
          <div style={{display:"flex",gap:10}}>
            <button onClick={reset}
              style={{flex:1,padding:"11px",borderRadius:9,
                border:"1px solid rgba(255,255,255,0.1)",
                background:"transparent",color:"#64748b",
                fontSize:13,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>
              Réinitialiser
            </button>
            <button onClick={()=>{ saveTheme(local); onClose(); }}
              style={{flex:1,padding:"11px",borderRadius:9,border:"none",
                background:`linear-gradient(135deg,${theme.accent},${theme.accent}bb)`,
                color:"#0a0d14",fontSize:13,cursor:"pointer",fontWeight:900,fontFamily:"inherit"}}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorRow({ value, onChange, theme }) {
  const QUICK = ["#0a0d14","#0d1117","#f0c987","#818cf8","#34d399","#f472b6","#e2e8f0","#1e293b"];
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:6}}>
      {QUICK.map(col=>(
        <button key={col} onClick={()=>onChange(col)}
          style={{width:24,height:24,borderRadius:"50%",background:col,border:"none",
            cursor:"pointer",
            outline:value===col?`3px solid ${theme.accent}`:"3px solid transparent",
            outlineOffset:2,transition:"outline 0.1s"}}/>
      ))}
      <input type="color" value={value} onChange={e=>onChange(e.target.value)}
        style={{width:28,height:28,borderRadius:"50%",border:"none",
          cursor:"pointer",padding:2,background:"transparent"}}
        title="Couleur personnalisée"/>
      <span style={{fontSize:12,color:"#475569",fontFamily:"monospace"}}>{value}</span>
    </div>
  );
}

function labelStyle(theme) {
  return { fontSize:11,fontWeight:700,letterSpacing:"0.08em",
    textTransform:"uppercase",color:"#64748b",marginBottom:8 };
}

// ─── Écran de connexion ───────────────────────────────────────────────────────
function LoginScreen({ onLogin, theme }) {
  const [email,    setEmail]    = useState("admin@salon.com");
  const [password, setPassword] = useState("admin123");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const { isMobile } = useBreakpoint();

  const handleLogin = async () => {
    setLoading(true); setError("");
    try {
      const res = await POST("/auth/login", { email, password });
      setToken(res.data.token);
      onLogin(res.data.user);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:theme.bgApp, display:"flex",
      alignItems:"center", justifyContent:"center", padding:16,
      color:theme.textColor, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ background:"rgba(255,255,255,0.04)",
        border:"1px solid rgba(255,255,255,0.09)",
        borderRadius:22, padding: isMobile ? "32px 22px" : "52px 48px",
        width:"100%", maxWidth:440 }}>
        <div style={{ fontSize:isMobile?26:30, fontWeight:900, letterSpacing:"0.18em",
          background:`linear-gradient(90deg,${theme.accent},${theme.accent}bb)`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:6 }}>
          L'Instant Beauté
        </div>
        <div style={{ fontSize:15, color:"#64748b", marginBottom:36 }}>
          L'Instant Beauté · Connexion
        </div>
        {error && (
          <div style={{ background:"rgba(248,113,113,0.15)",
            border:"1px solid rgba(248,113,113,0.3)",
            borderRadius:10, padding:"12px 16px", fontSize:14,
            color:"#f87171", marginBottom:20 }}>{error}</div>
        )}
        {[["Email",email,setEmail,"email"],["Mot de passe",password,setPassword,"password"]].map(([lbl,val,set,type]) => (
          <div key={lbl} style={{ marginBottom:16 }}>
            <label style={c.label}>{lbl}</label>
            <input style={c.input} type={type} value={val}
              onChange={e=>set(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          </div>
        ))}
        <button style={{ ...c.saveBtn, width:"100%", padding:"15px", fontSize:16, marginTop:10,
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          background:`linear-gradient(135deg,${theme.accent},${theme.accent}bb)` }}
          onClick={handleLogin} disabled={loading}>
          {loading && <Spinner size={20} color="#0a0d14" />}
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </div>
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,       setUser]       = useState(null);
  const [checked,    setChecked]    = useState(false);
  const [navOpen,    setNavOpen]    = useState(false);
  const [activePage, setActivePage] = useState("encaissement");
  const [now,        setNow]        = useState(new Date());
  const [toastMsg,   setToastMsg]   = useState(null);
  const [theme,      setTheme]      = useState(loadTheme);
  const [showTheme,  setShowTheme]  = useState(false);
  const { isMobile, isTablet, w }   = useBreakpoint();

  const toast = (msg, type="error") => setToastMsg({ msg, type });

  useEffect(()=>{
    (async()=>{
      const token = getToken();
      if (token) {
        try { const res = await GET("/auth/me"); setUser(res.data); }
        catch { clearToken(); }
      }
      setChecked(true);
    })();
  },[]);

  useEffect(()=>{
    const t = setInterval(()=>setNow(new Date()), 1000);
    return ()=>clearInterval(t);
  },[]);

  const navAlwaysOpen = w >= 1280;
  const isNavOpen     = navAlwaysOpen || navOpen;
  const navW          = isMobile ? 260 : isTablet ? 240 : 260;
  const headerH       = isMobile ? 58 : 72;

  const handleLogin  = (u) => setUser(u);
  const handleLogout = () => { clearToken(); setUser(null); setActivePage("encaissement"); };
  const navigate     = (id) => { setActivePage(id); if (!navAlwaysOpen) setNavOpen(false); };
  const currentNav   = NAV_ITEMS.find(n=>n.id===activePage);

  // Appliquer le thème au CSS global
  const themeCSS = `
    :root {
      --bg-app:    ${theme.bgApp};
      --bg-nav:    ${theme.bgNav};
      --accent:    ${theme.accent};
      --text:      ${theme.textColor};
      --font-size: ${theme.fontSize}px;
    }
  `;

  if (!checked) return (
    <div style={{minHeight:"100vh",background:theme.bgApp,display:"flex",
      alignItems:"center",justifyContent:"center"}}>
      <Spinner size={48}/>
    </div>
  );

  if (!user) return (
    <>
      <style>{css}</style>
      <style>{themeCSS}</style>
      <LoginScreen onLogin={handleLogin} theme={theme}/>
    </>
  );

  return (
    <div style={{minHeight:"100vh",background:theme.bgApp,color:theme.textColor,
      fontFamily:"'DM Sans','Segoe UI',sans-serif",fontSize:theme.fontSize,
      display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{css}</style>
      <style>{themeCSS}</style>

      {toastMsg && (
        <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={()=>setToastMsg(null)}/>
      )}

      {/* Panneau thème */}
      {showTheme && (
        <ThemePanel
          theme={theme}
          onChange={setTheme}
          onClose={()=>setShowTheme(false)}/>
      )}

      {/* Overlay mobile nav */}
      {!navAlwaysOpen && navOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
          zIndex:40,backdropFilter:"blur(4px)"}}
          onClick={()=>setNavOpen(false)}/>
      )}

      {/* ══════════════ NAVIGATION ══════════════ */}
      <nav style={{
        position:"fixed",top:0,left:0,bottom:0,width:navW,
        background:theme.bgNav,
        borderRight:"1px solid rgba(255,255,255,0.07)",
        zIndex:50,display:"flex",flexDirection:"column",padding:"0 10px",
        transition:navAlwaysOpen?"none":"transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        transform:isNavOpen?"translateX(0)":`translateX(-100%)`,
        boxShadow:navAlwaysOpen?"none":"8px 0 32px rgba(0,0,0,0.5)",
      }}>

        {/* ── Profil + déconnexion (EN HAUT) ── */}
        <div style={{padding:"16px 10px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {/* Avatar */}
            <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,
              background:theme.accent+"22",color:theme.accent,
              fontSize:14,fontWeight:900,display:"flex",
              alignItems:"center",justifyContent:"center",
              border:`1px solid ${theme.accent}44`}}>
              {(user.name||"?")[0]}
            </div>
            {/* Nom + rôle */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:theme.textColor,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {user.name}
              </div>
              <div style={{fontSize:11,color:"#64748b",textTransform:"capitalize"}}>
                {user.role}
              </div>
            </div>
            {/* ⚙ Thème */}
            <button
              onClick={()=>setShowTheme(true)}
              title="Apparence"
              style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:8,color:"#64748b",cursor:"pointer",
                fontSize:15,width:30,height:30,
                display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,transition:"color 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.color=theme.accent}
              onMouseLeave={e=>e.currentTarget.style.color="#64748b"}>
              ⚙
            </button>
            {/* Déconnexion */}
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:8,color:"#64748b",cursor:"pointer",
                fontSize:14,width:30,height:30,
                display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0}}>
              ↩
            </button>
          </div>
        </div>

        {/* ── Menu principal ── */}
        <div style={{flex:1,overflowY:"auto",padding:"10px 0"}}>
          {NAV_ITEMS.map(item=>(
            <button key={item.id} onClick={()=>navigate(item.id)} className="nav-item"
              style={{
                display:"flex",alignItems:"center",gap:13,
                padding:"11px 14px",borderRadius:10,border:"none",
                background:activePage===item.id?theme.accent+"18":"transparent",
                color:activePage===item.id?theme.accent:"#64748b",
                fontSize:theme.fontSize-1,
                fontWeight:activePage===item.id?700:500,
                cursor:"pointer",textAlign:"left",position:"relative",
                transition:"all 0.15s",width:"100%",marginBottom:2,
              }}>
              <span style={{fontSize:16,width:20,textAlign:"center",flexShrink:0}}>
                {item.icon}
              </span>
              <span style={{color: activePage===item.id ? theme.accent : theme.textColor,
                opacity: activePage===item.id ? 1 : 0.65}}>
                {item.label}
              </span>
              {activePage===item.id && (
                <span style={{position:"absolute",right:12,width:5,height:5,
                  borderRadius:"50%",background:theme.accent}}/>
              )}
            </button>
          ))}
        </div>

        {/* ── Copyright ── */}
        <div style={{
          textAlign: "center",
          padding: "12px 10px 0",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 11, color: "#1e293b", fontWeight: 600, letterSpacing: "0.04em" }}>
            © {new Date().getFullYear()} LIME SAS
          </div>
          <div style={{ fontSize: 10, color: "#1e293b", marginTop: 2, letterSpacing: "0.03em" }}>
            Tous droits réservés
          </div>
        </div>
      </nav>

      {/* ══════════════ HEADER ══════════════ */}
      <header style={{
        display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:isMobile?"10px 14px":"14px 24px",
        paddingLeft:navAlwaysOpen?`${navW+24}px`:isMobile?"14px":"24px",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        background:"rgba(255,255,255,0.02)",backdropFilter:"blur(10px)",
        flexShrink:0,zIndex:10,height:headerH,boxSizing:"border-box",
        transition:"padding-left 0.3s",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          {/* Hamburger mobile */}
          {!navAlwaysOpen && (
            <button
              style={{width:40,height:40,borderRadius:10,
                border:"1px solid rgba(255,255,255,0.1)",
                background:"rgba(255,255,255,0.04)",cursor:"pointer",
                display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",gap:5,flexShrink:0}}
              onClick={()=>setNavOpen(v=>!v)} className="menu-btn">
              <div style={{width:16,height:2,background:theme.textColor,borderRadius:2,
                transition:"all 0.25s",
                transform:navOpen?"rotate(45deg) translate(5px,5px)":"none"}}/>
              <div style={{width:16,height:2,background:theme.textColor,borderRadius:2,
                opacity:navOpen?0:1}}/>
              <div style={{width:16,height:2,background:theme.textColor,borderRadius:2,
                transition:"all 0.25s",
                transform:navOpen?"rotate(-45deg) translate(5px,-5px)":"none"}}/>
            </button>
          )}
          <div>
            <div style={{fontSize:isMobile?16:19,fontWeight:900,letterSpacing:"0.18em",
              background:`linear-gradient(90deg,${theme.accent},${theme.accent}bb)`,
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",display:"inline-block"}}>
              L'Instant Beauté
            </div>
            <div style={{fontSize:11,color:"#64748b",letterSpacing:"0.06em",marginTop:1}}>
              {currentNav?.icon} {currentNav?.label}
            </div>
          </div>
        </div>

        {/* Horloge */}
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:isMobile?18:22,fontWeight:700,
            letterSpacing:"0.05em",color:theme.textColor}}>
            {now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
          </div>
          {!isMobile && (
            <div style={{fontSize:11,color:"#64748b",textTransform:"capitalize"}}>
              {now.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
            </div>
          )}
        </div>
      </header>

      {/* ══════════════ CONTENU ══════════════ */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",
        marginLeft:navAlwaysOpen?navW:0,transition:"margin-left 0.3s"}}>
        {activePage==="encaissement"       && <PageEncaissement      toast={toast}/>}
        {activePage==="prestations"        && <PagePrestations       toast={toast}/>}
        {activePage==="categories"         && <PageCategories        toast={toast}/>}
        {activePage==="clients"            && <PageClients           toast={toast}/>}
        {activePage==="employes"           && <PageEmployes          toast={toast} currentUser={user}/>}
        {activePage==="depenses"           && <PageDepenses          toast={toast}/>}
        {activePage==="recettes"           && <PageRecettes          toast={toast}/>}
        {activePage==="rapport-journalier" && <PageRapportJournalier toast={toast}/>}
        {activePage==="rapport-mensuel"    && <PageRapport           type="mensuel" toast={toast}/>}
        {activePage==="rapport-annuel"     && <PageRapport           type="annuel"  toast={toast}/>}
      </div>
    </div>
  );
}