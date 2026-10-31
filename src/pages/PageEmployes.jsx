import { useState, useEffect, useCallback } from "react";
import { GET, POST, PUT } from "../utils/api";
import { c } from "../utils/styles";
import useBreakpoint from "../hooks/useBreakpoint";
import Spinner from "../components/Spinner";
import { Modal, ModalActions } from "../components/UI";

const ROLE_LABELS  = { admin:"Admin", manager:"Manager", cashier:"Employé(e)" };
const ROLE_COLORS  = { admin:"#f87171", manager:"#f59e0b", cashier:"#64748b" };
const PRESET_COLORS = ["#f0c987","#818cf8","#34d399","#f472b6","#38bdf8","#fb923c","#a78bfa","#4ade80"];

const EMPTY_FORM = { name:"", email:"", role:"cashier", color:"#f0c987", password:"" };

export default function PageEmployes({ toast, currentUser }) {
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);   // null = création
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const isAdmin = currentUser?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await GET("/employees"); setEmployees(res.data); }
    catch(e) { toast(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (emp) => {
    setEditItem(emp);
    setForm({
      name:     emp.name  || "",
      email:    emp.email || "",
      role:     emp.role  || "cashier",
      color:    emp.color || "#f0c987",
      password: "",   // vide = pas de changement
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return toast("Nom et email requis");
    if (!isAdmin) return toast("Seul l'admin peut gérer les employés");
    setSaving(true);
    try {
      if (editItem) {
        // Modification : n'envoie le mot de passe que s'il est renseigné
        const payload = { name: form.name, email: form.email, role: form.role, color: form.color };
        if (form.password.trim()) payload.password = form.password;
        await PUT(`/employees/${editItem.id}`, payload);
        toast("Employé mis à jour", "success");
      } else {
        await POST("/employees", form);
        toast("Employé ajouté", "success");
      }
      setShowForm(false);
      await load();
    } catch(e) { toast(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={c.page}>
      <div style={c.pageHeader}>
        <div>
          <div style={c.pageTitle}>Employés</div>
          <div style={c.pageSub}>{employees.length} membre{employees.length!==1?"s":""} de l'équipe</div>
        </div>
        {isAdmin && <button style={c.addBtn} onClick={openCreate}>+ Ajouter</button>}
      </div>

      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner size={36}/></div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
          {employees.map(emp => {
            const color = emp.color || "#888";
            const initials = (emp.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2);
            const isMe = emp.id === currentUser?.id;
            return (
              <div key={emp.id}
                style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${color}44`,
                  borderRadius:18,padding:"24px 22px",display:"flex",flexDirection:"column",
                  alignItems:"center",gap:10,position:"relative"}}>

                {/* Bouton modifier (admin only) */}
                {isAdmin && (
                  <button
                    onClick={()=>openEdit(emp)}
                    style={{position:"absolute",top:14,right:14,background:"rgba(255,255,255,0.05)",
                      border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,
                      color:"#64748b",cursor:"pointer",fontSize:14,
                      width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center"}}
                    title="Modifier">
                    ✎
                  </button>
                )}

                {/* Avatar */}
                <div style={{width:64,height:64,borderRadius:"50%",
                  border:`2px solid ${color}66`,background:color+"22",
                  color,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:22,fontWeight:900}}>
                  {initials}
                </div>

                <div style={{fontSize:17,fontWeight:700,color:"#f8fafc",textAlign:"center"}}>{emp.name}</div>

                {/* Rôle badge */}
                <span style={{fontSize:12,padding:"3px 11px",borderRadius:20,fontWeight:700,
                  background:(ROLE_COLORS[emp.role]||"#888")+"22",
                  color:ROLE_COLORS[emp.role]||"#888"}}>
                  {ROLE_LABELS[emp.role]||emp.role}
                </span>

                {emp.email && (
                  <div style={{fontSize:12,color:"#475569",textAlign:"center",wordBreak:"break-all"}}>
                    {emp.email}
                  </div>
                )}

                {isMe && (
                  <span style={{fontSize:12,background:"rgba(240,201,135,0.15)",
                    color:"#f0c987",padding:"3px 10px",borderRadius:20,fontWeight:700}}>
                    Vous
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création / modification */}
      {showForm && (
        <Modal
          title={editItem ? `Modifier — ${editItem.name}` : "Nouvel employé"}
          onClose={()=>setShowForm(false)}>

          <div style={c.formGrid}>
            {/* Nom */}
            <div style={{...c.formGroup,gridColumn:"1/-1"}}>
              <label style={c.label}>Nom complet *</label>
              <input style={c.input} value={form.name}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="Sophie Martin"/>
            </div>

            {/* Email */}
            <div style={{...c.formGroup,gridColumn:"1/-1"}}>
              <label style={c.label}>Email *</label>
              <input style={c.input} type="email" value={form.email}
                onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                placeholder="sophie@salon.com"/>
            </div>

            {/* Rôle */}
            <div style={c.formGroup}>
              <label style={c.label}>Rôle</label>
              <select style={c.input} value={form.role}
                onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="cashier">Employé(e)</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Mot de passe */}
            <div style={c.formGroup}>
              <label style={c.label}>
                {editItem ? "Nouveau mot de passe" : "Mot de passe initial"}
              </label>
              <input style={c.input} type="password" value={form.password}
                onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                placeholder={editItem ? "Laisser vide = inchangé" : "changeme123"}/>
            </div>

            {/* Couleur */}
            <div style={{...c.formGroup,gridColumn:"1/-1"}}>
              <label style={c.label}>Couleur</label>
              {/* Presets */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                {PRESET_COLORS.map(col=>(
                  <button key={col} onClick={()=>setForm(f=>({...f,color:col}))}
                    style={{width:32,height:32,borderRadius:"50%",background:col,border:"none",
                      cursor:"pointer",outline:form.color===col?`3px solid ${col}`:"3px solid transparent",
                      outlineOffset:2,transition:"outline 0.1s"}}/>
                ))}
                {/* Picker libre */}
                <input type="color" value={form.color}
                  onChange={e=>setForm(f=>({...f,color:e.target.value}))}
                  style={{width:32,height:32,borderRadius:"50%",border:"none",
                    cursor:"pointer",padding:2,background:"transparent"}}
                  title="Couleur personnalisée"/>
              </div>
              {/* Aperçu */}
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",
                borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{width:40,height:40,borderRadius:"50%",
                  border:`2px solid ${form.color}66`,background:form.color+"22",
                  color:form.color,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:15,fontWeight:900}}>
                  {(form.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)||"?"}
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#f8fafc"}}>{form.name||"Prévisualisation"}</div>
                  <div style={{fontSize:12,color:ROLE_COLORS[form.role]||"#888",marginTop:2,fontWeight:600}}>
                    {ROLE_LABELS[form.role]||form.role}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ModalActions
            onCancel={()=>setShowForm(false)}
            onSave={handleSave}
            saving={saving}/>
        </Modal>
      )}
    </div>
  );
}