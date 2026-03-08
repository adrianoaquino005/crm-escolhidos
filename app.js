/* ============================================
   OS ESCOLHIDOS — CRM RANKING v5
   Login · Subtração · Comprovantes
   ============================================ */

const ADMIN_PASS = "admin123";
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const SORT_OPTIONS = [
  { key: "meetings", label: "Reuniões", icon: "📅" },
  { key: "proposals", label: "Propostas", icon: "📋" },
  { key: "revenue", label: "Faturamento", icon: "💰" },
];
const MEDAL = ["🥇", "🥈", "🥉"];

const initialBDRs = [];

const now = new Date();
let state = {
  bdrs: [], sortBy: "revenue", search: "",
  showAddModal: false, showUpdateModal: null, showLightbox: null,
  newBDR: { name: "", meetings: "", proposals: "", revenue: "", plan: "semanal", photo: null, photoPreview: null, password: "" },
  month: now.getMonth(), year: now.getFullYear(), week: getWeekOfMonth(now), showCalendar: false,
  loggedUser: null, isAdmin: false, loginSelect: "", loginPass: "", loginError: "", authMode: "login", // "login" ou "register"
  pendingProof: {}, // { field: base64 }
};

function getWeekOfMonth(d) { const day = d.getDate(); return day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4; }

// Persistence
function saveData() { try { localStorage.setItem("escolhidos_crm", JSON.stringify({ bdrs: state.bdrs, month: state.month, year: state.year, week: state.week })); } catch(e) {} }
function loadData() { try { const r = localStorage.getItem("escolhidos_crm"); if (r) { const d = JSON.parse(r); if (Array.isArray(d.bdrs)) { state.bdrs = d.bdrs; state.bdrs.forEach(b => { if (!b.proofs) b.proofs = []; if (!b.password) b.password = b.name.split(" ")[0].toLowerCase() + "123"; }); state.month = d.month ?? state.month; state.year = d.year ?? state.year; state.week = d.week ?? state.week; return true; } } } catch(e) {} return false; }
async function loadFromCloud() {
  try {
    const resp = await fetch('db.json?t=' + Date.now());
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.bdrs) && data.bdrs.length > 0) {
        state.bdrs = data.bdrs;
        state.bdrs.forEach(b => { if (!b.proofs) b.proofs = []; if (!b.password) b.password = b.name.split(" ")[0].toLowerCase() + "123"; });
        saveData();
        return true;
      }
    }
  } catch(e) { console.log('db.json não encontrado, iniciando vazio'); }
  return false;
}
function exportDB() {
  const data = { bdrs: state.bdrs.map(b => ({ id: b.id, name: b.name, avatar: b.avatar, photo: b.photo, password: b.password, meetings: b.meetings, proposals: b.proposals, revenue: b.revenue, plan: b.plan, joinWeek: b.joinWeek, joinMonth: b.joinMonth, joinYear: b.joinYear, proofs: [] })) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'db.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('db.json exportado! Substitua o arquivo no projeto e faça push no GitHub.', 'info');
}

// Helpers
function getVisibleBDRs() { return state.bdrs.filter(b => { if (b.plan === "mensal") return b.joinMonth === state.month && b.joinYear === state.year; return b.joinMonth === state.month && b.joinYear === state.year && b.joinWeek === state.week; }); }
function rerank(list, key) { const s = [...list].sort((a, b) => b[key] - a[key]); return s.map((b, i) => ({ ...b, rank: i + 1 })); }
function formatCurrency(v) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v); }
function formatNumber(v) { return new Intl.NumberFormat("pt-BR").format(v); }
function tierColor(r) { if (r===1) return "#D4A742"; if (r===2) return "#A8B4C4"; if (r===3) return "#CD7F32"; if (r<=5) return "#3b82f6"; if (r<=10) return "#60a5fa"; return "#64748b"; }
function tierGradient(r) { if (r===1) return "linear-gradient(135deg,#D4A742,#F0C75E)"; if (r===2) return "linear-gradient(135deg,#8899aa,#C0C0C0)"; if (r===3) return "linear-gradient(135deg,#CD7F32,#e8a860)"; if (r<=5) return "linear-gradient(135deg,#2563eb,#3b82f6)"; if (r<=10) return "linear-gradient(135deg,#3b6fd4,#60a5fa)"; return "linear-gradient(135deg,#475569,#64748b)"; }
function tierLabel(r) { if (r<=3) return "Elite"; if (r<=8) return "Top"; if (r<=12) return "Mid"; return "Dev"; }
function tierEmoji(r) { if (r<=3) return "⚔️"; if (r<=8) return "🔥"; if (r<=12) return "📈"; return "🌱"; }
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function getWeekLabel() { return `${MONTHS[state.month]} — Semana ${state.week}`; }
function getWeekShort() { return `${MONTHS[state.month].slice(0,3)} S${state.week}`; }

