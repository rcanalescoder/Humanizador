import React, { useEffect, useRef, useState } from 'react';
import PdfEdition from './PdfEdition.jsx';
import OllamaSetup from './OllamaSetup.jsx';
import { Projects } from './Projects.jsx';
import RuleTable from './RuleTable.jsx';
import EvidenceSources from './EvidenceSources.jsx';
import { referenceCatalogue } from '../core/reference-catalogue.mjs';

const icons = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  scan: <><path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m8 0h4a1 1 0 0 0 1-1v-4M7 8h10M7 12h7M7 16h10"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  rule: <><path d="M8 3v18M16 3v18M3 8h18M3 16h18"/></>,
  book: <><path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1zm0 0v15"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  settings: <><path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="currentColor"/><circle cx="16" cy="17" r="3" fill="currentColor"/></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/></>,
  arrow: <><path d="M5 12h14m-5-5 5 5-5 5"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/></>,
  download: <><path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
};
const Icon = ({ name, ...props }) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{icons[name] || icons.file}</svg>;
const stageNames = { ready: 'Listo para leer', paused: 'En pausa', queued: 'En cola', extracting: 'Extrayendo texto', analyzing: 'Revisando expresiones', completed: 'Análisis terminado', failed: 'No se pudo analizar', cancelled: 'Cancelado' };
const severityNames = { high: 'Alta', medium: 'Media', low: 'Baja' };
const familyNames = { lexico: 'Expresiones', sintaxis: 'Sintaxis', discurso: 'Argumento', presentacion: 'Presentación', contenido: 'Contenido', fidelidad: 'Fidelidad', dialogo: 'Diálogo', formato: 'Formato', claridad: 'Claridad', 'es-ES': 'Castellano de España' };
const isWorking = d => ['queued', 'extracting', 'analyzing'].includes(d?.status);
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'x-humanizador-request': '1', ...options.headers } });
  const body = await response.json();
  if (!response.ok) { const error = new Error(body.error || 'No se pudo completar la petición.'); error.status = response.status; throw error; }
  return body;
}
const post = data => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export default function App() {
  const [session, setSession] = useState(null), [documents, setDocuments] = useState([]), [selectedId, setSelectedId] = useState(null);
  const [document, setDocument] = useState(null), [section, setSection] = useState('projects'), [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [password, setPassword] = useState('');
  const [page, setPage] = useState(1);
  const [localModel, setLocalModel] = useState(null);
  const [genre, setGenre] = useState('Explicación técnica'), [uploadOpen, setUploadOpen] = useState(false);
  const [ruleSearch, setRuleSearch] = useState(''), [showResearch, setShowResearch] = useState(false), [mobileMenu, setMobileMenu] = useState(false);
  const [projects, setProjects] = useState([]);
  const [notice,setNotice] = useState('');
  const [sidebarCollapsed,setSidebarCollapsed]=useState(()=>localStorage.getItem('humanizador-sidebar')==='collapsed');
  const restored=useRef(false);
  const [projectId, setProjectId] = useState(() => window.localStorage.getItem('humanizador-project') || '00000000-0000-4000-8000-000000000001');
  const projectRef = useRef(projectId);
  const project = projects.find(p => p.id === projectId);
  const uploadMb = session?.limits?.upload_mb || 100;
  const documentListPath = () => `/documents?project_id=${encodeURIComponent(projectRef.current)}`;
  const input = useRef(null);
  const selectedRef = useRef(null), fetchingRef = useRef(false), mutationRef = useRef(false);
  useEffect(() => {
    if (!uploadOpen) return;
    const previous = window.document.activeElement;
    const modal = window.document.querySelector('.upload-modal');
    const focusable = () => [...modal.querySelectorAll('button,input,select')].filter(el => !el.disabled);
    focusable()[0]?.focus();
    const onKey = e => {
      if (e.key === 'Escape' && !busy) setUploadOpen(false);
      if (e.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items.at(-1);
      if (e.shiftKey && window.document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && window.document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    modal.addEventListener('keydown', onKey);
    return () => { modal.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [uploadOpen, busy]);
  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);
  const handleError = e => { setError(e.message); if (e.status === 401) setSession(s => s ? { ...s, authenticated: false } : s); };
  useEffect(() => { api('/session').then(setSession).catch(handleError); }, []);
  async function refresh(id = selectedRef.current) {
    if (fetchingRef.current || mutationRef.current) return;
    fetchingRef.current = true;
    try {
      const requestedProject = projectRef.current;
      const allProjects = await api('/projects');
      if (requestedProject !== projectRef.current || mutationRef.current) return;
      setProjects(allProjects);
      if (!allProjects.length) {
        if (requestedProject || selectedRef.current) switchProject('', 'projects');
        setDocuments([]);
        return;
      }
      if (!allProjects.some(p => p.id === requestedProject) && allProjects.length) { switchProject(allProjects[0].id); return; }
      const docs = await api(documentListPath());
      if (requestedProject !== projectRef.current) return;
      setDocuments(docs);
      if(!restored.current){restored.current=true;const last=localStorage.getItem('humanizador-document');if(docs.some(d=>d.id===last))openDocument(last);}
      if (id) {
        const detail = await api(`/documents/${id}`);
        if (selectedRef.current === id && !mutationRef.current) setDocument(previous => previous?.id === detail.id && (previous.revision > detail.revision || previous.revision === detail.revision
          && previous.status === detail.status && previous.progress === detail.progress && previous.total === detail.total && previous.diagnostics?.updated_at_ms === detail.diagnostics?.updated_at_ms && previous.diagnostics?.heartbeat_at_ms === detail.diagnostics?.heartbeat_at_ms) ? previous : detail);
      }
    } catch (e) { handleError(e); }
    finally { fetchingRef.current = false; }
  }
  useEffect(() => {
    if (!session?.authenticated) return;
    refresh(); api('/rules').then(referenceCatalogue).then(setCatalogue).catch(handleError); api('/local-model').then(setLocalModel).catch(handleError);
    const timer = setInterval(() => { if (!window.document.hidden) refresh(); }, 2000);
    const focus = () => refresh(); window.addEventListener('focus', focus);
    return () => { clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [session?.authenticated]);
  useEffect(() => {
    if (!selectedId || !session?.authenticated) return;
    let alive = true;
    api(`/documents/${selectedId}`).then(d => { if (alive) setDocument(d); }).catch(handleError);
    return () => { alive = false; };
  }, [selectedId, session?.authenticated]);
  useEffect(() => { if (session?.authenticated) refresh(); }, [projectId]);
  function switchProject(id, destination = 'documents') {
    const changed = projectRef.current !== id;
    projectRef.current = id; setProjectId(id); window.localStorage.setItem('humanizador-project', id);
    selectedRef.current = null; setSelectedId(null); setDocument(null); if (changed) setDocuments([]); setSection(destination); setError(''); setNotice('');
  }
  async function deleteProject(deletingId = projectRef.current) {
    await action(async () => {
      await api(`/projects/${deletingId}`, { method: 'DELETE' });
      const remaining = await api('/projects');
      setProjects(remaining);
      if (projectRef.current === deletingId) switchProject(remaining[0]?.id || '', 'projects');
      else setSection('projects');
    });
  }
  function openDocument(id, destination = 'edition') {
    localStorage.setItem('humanizador-document',id); selectedRef.current = id; setSelectedId(id); setDocument(null); setPage(Math.max(1,Number(localStorage.getItem(`humanizador-page-${id}`))||1)); setSection(destination); setError('');
  }
  async function action(fn) {
    setBusy(true); mutationRef.current = true; setError('');
    try { await fn(); } catch (e) { handleError(e); }
    finally { mutationRef.current = false; setBusy(false); }
  }
  async function upload(file) {
    if (!file) return;
    if (file.size > uploadMb * 1024 * 1024) { setError(`El límite configurado es ${uploadMb} MB por PDF.`); return; }
    await action(async () => {
      const uploaded = await api(`/documents?${new URLSearchParams({ name: file.name, genre, review_mode: 'rules', start_analysis:'false', project_id: projectRef.current })}`, { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: file });
      setUploadOpen(false); openDocument(uploaded.id); setNotice(uploaded.reused ? uploaded.message : '');
      setDocuments(await api(documentListPath())); setProjects(await api('/projects'));
    });
    if (input.current) input.current.value = '';
  }
  async function saveDecision(f, status, replacement, note) {
    await action(async () => {
      const next = await api(`/documents/${document.id}/decisions`, post({ finding_id: f.id, status, replacement, note, revision: document.revision }));
      setDocument(next); setDocuments(await api(documentListPath())); setProjects(await api('/projects'));
    });
  }
  async function download(format) {
    await action(async () => {
      const response = await fetch(`/api/documents/${document.id}/export?format=${format}`);
      if (!response.ok) { const body = await response.json(); throw new Error(body.error); }
      const url = URL.createObjectURL(await response.blob());
      const a = window.document.createElement('a'); a.href = url;
      const base = document.name.replace(/\.pdf$/i, '');
      a.download = `${base}-${{ diagnostics: 'diagnostico-analisis.json', edition: 'edicion-pdf-para-ia.json', findings: 'hallazgos-para-ia.json', changes: 'cambios.json', source: 'origen.json', text: 'revisado.txt', report: 'informe.html' }[format]}`;
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  const nav = [['projects','Mis proyectos','grid'],['documents','Documentos','file'],['edition','Revisar PDF','book']];
  const extraNav = [['rules','Reglas de revisión','rule'],['sources','Fuentes','book'],['history','Historial','clock'],['settings','Configuración','settings']];
  const titles = Object.fromEntries([...nav,...extraNav].map(([key,title])=>[key,title]));
  const needsDocument = ['edition','history'].includes(section);
  const realSection = !projectId && ['documents','edition','history'].includes(section) ? 'projects' : needsDocument && !selectedId ? 'documents' : section;

  if (!session) return <main className="startup"><div className="brand-mark">H</div><p>{error || 'Abriendo Humanizador…'}</p>{error && <button onClick={() => window.location.reload()}>Reintentar</button>}</main>;
  if (!session.authenticated) return <main className="login-page"><form className="login-card" onSubmit={e => { e.preventDefault(); action(async () => { await api('/session', post({ password })); setSession(await api('/session')); setPassword(''); }); }}>
    <div className="brand-mark">H</div><h1>Humanizador</h1><p>Tus documentos y sus revisiones, en un espacio privado.</p>
    <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus /></label>
    {error && <p className="error-message" role="alert">{error}</p>}
    <button className="primary" disabled={busy}>Entrar</button>
  </form></main>;

  return <div className={`app-shell ${sidebarCollapsed?'sidebar-collapsed':''}`}>
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <button className="brand" onClick={() => { setSection('documents'); setMobileMenu(false); }}><span className="brand-mark">H</span><span><strong>Humanizador</strong><small>Revisión editorial en castellano</small></span></button>
      <div className="nav-group-label">PROYECTO ACTIVO</div><label className="project-select"><span className="sr-only">Proyecto activo</span><select aria-label="Proyecto activo" disabled={!projects.length} value={projectId} onChange={e => switchProject(e.target.value)}>{!projects.length && <option value="">Sin proyectos</option>}{projects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
      <nav aria-label="Navegación principal">{nav.map(([key, title, icon]) => <button key={key} title={title} className={`nav-item ${realSection === key ? 'selected' : ''}`} onClick={() => { setSection(key); setMobileMenu(false); }} >
        <Icon name={icon}/><span>{title}</span>{key === 'documents' && documents.length > 0 && <span className="nav-count">{documents.length}</span>}
      </button>)}<details className="secondary-nav"><summary>Más opciones</summary>{extraNav.map(([key,title,icon])=><button key={key} title={title} className={`nav-item ${realSection===key?'selected':''}`} onClick={()=>{setSection(key);setMobileMenu(false);}}><Icon name={icon}/><span>{title}</span></button>)}</details></nav>
      <div className="sidebar-note"><Icon name="shield"/><div><strong>Tus archivos, privados</strong><span>Procesados en el servidor.<br/>Ollama local opcional.</span></div></div>
      <div className="sidebar-bottom"><span className="status-dot"/><span>Humanizador <b>0.6</b><small>{session.mode === 'local' ? 'Entorno local' : 'Servidor privado'} · es-ES</small></span></div>
    </aside>
    {mobileMenu && <button className="menu-backdrop" aria-label="Cerrar menú" onClick={() => setMobileMenu(false)}/>}
    <div className="workspace">
      <header className="topbar"><button className="sidebar-toggle" aria-label={sidebarCollapsed?'Expandir menú':'Contraer menú'} onClick={()=>setSidebarCollapsed(v=>{localStorage.setItem('humanizador-sidebar',v?'expanded':'collapsed');return !v;})}>{sidebarCollapsed?'☰':'‹'}</button><button className="menu-button" aria-label="Abrir menú" onClick={() => setMobileMenu(true)}>☰</button><strong>{realSection === 'projects' ? 'Mis proyectos' : (needsDocument && document?.name) || project?.name || 'Mis proyectos'}</strong><span className="topbar-tag">{session.mode === 'local' ? 'Local' : 'Servidor'}</span><span className="pill green"><Icon name="shield"/>Procesamiento privado</span><span className="topbar-spacer"/>{session.passwordRequired && <button className="text-button" onClick={() => action(async () => { await api('/session', { method: 'DELETE' }); setSession({ ...session, authenticated: false }); setDocuments([]); setDocument(null); })}>Salir</button>}</header>
      <main className={`main-content ${realSection==='edition' ? 'wide' : ''}`}>
        <div className="breadcrumb"><button onClick={() => setSection('projects')}>Mis proyectos</button>{realSection !== 'projects' && project && <><span>/</span><button onClick={() => setSection('documents')}>{project.name}</button></>}{!['projects','dashboard'].includes(realSection) && <><span>/</span><span>{titles[realSection]}</span></>}</div>
        <div className="page-heading"><div><div className="eyebrow">{realSection === 'documents' ? 'TU ESPACIO DE REVISIÓN' : 'REVISIÓN EDITORIAL'}</div><h1>{realSection === 'documents' ? 'Documentos del proyecto' : titles[realSection]}</h1><p>{realSection === 'projects' ? 'Trabaja en varios textos sin mezclar sus revisiones.' : realSection === 'dashboard' ? 'Tamaño, avance de revisión y procesamiento de este proyecto.' : realSection === 'documents' ? 'Lee el original, revisa las expresiones y decide qué merece cambiar.' : realSection === 'findings' ? 'Cada coincidencia necesita el contexto y tu criterio.' : realSection === 'rules' ? 'Un catálogo ampliable, con ejemplos y límites claros.' : document?.name || 'Castellano de España · perfil Roberto'}</p></div>
          <button className="button-icon help-button" aria-label="Ayuda sobre la revisión" onClick={() => setSection('settings')}><Icon name="help"/></button>
        </div>
        {error && <div className="error-message toast-error" role="alert"><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError('')}>×</button></div>}
        {session.start_notice && <p className="startup-notice" role="status">{session.start_notice}</p>}
        {notice && <section className="card" role="status">{notice}</section>}
        {realSection === 'projects' && <Projects projects={projects} busy={busy} onOpen={switchProject} onDelete={deleteProject} onCreate={data => action(async () => { const created = await api('/projects', post(data)); setProjects(await api('/projects')); switchProject(created.id); })}/>}
        {realSection === 'documents' && <>
          <div className="overview-grid"><section className="card hero-card"><div className="eyebrow"><span className="blue-line"/>EMPEZAR UNA REVISIÓN</div><h2>Tu documento, frase a frase</h2><p>Sube un PDF con texto seleccionable. Ábrelo para anotar y elige cuándo revisar con las reglas del catálogo o con Ollama.</p><div className="hero-actions"><button className="primary" onClick={() => setUploadOpen(true)}><Icon name="upload"/>Subir un PDF</button></div><span className="muted small">Hasta {uploadMb} MB y 300 páginas · el análisis continúa con la web cerrada.</span></section>
          <section className="card review-guide"><span className="icon-tile"><Icon name="scan"/></span><h3>Conserva lo que tiene sentido</h3><p>Una muletilla puede sobrar o cumplir una función. Cada aviso explica qué revisar; tú decides la corrección.</p><div className="guide-bottom"><span className="pill blue">{catalogue?.implemented ?? 0} reglas ejecutables</span><button className="text-button" onClick={() => setSection('rules')}>Ver reglas<Icon name="arrow"/></button></div></section></div>
          <div className="section-heading"><h2>Mis documentos <span className="quiet-count">{documents.length}</span></h2><span className="muted small">Original y decisiones guardados en el servidor</span></div>
          {documents.length === 0 ? <section className="card empty-documents"><span className="empty-icon"><Icon name="file" width="30" height="30"/></span><h3>Aquí aparecerán tus revisiones</h3><p>Sube el documento que quieres revisar.</p><button className="text-button" onClick={() => setUploadOpen(true)}>Subir el primer PDF<Icon name="arrow"/></button></section> : <div className="document-grid">{documents.map(d => <button key={d.id} className="card document-card" onClick={() => openDocument(d.id)}><div className="document-card-top"><span className="file-tile"><Icon name="file"/></span><span className={`pill ${d.status === 'completed' ? 'green' : d.status === 'failed' ? 'red' : 'blue'}`}>{stageNames[d.status]}</span></div><h3>{d.name}</h3><p>{d.profile.genre}</p><div className="document-metrics"><strong>{d.pending}<small>pendientes</small></strong><strong>{d.findings}<small>hallazgos</small></strong><strong>{d.coverage ? `${d.coverage.analyzed}/${d.coverage.total}` : '—'}<small>páginas analizadas</small></strong></div><div className="document-card-bottom"><span>{new Date(d.created_at).toLocaleDateString('es-ES')}</span><span>Ver revisión<Icon name="arrow"/></span></div></button>)}</div>}
        </>}
        {needsDocument && selectedId && !document && <div className="card loading-card" role="status">Cargando revisión…</div>}
        {realSection === 'edition' && document && <PdfEdition key={document.id} document={document} page={page} setPage={setPage} busy={busy} onExport={() => download('edition')} localModel={localModel} onDecision={saveDecision}
          onRefreshModel={()=>action(async()=>setLocalModel(await api('/local-model')))}
          onAnalyze={mode=>action(async()=>{await api(`/documents/${document.id}/reprocess`,post({revision:document.revision,review_mode:mode}));setDocument(await api(`/documents/${document.id}`));})}
          onRetry={()=>action(async()=>{await api(`/documents/${document.id}/retry`,post({}));setDocument(await api(`/documents/${document.id}`));})}
          onCancel={()=>action(async()=>{await api(`/documents/${document.id}/cancel`,post({}));setDocument(await api(`/documents/${document.id}`));})}
          onDiagnostics={()=>download('diagnostics')}
          onCreate={async input => { const saved=await api(`/documents/${document.id}/annotations`,post(input)); setDocument(await api(`/documents/${document.id}`)); return saved; }}
          onUpdate={async (a,note,status) => { await api(`/documents/${document.id}/annotations/${a.id}`,{...post({version:a.version,note,status}),method:'PUT'}); setDocument(await api(`/documents/${document.id}`)); }}
          onDelete={async a => { await api(`/documents/${document.id}/annotations/${a.id}`,{...post({version:a.version}),method:'DELETE'}); setDocument(await api(`/documents/${document.id}`)); }}/>}
        {realSection === 'rules' && catalogue && <>
          <div className="rule-toolbar"><input type="search" placeholder="Buscar regla o expresión…" aria-label="Buscar regla" value={ruleSearch} onChange={e => setRuleSearch(e.target.value)}/><label className="checkbox"><input type="checkbox" checked={showResearch} onChange={e => setShowResearch(e.target.checked)}/>Incluir fichas pendientes ({catalogue.validation.pending})</label></div><p className="extraction-disclaimer">{catalogue.validation.deterministic} comprobaciones del motor, {catalogue.validation.local_optional} criterios opcionales con Ollama y {catalogue.validation.pending} fichas pendientes. {catalogue.validation.corpus_evaluated} reglas con precisión editorial medida en un corpus representativo. Los avisos activos son experimentales y requieren tu revisión.</p>
          <RuleTable rules={catalogue.rules.filter(r => (showResearch || r.implemented || r.detector.type === 'local_editorial') && `${r.name} ${r.detector.phrases.join(' ')} ${r.id}`.toLocaleLowerCase('es-ES').includes(ruleSearch.toLocaleLowerCase('es-ES')))} sources={catalogue.sources} coverage={catalogue.coverage} familyNames={familyNames} severityNames={severityNames}/>

        </>}
        {realSection === 'sources' && catalogue && <EvidenceSources catalogue={catalogue}/>}
        {realSection === 'history' && document && <section className="card"><h2>Revisiones anteriores</h2><p>La exportación única incluye las revisiones anteriores identificadas y sus decisiones. El PDF original se guarda una sola vez por proyecto.</p>{document.runs?.length ? document.runs.map(run => <div className="settings-row" key={run.id}><span>{new Date(run.archived_at).toLocaleString('es-ES')} · {run.rule_count} reglas · {stageNames[run.status]}</span><span className="small muted">Incluida en la exportación de revisión</span></div>) : <p>Aún no hay revisiones anteriores.</p>}</section>}
        {realSection === 'history' && document && <section className="card history-card"><h2>Actividad de esta revisión</h2>{document.events.map((event, i) => <div className="history-event" key={i}><span className="history-dot"/><div><strong>{event.message}</strong><time>{new Date(event.at).toLocaleString('es-ES')}</time></div></div>)}</section>}
        {realSection === 'settings' && <>
          <section className="card settings-card"><h2>Configuración de la revisión</h2><OllamaSetup status={localModel} busy={busy} onRefresh={()=>action(async()=>setLocalModel(await api('/local-model')))}/><div className="settings-row"><span>Idioma</span><strong>Castellano de España · es-ES</strong></div><div className="settings-row"><span>Procesamiento</span><strong>Un worker del servidor y cola persistente</strong></div><div className="settings-row"><span>Modelos de lenguaje</span><strong>{localModel?.ready ? localModel.model + ' · preparado en local' : localModel?.message || 'Comprobando Ollama…'}</strong></div><div className="settings-row"><span>Documentos admitidos</span><strong>PDF con texto · {uploadMb} MB · 300 páginas</strong></div><div className="settings-row"><span>OCR y lectura estructural</span><strong>Pendientes de una versión posterior</strong></div><div className="settings-row"><span>Privacidad de este entorno</span><strong>{session.passwordRequired ? 'Sesión con contraseña' : 'Acceso local sin contraseña; servidor limitado a este ordenador'}</strong></div><p>Los PDF y sus revisiones se guardan fuera de la web pública. Al conservar una expresión resuelves esa ocurrencia; las reglas generales permanecen iguales.</p></section>
          {document && <section className="card"><h3>Proyecto del documento</h3><p>Trasladarlo conserva el PDF y todas sus decisiones.</p><label className="move-project">Mover a otro proyecto<select aria-label="Mover a otro proyecto" disabled={busy} value={document.project_id} onChange={e => { const target = e.target.value; action(async () => { await api(`/documents/${document.id}`, { ...post({ project_id: target }), method: 'PATCH' }); setProjects(await api('/projects')); switchProject(target); }); }}>{projects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label></section>}
          {document && <section className="card danger-zone"><h3>Eliminar «{document.name}»</h3><p>Se eliminarán el PDF, la extracción, el análisis y las decisiones de la base activa. Las copias de seguridad que hayas creado conservan su contenido hasta borrarlas.</p><DeleteDocument busy={busy} onDelete={() => action(async () => { await api(`/documents/${document.id}`, { method: 'DELETE' }); setSelectedId(null); selectedRef.current = null; setDocument(null); setSection('documents'); setDocuments(await api(documentListPath())); setProjects(await api('/projects')); })}/></section>}
        </>}
      </main>
      <footer className="app-footer">Construido con Codex · edición bajo criterio humano.<span>Humanizador 0.6 · es-ES</span></footer>
    </div>
    {uploadOpen && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) setUploadOpen(false); }}><section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title"><button className="modal-close" aria-label="Cerrar subida" onClick={() => setUploadOpen(false)} disabled={busy}>×</button><span className="icon-tile"><Icon name="upload"/></span><h2 id="upload-title">Subir un documento</h2><p>Se abrirá para leer y anotar. Desde el visor podrás iniciar una revisión por reglas o con Ollama.</p><p className="upload-project">Proyecto: <strong>{project?.name}</strong></p><label>Tipo de texto<select value={genre} onChange={e => setGenre(e.target.value)}>{['Explicación técnica', 'Ensayo', 'Comunicación profesional', 'Narrativa'].map(g => <option key={g}>{g}</option>)}</select></label><label className={`drop-zone ${busy ? 'disabled' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) upload(e.dataTransfer.files[0]); }}><Icon name="file" width="32" height="32"/><strong>{busy ? 'Guardando el PDF…' : 'Elige un PDF o arrástralo aquí'}</strong><span>Texto seleccionable · hasta {uploadMb} MB</span><input ref={input} type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e => upload(e.target.files[0])}/></label></section></div>}
  </div>;
}

function DeleteDocument({ onDelete, busy }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? <div className="decision-actions"><button className="danger" disabled={busy} onClick={onDelete}>Eliminar definitivamente de la base activa</button><button onClick={() => setConfirm(false)}>Cancelar</button></div> : <button className="danger" onClick={() => setConfirm(true)}>Eliminar documento</button>;
}