function showToast(msg, type="success") { document.querySelector(".toast")?.remove(); const t = document.createElement("div"); t.className = `toast toast-${type}`; const icons = {success:"✓",error:"✕",info:"ℹ",update:"⬆",subtract:"⬇"}; t.innerHTML = `<span class="toast-icon">${icons[type]||"✓"}</span><span>${msg}</span>`; document.body.appendChild(t); setTimeout(()=>t.remove(), 3500); }
function miniBar(v, mx, c) { const p = mx > 0 ? Math.round((v/mx)*100) : 0; return `<div class="mini-bar-bg"><div class="mini-bar-fill" style="width:${p}%;background:${c}"></div></div>`; }
function avatarHTML(b, sz, fs) { if (b.photo) return `<img src="${b.photo}" style="width:${sz}px;height:${sz}px;border-radius:50%;object-fit:cover;display:block;" />`; return `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${tierGradient(b.rank||1)};display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:900;color:#050510;">${esc(b.avatar)}</div>`; }
function canEdit(bdrId) { return state.isAdmin || state.loggedUser === bdrId; }

const LOGO_SVG = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1d4ed8"/><stop offset="50%" style="stop-color:#3b82f6"/><stop offset="100%" style="stop-color:#7cb8ff"/></linearGradient><linearGradient id="lg2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#1e3a6e"/><stop offset="100%" style="stop-color:#4a8cc7"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="2" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><polygon points="40,4 74,66 56,66 40,34 24,66 6,66" fill="url(#lg1)" filter="url(#glow)" opacity="0.5"/><polygon points="40,20 66,66 52,66 40,42 28,66 14,66" fill="url(#lg2)" opacity="0.8"/><polygon points="40,34 58,66 48,66 40,50 32,66 22,66" fill="url(#lg1)"/></svg>`;

// Export
function exportCSV() { const r = rerank(getVisibleBDRs(), state.sortBy); const h = ["Rank","Nome","Plano","Reuniões","Propostas(R$)","Faturamento(R$)"]; const rows = r.map(b=>[b.rank,b.name,b.plan,b.meetings,b.proposals,b.revenue]); const csv = [h.join(";"), ...rows.map(r=>r.join(";"))].join("\n"); const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}); const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=u; a.download=`ranking_${MONTHS[state.month]}_S${state.week}.csv`; a.click(); URL.revokeObjectURL(u); showToast("CSV exportado!"); }
function exportPDF() { const r = rerank(getVisibleBDRs(), state.sortBy); const w = window.open("","_blank"); w.document.write(`<!DOCTYPE html><html><head><title>Ranking</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');body{font-family:'Inter',sans-serif;padding:48px;margin:0}h1{font-size:30px;font-weight:900}h1 span{color:#2563eb}.sub{color:#64748b;font-size:13px;margin-bottom:28px}table{width:100%;border-collapse:collapse}th{background:#0f172a;color:#fff;padding:12px 16px;text-align:left;font-size:11px;text-transform:uppercase}td{padding:11px 16px;border-bottom:1px solid #e2e8f0;font-size:13px}tr:nth-child(even){background:#f8fafc}.r{font-weight:800}.gold{color:#D4A742}.ft{margin-top:32px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}</style></head><body><h1>⚔️ OS <span>ESCOLHIDOS</span></h1><div class="sub">${getWeekLabel()} · ${r.length} representantes</div><table><thead><tr><th>#</th><th>Nome</th><th>Reuniões</th><th>Propostas</th><th>Faturamento</th></tr></thead><tbody>${r.map(b=>`<tr><td class="r ${b.rank<=3?'gold':''}">${b.rank<=3?MEDAL[b.rank-1]:'#'+b.rank}</td><td><strong>${esc(b.name)}</strong></td><td>${b.meetings}</td><td>${formatCurrency(b.proposals)}</td><td>${formatCurrency(b.revenue)}</td></tr>`).join("")}</tbody></table><div class="ft">Gerado em ${new Date().toLocaleString("pt-BR")}</div><script>setTimeout(()=>window.print(),500)<\/script></body></html>`); w.document.close(); showToast("PDF gerado"); }

// ========== LOGIN SCREEN ==========
function renderLogin() {
  const allBdrs = state.bdrs;
  return `
  <div class="bg-grid"></div><div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div>
  <div class="login-screen">
    <div class="login-card">
      <div class="login-logo">${LOGO_SVG}</div>
      <div class="login-tag">⚔ PROGRAMA DE ALTA PERFORMANCE</div>
      <h1 class="login-title">OS <span class="accent">ESCOLHIDOS</span></h1>
      <p class="login-sub">Faça login para acessar o ranking</p>
      ${state.loginError ? `<div class="login-error">${state.loginError}</div>` : ''}
      <div class="login-field">
        <label class="login-label">Quem é você?</label>
        <select class="login-select" id="login-select">
          <option value="">Selecione...</option>
          <option value="admin" ${state.loginSelect==='admin'?'selected':''}>🛡️ Administrador</option>
          ${allBdrs.map(b => `<option value="${b.id}" ${state.loginSelect==String(b.id)?'selected':''}>${esc(b.name)}</option>`).join("")}
        </select>
      </div>
      <div class="login-field">
        <label class="login-label">Senha</label>
        <input class="login-input" type="password" id="login-pass" placeholder="Digite sua senha" value="${esc(state.loginPass)}" />
      </div>
      <button class="btn btn-primary btn-lg login-btn" id="btn-login">ENTRAR</button>
      <div class="auth-switch">
        Não tem uma conta? <button class="btn-link" id="link-to-register">Criar conta agora</button>
      </div>
    </div>
  </div>`;
}

function renderRegister() {
  return `
  <div class="bg-grid"></div><div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div>
  <div class="login-screen">
    <div class="login-card">
      <div class="login-logo">${LOGO_SVG}</div>
      <div class="login-tag">⚔ PROGRAMA DE ALTA PERFORMANCE</div>
      <h1 class="login-title">CRIAR <span class="accent">CONTA</span></h1>
      <p class="login-sub">Junte-se aos Escolhidos</p>
      ${state.loginError ? `<div class="login-error">${state.loginError}</div>` : ''}
      <div class="login-field">
        <label class="login-label">Nome Completo</label>
        <input class="login-input" type="text" id="reg-name" placeholder="Ex: Adriano Aquino" />
      </div>
      <div class="login-field">
        <label class="login-label">Senha de Acesso</label>
        <input class="login-input" type="password" id="reg-pass" placeholder="Crie uma senha" />
      </div>
      <div class="login-field">
        <label class="login-label">Confirme a Senha</label>
        <input class="login-input" type="password" id="reg-pass-confirm" placeholder="Repita a senha" />
      </div>
      <button class="btn btn-primary btn-lg login-btn" id="btn-do-register">CADASTRAR</button>
      <div class="auth-switch">
        Já possui uma conta? <button class="btn-link" id="link-to-login">Voltar ao login</button>
      </div>
    </div>
  </div>`;
}

// ========== UPDATE MODAL ==========
function updateModalHTML(bdr) {
  const fields = [
    { key:"meetings", label:"Reuniões Agendadas", icon:"📅", color:"#3b82f6", current:bdr.meetings, isCur:false, qAdd:[1,3,5], qSub:[1,3] },
    { key:"proposals", label:"Propostas Abertas", icon:"📋", color:"#8b5cf6", current:bdr.proposals, isCur:true, qAdd:[5000,10000,25000], qSub:[5000,10000] },
    { key:"revenue", label:"Faturamento", icon:"💰", color:"#34d399", current:bdr.revenue, isCur:true, qAdd:[5000,10000,25000], qSub:[5000,10000] },
  ];
  const proofs = (bdr.proofs || []).slice(-6).reverse();
  return `
  <div class="modal-overlay" id="update-overlay">
    <div class="modal update-modal">
      <div class="modal-header">
        <div class="update-modal-title">
          <div class="update-avatar-wrap">${avatarHTML(bdr,48,16)}</div>
          <div><h2>${esc(bdr.name.split(" ")[0])}</h2><div class="update-rank">${bdr.rank<=3?MEDAL[bdr.rank-1]+' ':'#'+bdr.rank+' · '}${tierLabel(bdr.rank)} · ${bdr.plan==='mensal'?'📆 Mensal':'📅 Semanal'}</div></div>
        </div>
        <button class="modal-close" data-close-update><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="update-cards">
        ${fields.map(f => `
          <div class="update-card">
            <div class="update-card-top"><span class="update-card-icon">${f.icon}</span><span class="update-card-label">${f.label}</span></div>
            <div class="update-card-current" style="color:${f.color}">${f.isCur ? formatCurrency(f.current) : formatNumber(f.current)}</div>
            <div class="update-card-input-row">
              ${f.qSub.map(v=>`<button class="update-sub-btn" data-sub-field="${f.key}" data-sub-val="${v}">-${f.isCur?(v>=1000?(v/1000)+'k':v):v}</button>`).join("")}
              <span class="update-divider">|</span>
              ${f.qAdd.map(v=>`<button class="update-quick-btn" data-quick-add="${f.key}" data-quick-val="${v}">+${f.isCur?(v>=1000?(v/1000)+'k':v):v}</button>`).join("")}
              <div class="update-custom-wrap">
                <input class="update-custom-input" type="number" data-custom-field="${f.key}" placeholder="±" min="0" />
                <button class="update-custom-go" data-custom-add="${f.key}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg></button>
              </div>
            </div>
            <div class="proof-upload-row">
              <label class="proof-upload-label" for="proof-${f.key}">📎 Anexar comprovante</label>
              <input type="file" id="proof-${f.key}" accept="image/*" data-proof-field="${f.key}" style="display:none" />
              ${state.pendingProof[f.key] ? `<div class="proof-pending"><img src="${state.pendingProof[f.key]}" /><span>✓ Pronto</span></div>` : ''}
            </div>
          </div>
        `).join("")}
      </div>
      ${proofs.length > 0 ? `
        <div class="proofs-section">
          <div class="proofs-title">📎 Comprovantes recentes</div>
          <div class="proofs-grid">
            ${proofs.map((p,i) => `
              <div class="proof-thumb" data-lightbox="${i}">
                <img src="${p.image}" />
                <div class="proof-meta">${p.field==='meetings'?'📅':p.field==='proposals'?'📋':'💰'} ${p.field==='meetings'?'+'+p.amount:formatCurrency(p.amount)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
      <button class="btn btn-ghost btn-full" data-close-update style="margin-top:14px">Fechar</button>
    </div>
  </div>`;
}

// ========== CALENDAR ==========
function calendarHTML() {
  return `<div class="calendar-dropdown">
    <div class="cal-header">
      <button class="cal-nav" data-cal-prev><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
      <div class="cal-month">${MONTHS[state.month]} ${state.year}</div>
      <button class="cal-nav" data-cal-next><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>
    <div class="cal-weeks">${[1,2,3,4].map(w => {
      const c = state.bdrs.filter(b => { if (b.plan==='mensal') return b.joinMonth===state.month&&b.joinYear===state.year; return b.joinMonth===state.month&&b.joinYear===state.year&&b.joinWeek===w; }).length;
      return `<button class="cal-week ${state.week===w?'active':''}" data-cal-week="${w}"><span class="cal-week-num">S${w}</span><span class="cal-week-label">Semana ${w}</span><span class="cal-week-count">${c} BDRs</span></button>`;
    }).join("")}</div>
  </div>`;
}

// ========== MAIN RENDER ==========
function render() {
  const app = document.getElementById("app");
  if (!state.loggedUser && !state.isAdmin) {
    if (state.authMode === "register") {
      app.innerHTML = renderRegister();
      bindRegisterEvents();
    } else {
      app.innerHTML = renderLogin();
      bindLoginEvents();
    }
    return;
  }

  const visible = getVisibleBDRs();
  const ranked = rerank(visible, state.sortBy);
  const filtered = ranked.filter(b => b.name.toLowerCase().includes(state.search.toLowerCase()));
  const top3 = ranked.slice(0, 3);
  const tM = visible.reduce((s,b)=>s+b.meetings,0), tP = visible.reduce((s,b)=>s+b.proposals,0), tR = visible.reduce((s,b)=>s+b.revenue,0);
  const mxM = Math.max(...visible.map(b=>b.meetings),1), mxP = Math.max(...visible.map(b=>b.proposals),1), mxR = Math.max(...visible.map(b=>b.revenue),1);
  const sL = SORT_OPTIONS.find(o=>o.key===state.sortBy)?.label||"";
  const loggedName = state.isAdmin ? "Administrador" : state.bdrs.find(b=>b.id===state.loggedUser)?.name?.split(" ")[0] || "";

  app.innerHTML = `
  <div class="bg-grid"></div><div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div><div class="bg-orb bg-orb-3"></div>
  <div class="app-wrapper">
    <header class="header">
      <div class="header-left">
        <div class="logo-icon">${LOGO_SVG}</div>
        <div>
          <div class="header-tag">⚔ PROGRAMA DE ALTA PERFORMANCE</div>
          <h1 class="title-glow">OS <span class="accent">ESCOLHIDOS</span></h1>
          <div class="header-meta">${visible.length} escolhidos · ${getWeekShort()}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="user-badge"><span class="user-badge-icon">${state.isAdmin?'🛡️':'👤'}</span>${esc(loggedName)}<button class="btn-logout" id="btn-logout">Sair</button></div>
        <div class="week-selector-wrap">
          <button class="week-selector-btn" id="btn-week-toggle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><span>${getWeekLabel()}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${state.showCalendar?'cal-chevron-open':''}"><path d="M6 9l6 6 6-6"/></svg></button>
          ${state.showCalendar ? calendarHTML() : ''}
        </div>
        <button class="btn btn-export" id="btn-csv"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>CSV</button>
        <button class="btn btn-export" id="btn-pdf"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>PDF</button>
        ${state.isAdmin ? `<button class="btn btn-export" id="btn-export-db"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>DB</button>` : ''}
        ${state.isAdmin ? `<button class="btn btn-primary" id="btn-add-escolhido"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>NOVO ESCOLHIDO</button>` : ''}
      </div>
    </header>
    <div class="kpi-strip">
      <div class="kpi-card kpi-c1" data-kpi-sort="meetings"><div class="kpi-icon-wrap kpi-icon-blue"><span>📅</span></div><div class="kpi-body"><div class="kpi-label">Reuniões Agendadas</div><div class="kpi-value">${formatNumber(tM)}</div></div></div>
      <div class="kpi-card kpi-c2" data-kpi-sort="proposals"><div class="kpi-icon-wrap kpi-icon-purple"><span>📋</span></div><div class="kpi-body"><div class="kpi-label">Propostas Abertas</div><div class="kpi-value">${formatCurrency(tP)}</div></div></div>
      <div class="kpi-card kpi-c3" data-kpi-sort="revenue"><div class="kpi-icon-wrap kpi-icon-green"><span>💰</span></div><div class="kpi-body"><div class="kpi-label">Faturamento Total</div><div class="kpi-value">${formatCurrency(tR)}</div></div></div>
    </div>
    ${top3.length >= 3 ? `<div class="podium-section"><div class="podium-label"><span class="podium-label-icon">👑</span>TOP 3 — ${sL.toUpperCase()} · ${getWeekShort()}</div><div class="podium-grid">${[1,0,2].map(i=>{const b=top3[i],p=i+1,tc=tierColor(p),v=state.sortBy==='meetings'?formatNumber(b[state.sortBy]):formatCurrency(b[state.sortBy]);return `<div class="podium-slot podium-${p}" ${canEdit(b.id)?`data-update-bdr="${b.id}"`:''}><div class="podium-card"><div class="podium-medal">${MEDAL[i]}</div><div class="podium-avatar-wrap">${avatarHTML({...b,rank:p},54,17)}</div><div class="podium-name">${esc(b.name)}</div><div class="podium-plan-tag ${b.plan}">${b.plan==='mensal'?'📆 Mensal':'📅 Sem.'}</div><div class="podium-metric" style="color:${tc}">${v}</div><div class="podium-sub">${sL}</div><div class="podium-extras"><span>📅 ${b.meetings}</span><span>📋 ${formatCurrency(b.proposals)}</span><span>💰 ${formatCurrency(b.revenue)}</span></div>${canEdit(b.id)?'<div class="podium-update-hint">Clique para atualizar</div>':''}</div><div class="podium-pedestal podium-pedestal-${p}"><span class="pedestal-num">${p}º</span></div></div>`;}).join("")}</div></div>` : ''}
    <div class="controls-bar">
      <div class="search-wrap"><svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input class="search-input" id="search" placeholder="Buscar por nome..." value="${esc(state.search)}" /></div>
      <div class="sort-group"><span class="sort-label">Ranking por:</span>${SORT_OPTIONS.map(o=>`<button class="sort-btn ${state.sortBy===o.key?'active':''}" data-sort="${o.key}"><span>${o.icon}</span>${o.label}</button>`).join("")}</div>
    </div>
    <div class="ranking-table">
      <div class="table-header"><span class="th-rank">#</span><span class="th-name">Escolhido</span><span class="th-plan">Plano</span><span class="th-metric">📅 Reuniões</span><span class="th-metric">📋 Propostas</span><span class="th-metric">💰 Faturamento</span><span class="th-actions">Ações</span></div>
      ${filtered.length===0?`<div class="empty-state"><div class="empty-icon">${visible.length===0?'⚔️':'🔍'}</div><div>${visible.length===0?'Nenhum escolhido nesta semana':'Nenhum resultado'}</div></div>`:filtered.map((b,i)=>{const tc=tierColor(b.rank);return `<div class="table-row ${b.rank<=3?'row-elite':''}" style="animation-delay:${i*0.03}s"><div class="cell-rank">${b.rank<=3?`<span class="rank-medal">${MEDAL[b.rank-1]}</span>`:`<span class="rank-num" style="color:${tc}">#${b.rank}</span>`}</div><div class="cell-bdr" ${canEdit(b.id)?`data-update-bdr="${b.id}"`:''}><div class="bdr-avatar-wrap">${avatarHTML(b,40,13)}</div><div class="bdr-info"><div class="bdr-name">${esc(b.name)}</div><div class="bdr-tier" style="background:${tc}18;color:${tc};border-color:${tc}33">${tierEmoji(b.rank)} ${tierLabel(b.rank)}</div></div></div><div class="cell-plan"><span class="plan-badge plan-${b.plan}">${b.plan==='mensal'?'📆 Mensal':'📅 Sem.'}</span></div><div class="cell-metric"><div class="metric-val">${b.meetings}</div>${miniBar(b.meetings,mxM,"#3b82f6")}</div><div class="cell-metric"><div class="metric-val metric-proposals">${formatCurrency(b.proposals)}</div>${miniBar(b.proposals,mxP,"#8b5cf6")}</div><div class="cell-metric"><div class="metric-val metric-revenue">${formatCurrency(b.revenue)}</div>${miniBar(b.revenue,mxR,"#34d399")}</div><div class="cell-actions">${canEdit(b.id)?`<button class="act-update" data-update-bdr="${b.id}" title="Atualizar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>`:''}${state.isAdmin?`<button class="act-delete" data-delete="${b.id}" title="Remover"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>`:''}</div></div>`;}).join("")}
    </div>
  </div>
  ${state.showAddModal && state.isAdmin ? renderAddModal() : ''}
  ${state.showUpdateModal ? (()=>{ const v=getVisibleBDRs(); const r=rerank(v,state.sortBy); const b=r.find(x=>x.id===state.showUpdateModal); return b?updateModalHTML(b):''; })() : ''}
  ${state.showLightbox!==null ? renderLightbox() : ''}
  `;
  bindEvents();
}

function renderAddModal() {
  return `<div class="modal-overlay" id="add-overlay"><div class="modal add-modal"><div class="modal-header"><h2>⚔ Novo Escolhido</h2><button class="modal-close" data-close-add><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
  <div class="photo-upload-wrap"><div class="photo-preview" id="photo-preview">${state.newBDR.photoPreview?`<img src="${state.newBDR.photoPreview}" />`:`<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}</div><div class="photo-upload-info"><label class="btn btn-ghost btn-sm photo-upload-btn" for="photo-input"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Foto</label><input type="file" id="photo-input" accept="image/*" style="display:none" /><div class="photo-hint">Opcional</div></div></div>
  <div class="modal-field"><label class="modal-label"><span>👤</span> Nome</label><input class="modal-input" type="text" data-new-field="name" value="${esc(state.newBDR.name)}" placeholder="Ex: João Silva" /></div>
  <div class="modal-field"><label class="modal-label"><span>🔒</span> Senha de acesso</label><input class="modal-input" type="text" data-new-field="password" value="${esc(state.newBDR.password)}" placeholder="Ex: joao123" /></div>
  <div class="modal-field"><label class="modal-label"><span>📌</span> Plano</label><div class="plan-selector"><button class="plan-option ${state.newBDR.plan==='semanal'?'active':''}" data-plan="semanal"><span class="plan-option-icon">📅</span><div><div class="plan-option-title">Semanal</div><div class="plan-option-desc">Apenas esta semana</div></div></button><button class="plan-option ${state.newBDR.plan==='mensal'?'active':''}" data-plan="mensal"><span class="plan-option-icon">📆</span><div><div class="plan-option-title">Mensal</div><div class="plan-option-desc">O mês inteiro</div></div></button></div></div>
  ${[{k:"meetings",l:"Reuniões",i:"📅"},{k:"proposals",l:"Propostas (R$)",i:"📋"},{k:"revenue",l:"Faturamento (R$)",i:"💰"}].map(f=>`<div class="modal-field"><label class="modal-label"><span>${f.i}</span> ${f.l}</label><input class="modal-input" type="number" data-new-field="${f.k}" value="${esc(String(state.newBDR[f.k]))}" placeholder="0" min="0" /></div>`).join("")}
  <div class="modal-actions"><button class="btn btn-primary btn-lg" id="btn-confirm-add"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>CADASTRAR</button></div></div></div>`;
}

function renderLightbox() {
  const bdr = state.bdrs.find(b=>b.id===state.showUpdateModal);
  if (!bdr || !bdr.proofs) return '';
  const proofs = bdr.proofs.slice(-6).reverse();
  const p = proofs[state.showLightbox];
  if (!p) return '';
  const lbl = {meetings:"Reunião",proposals:"Proposta",revenue:"Faturamento"};
  return `<div class="lightbox-overlay" id="lightbox-overlay"><div class="lightbox-card"><button class="lightbox-close" id="lb-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button><img src="${p.image}" class="lightbox-img" /><div class="lightbox-info"><span>${p.field==='meetings'?'📅':p.field==='proposals'?'📋':'💰'} ${lbl[p.field]||p.field}: ${p.field==='meetings'?(p.amount>0?'+':'')+p.amount:formatCurrency(p.amount)}</span><span>${p.date}</span></div></div></div>`;
}

// ========== EVENTS ==========
function bindLoginEvents() {
  document.getElementById("login-select")?.addEventListener("change", e => { state.loginSelect = e.target.value; });
  document.getElementById("login-pass")?.addEventListener("input", e => { state.loginPass = e.target.value; });
  document.getElementById("login-pass")?.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  document.getElementById("btn-login")?.addEventListener("click", doLogin);
  document.getElementById("link-to-register")?.addEventListener("click", () => { state.authMode = "register"; state.loginError = ""; render(); });
}

function bindRegisterEvents() {
  document.getElementById("link-to-login")?.addEventListener("click", () => { state.authMode = "login"; state.loginError = ""; render(); });
  document.getElementById("btn-do-register")?.addEventListener("click", doRegister);
  document.querySelectorAll("#reg-name, #reg-pass, #reg-pass-confirm").forEach(inp => {
    inp.addEventListener("keydown", e => { if(e.key === "Enter") doRegister(); });
  });
}

function doRegister() {
  const name = document.getElementById("reg-name").value.trim();
  const pass = document.getElementById("reg-pass").value.trim();
  const passConf = document.getElementById("reg-pass-confirm").value.trim();

  if (!name || !pass) { state.loginError = "Preencha todos os campos"; render(); return; }
  if (pass !== passConf) { state.loginError = "As senhas não coincidem"; render(); return; }
  if (pass.length < 4) { state.loginError = "A senha deve ter pelo menos 4 caracteres"; render(); return; }
  
  const existing = state.bdrs.find(b => b.name.toLowerCase() === name.toLowerCase());
  if (existing) { state.loginError = "Este nome já está cadastrado"; render(); return; }

  const ini = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const entry = { 
    id: Date.now(), 
    name: name, 
    avatar: ini, 
    photo: null, 
    password: pass, 
    meetings: 0, 
    proposals: 0, 
    revenue: 0, 
    plan: "semanal", 
    joinWeek: state.week, 
    joinMonth: state.month, 
    joinYear: state.year, 
    proofs: [] 
  };

  state.bdrs = [...state.bdrs, entry];
  saveData();
  state.authMode = "login";
  state.loginSelect = String(entry.id);
  state.loginPass = "";
  state.loginError = "";
  render();
  showToast("Conta criada com sucesso! 🛡️");
}
function doLogin() {
  const sel = state.loginSelect, pass = state.loginPass;
  if (!sel) { state.loginError = "Selecione um usuário"; render(); return; }
  if (sel === "admin") {
    if (pass === ADMIN_PASS) { state.isAdmin = true; state.loggedUser = null; state.loginError = ""; render(); showToast("Bem-vindo, Admin! 🛡️"); }
    else { state.loginError = "Senha incorreta"; render(); }
  } else {
    const bdr = state.bdrs.find(b => b.id === parseInt(sel));
    if (!bdr) { state.loginError = "Usuário não encontrado"; render(); return; }
    if (pass === bdr.password) { state.loggedUser = bdr.id; state.isAdmin = false; state.loginError = ""; render(); showToast(`Bem-vindo, ${bdr.name.split(" ")[0]}! ⚔️`); }
    else { state.loginError = "Senha incorreta"; render(); }
  }
}

function bindEvents() {
  // Logout
  document.getElementById("btn-logout")?.addEventListener("click", () => { state.loggedUser = null; state.isAdmin = false; state.loginSelect = ""; state.loginPass = ""; state.loginError = ""; render(); });
  // Calendar
  document.getElementById("btn-week-toggle")?.addEventListener("click", e => { e.stopPropagation(); state.showCalendar = !state.showCalendar; render(); });
  document.addEventListener("click", e => { if (state.showCalendar && !e.target.closest(".week-selector-wrap")) { state.showCalendar = false; render(); } }, { once: true });
  document.querySelector("[data-cal-prev]")?.addEventListener("click", e => { e.stopPropagation(); state.month = state.month===0?11:state.month-1; if(state.month===11) state.year--; render(); });
  document.querySelector("[data-cal-next]")?.addEventListener("click", e => { e.stopPropagation(); state.month = state.month===11?0:state.month+1; if(state.month===0) state.year++; render(); });
  document.querySelectorAll("[data-cal-week]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); state.week=parseInt(b.dataset.calWeek); state.showCalendar=false; render(); showToast(`${MONTHS[state.month]} — Semana ${state.week}`,"info"); }));
  // KPI sort
  document.querySelectorAll("[data-kpi-sort]").forEach(e => e.addEventListener("click", () => { state.sortBy=e.dataset.kpiSort; render(); }));
  // Export
  document.getElementById("btn-csv")?.addEventListener("click", exportCSV);
  document.getElementById("btn-pdf")?.addEventListener("click", exportPDF);
  document.getElementById("btn-export-db")?.addEventListener("click", exportDB);
  // Add
  document.getElementById("btn-add-escolhido")?.addEventListener("click", () => { state.showAddModal=true; render(); setTimeout(()=>document.querySelector('[data-new-field="name"]')?.focus(),100); });
  // Search
  const si = document.getElementById("search");
  if (si) si.addEventListener("input", e => { const p=e.target.selectionStart; state.search=e.target.value; render(); const n=document.getElementById("search"); if(n){n.focus();n.setSelectionRange(p,p);} });
  // Sort
  document.querySelectorAll("[data-sort]").forEach(b => b.addEventListener("click", () => { state.sortBy=b.dataset.sort; render(); }));
  // Update modal open
  document.querySelectorAll("[data-update-bdr]").forEach(el => el.addEventListener("click", e => { if(e.target.closest("[data-delete]")) return; const id=parseInt(el.dataset.updateBdr); if(canEdit(id)){state.showUpdateModal=id; state.pendingProof={}; render();} }));
  // Quick add & sub
  document.querySelectorAll("[data-quick-add]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); addToBDR(state.showUpdateModal,b.dataset.quickAdd,parseInt(b.dataset.quickVal)); }));
  document.querySelectorAll("[data-sub-field]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); subtractFromBDR(state.showUpdateModal,b.dataset.subField,parseInt(b.dataset.subVal)); }));
  // Custom add
  document.querySelectorAll("[data-custom-add]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); const f=b.dataset.customAdd; const inp=document.querySelector(`[data-custom-field="${f}"]`); const v=parseFloat(inp?.value); if(v>0){addToBDR(state.showUpdateModal,f,v);inp.value="";} }));
  document.querySelectorAll("[data-custom-field]").forEach(inp => inp.addEventListener("keydown", e => { if(e.key==="Enter"){const v=parseFloat(inp.value); if(v>0) addToBDR(state.showUpdateModal,inp.dataset.customField,v); inp.value="";} }));
  // Proof upload
  document.querySelectorAll("[data-proof-field]").forEach(inp => inp.addEventListener("change", e => { const file=e.target.files[0]; if(file){const r=new FileReader();r.onload=ev=>{state.pendingProof[inp.dataset.proofField]=ev.target.result;render();};r.readAsDataURL(file);} }));
  // Lightbox
  document.querySelectorAll("[data-lightbox]").forEach(el => el.addEventListener("click", () => { state.showLightbox=parseInt(el.dataset.lightbox); render(); }));
  document.getElementById("lightbox-overlay")?.addEventListener("click", e => { if(e.target.id==="lightbox-overlay"){state.showLightbox=null;render();} });
  document.getElementById("lb-close")?.addEventListener("click", () => { state.showLightbox=null; render(); });
  // Close update
  document.querySelectorAll("[data-close-update]").forEach(b => b.addEventListener("click", () => { state.showUpdateModal=null; state.pendingProof={}; render(); }));
  document.getElementById("update-overlay")?.addEventListener("click", e => { if(e.target.id==="update-overlay"){state.showUpdateModal=null;state.pendingProof={};render();} });
  // Delete
  document.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); const id=parseInt(b.dataset.delete); const bdr=state.bdrs.find(x=>x.id===id); if(bdr&&confirm(`Remover ${bdr.name}?`)){state.bdrs=state.bdrs.filter(x=>x.id!==id);saveData();render();showToast(`${bdr.name} removido`);} }));
  // Add modal
  document.getElementById("photo-input")?.addEventListener("change", e => { const f=e.target.files[0]; if(f){const r=new FileReader();r.onload=ev=>{state.newBDR.photo=ev.target.result;state.newBDR.photoPreview=ev.target.result;render();};r.readAsDataURL(f);} });
  document.querySelectorAll("[data-plan]").forEach(b => b.addEventListener("click", () => { state.newBDR.plan=b.dataset.plan; render(); }));
  document.querySelectorAll("[data-new-field]").forEach(inp => { inp.addEventListener("input", e=>{state.newBDR[inp.dataset.newField]=e.target.value;}); inp.addEventListener("keydown", e=>{if(e.key==="Enter")addEscolhido();if(e.key==="Escape")closeAddModal();}); });
  document.getElementById("btn-confirm-add")?.addEventListener("click", addEscolhido);
  document.querySelectorAll("[data-close-add]").forEach(b => b.addEventListener("click", closeAddModal));
  document.getElementById("add-overlay")?.addEventListener("click", e => { if(e.target.id==="add-overlay") closeAddModal(); });
}

function addToBDR(id, field, amount) {
  const bdr = state.bdrs.find(b=>b.id===id); if(!bdr) return;
  const old = rerank(getVisibleBDRs(),state.sortBy).find(b=>b.id===id)?.rank;
  bdr[field] += amount;
  if(state.pendingProof[field]) { bdr.proofs.push({ field, amount, date: new Date().toLocaleDateString("pt-BR"), image: state.pendingProof[field] }); delete state.pendingProof[field]; }
  const nw = rerank(getVisibleBDRs(),state.sortBy).find(b=>b.id===id)?.rank;
  const fmt = field==="meetings"?`${amount} reuniões`:formatCurrency(amount);
  let pos = ""; if(old&&nw&&nw<old) pos=` · Subiu para ${nw}º! 🚀`;
  saveData(); render(); showToast(`${bdr.name.split(" ")[0]}: +${fmt}${pos}`,"update");
}

function subtractFromBDR(id, field, amount) {
  const bdr = state.bdrs.find(b=>b.id===id); if(!bdr) return;
  const old = bdr[field]; bdr[field] = Math.max(0, bdr[field] - amount);
  const actual = old - bdr[field];
  if(actual===0){showToast("Valor já está em 0","info");return;}
  saveData(); render();
  const fmt = field==="meetings"?`${actual} reuniões`:formatCurrency(actual);
  showToast(`${bdr.name.split(" ")[0]}: -${fmt} (corrigido)`,"subtract");
}

function closeAddModal() { state.showAddModal=false; state.newBDR={name:"",meetings:"",proposals:"",revenue:"",plan:"semanal",photo:null,photoPreview:null,password:""}; render(); }
function addEscolhido() {
  if(!state.newBDR.name.trim()){showToast("Preencha o nome!","error");return;}
  if(!state.newBDR.password.trim()){showToast("Defina uma senha!","error");return;}
  const ini=state.newBDR.name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const entry = { id:Date.now(), name:state.newBDR.name.trim(), avatar:ini, photo:state.newBDR.photo||null, password:state.newBDR.password.trim(), meetings:+state.newBDR.meetings||0, proposals:+state.newBDR.proposals||0, revenue:+state.newBDR.revenue||0, plan:state.newBDR.plan, joinWeek:state.week, joinMonth:state.month, joinYear:state.year, proofs:[] };
  state.bdrs=[...state.bdrs,entry]; closeAddModal(); saveData(); showToast(`${entry.name} cadastrado! ⚔️`);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!loadData()) {
    const cloudOk = await loadFromCloud();
    if (!cloudOk) { state.bdrs = [...initialBDRs]; saveData(); }
  }
  render();
});
