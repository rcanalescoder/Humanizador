import React, { useEffect, useRef, useState } from 'react';
import PdfViewer from './PdfViewer.jsx';
import AnalysisStatus from './AnalysisStatus.jsx';
import Suggestions from './Suggestions.jsx';
import OllamaSetup from './OllamaSetup.jsx';

export default function PdfEdition({ document, page, setPage, onCreate, onUpdate, onDelete, onExport, busy, localModel, onRefreshModel, onAnalyze, onRetry, onCancel, onDiagnostics, onDecision }) {
  const [draft,setDraft]=useState(null),[selectedId,setSelectedId]=useState(null),[filter,setFilter]=useState('all'),[search,setSearch]=useState('');
  const [tab,setTab]=useState('notes'),[findingId,setFindingId]=useState(null),[hidden,setHidden]=useState(false),[swapped,setSwapped]=useState(()=>localStorage.getItem('humanizador-panels')==='swapped');
  const [split,setSplit]=useState(()=>Math.min(75,Math.max(30,Number(localStorage.getItem('humanizador-split'))||56))),[deferred,setDeferred]=useState(false),[confirmAnalysis,setConfirmAnalysis]=useState(null);
  const layout=useRef(null),drag=useRef(false);
  useEffect(()=>{localStorage.setItem(`humanizador-page-${document.id}`,String(page));},[document.id,page]);
  const annotations=document.annotations||[],selected=annotations.find(a=>a.id===selectedId),findings=document.result?.findings||[],finding=findings.find(f=>f.id===findingId);
  const working=['queued','extracting','analyzing'].includes(document.status),paused=document.status==='paused';
  const visible=annotations.filter(a=>(filter==='all'||a.status===filter)&&(a.note+' '+(a.anchor.text?.quote||'')).toLocaleLowerCase('es-ES').includes(search.toLocaleLowerCase('es-ES')));
  function select(a){setSelectedId(a.id);setFindingId(null);setPage(a.page);setTab('notes');}
  function selectFinding(f){setFindingId(f.id);setSelectedId(null);setPage(f.page);setTab('suggestions');}
  function size(value){const n=Math.min(75,Math.max(30,value));setSplit(n);localStorage.setItem('humanizador-split',String(n));}
  function analyze(mode){if(document.result||paused)setConfirmAnalysis(mode);else onAnalyze(mode);}
  const x=document.diagnostics||{};
  return <div className="review-workspace">
    <div className="review-toolbar">
      <div className="review-start"><button disabled={busy||working} onClick={()=>analyze('rules')}>Revisar con reglas</button><button disabled={busy||working||!localModel?.ready} title={localModel?.message} onClick={()=>analyze('local')}>Revisar con Ollama</button><button className="text-button" title={localModel?.message} aria-label="Comprobar disponibilidad de Ollama" onClick={onRefreshModel} disabled={busy}>↻</button></div>
      <button className="primary" disabled={busy} onClick={onExport}>Exportar revisión para IA</button>
    </div>
    <OllamaSetup status={localModel} onRefresh={onRefreshModel} busy={busy}/>
    {confirmAnalysis&&<section className="review-confirm" role="alert"><p>La revisión actual y sus decisiones se guardarán en el historial incluido en la exportación. {confirmAnalysis==='local'?'Ollama recorrerá el documento en este ordenador; puede tardar bastante.':'Se aplicarán las reglas actuales del catálogo.'}</p><button className="primary" disabled={busy} onClick={()=>{onAnalyze(confirmAnalysis);setConfirmAnalysis(null);}}>Iniciar nueva revisión</button><button onClick={()=>setConfirmAnalysis(null)}>Conservar revisión actual</button></section>}
    {paused&&!deferred&&<section className="recovery-banner" role="status"><strong>La revisión quedó en pausa. ¿Quieres continuar?</strong><p>Se recuperarán los bloques completos compatibles ({x.stored_chunks??0} guardados). Tus notas se conservan.</p><button className="primary" disabled={busy} onClick={onRetry}>Continuar revisión</button><button onClick={()=>setDeferred(true)}>Dejar pendiente</button></section>}
    {paused&&deferred&&<p className="startup-notice">Revisión en pausa. <button disabled={busy} onClick={onRetry}>Continuar cuando quieras</button></p>}
    <details className="workspace-diagnostics"><summary>{working?`Análisis en curso · ${x.page?`página ${x.page} · `:''}${x.completed??document.progress} / ${x.total||document.total||'…'}`:document.status==='failed'?`El análisis falló: ${document.error}`:paused?'Revisión en pausa':document.status==='ready'?'Sin análisis automático: puedes leer y anotar':'Estado y alcance del análisis'} · Ver actividad</summary><AnalysisStatus document={document} busy={busy} onRetry={onRetry} onCancel={onCancel} onExport={onDiagnostics}/></details>
    <div className="layout-tools"><span><i className="legend-note"/> Mis notas <i className="legend-finding"/> Sugerencias</span><div><button aria-pressed={hidden} onClick={()=>setHidden(!hidden)}>{hidden?'Mostrar PDF':'Contraer PDF'}</button><button disabled={hidden} onClick={()=>setSwapped(v=>{localStorage.setItem('humanizador-panels',v?'normal':'swapped');return !v;})}>Intercambiar paneles</button></div></div>
    <div ref={layout} className={`edition-layout unified-layout ${hidden?'pdf-collapsed':''} ${swapped?'swapped':''}`} style={{'--pdf-share':`${split}%`,'--left-share':`${swapped?100-split:split}%`}}>
      <section className="card edition-document"><PdfViewer documentId={document.id} pageNumber={page} setPageNumber={setPage} result={document.result} finding={finding} findings={findings} onSelectFinding={selectFinding} editing sourceHash={document.sha256} annotations={annotations} selectedAnnotation={selected} onSelectAnnotation={select} onDraft={setDraft}/></section>
      <div className="panel-divider" role="separator" aria-label="Ancho del PDF" aria-orientation="vertical" aria-valuemin={30} aria-valuemax={75} aria-valuenow={Math.round(split)} tabIndex={0}
        onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();size(e.key==='Home'?30:e.key==='End'?75:split+(e.key==='ArrowRight'?3:-3)*(swapped?-1:1));}}}
        onPointerDown={e=>{drag.current=true;e.currentTarget.setPointerCapture(e.pointerId);}}
        onPointerMove={e=>{if(drag.current){const r=layout.current.getBoundingClientRect(),n=(e.clientX-r.left)/r.width*100;size(swapped?100-n:n);}}}
        onPointerUp={()=>drag.current=false} onPointerCancel={()=>drag.current=false}/>
      <section className="card annotation-panel"><div className="panel-tabs" role="tablist" aria-label="Revisión del documento"><button id="notes-tab" role="tab" aria-selected={tab==='notes'} aria-controls="notes-panel" className={tab==='notes'?'active':''} onClick={()=>setTab('notes')}>Mis notas · {annotations.length}</button><button id="suggestions-tab" role="tab" aria-selected={tab==='suggestions'} aria-controls="suggestions-panel" className={tab==='suggestions'?'active':''} onClick={()=>setTab('suggestions')}>Sugerencias · {findings.length}</button></div>
        <div id="notes-panel" role="tabpanel" aria-labelledby="notes-tab" hidden={tab!=='notes'}>
          <div className="annotation-filters"><input type="search" aria-label="Buscar en mis notas" placeholder="Buscar texto o nota…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Estado de las notas" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas</option><option value="open">Pendientes</option><option value="resolved">Resueltas</option></select></div>
          <div className="annotation-table-scroll"><table className="compact-table proposal-table"><thead><tr><th>Pág.</th><th>Selección y nota</th><th>Estado</th></tr></thead><tbody>{visible.map(a=><tr className={a.id===selectedId?'selected':''} key={a.id}><td><button className="page-link" aria-label={`Abrir anotación de página ${a.page}`} onClick={()=>select(a)}>{a.page}</button></td><td><button className="proposal-open" onClick={()=>select(a)}><strong>{a.anchor.text?.quote||'Zona / infografía'}</strong><span>{a.note}</span></button></td><td><span className={`pill ${a.status==='resolved'?'green':''}`}>{a.status==='resolved'?'Resuelta':'Pendiente'}</span></td></tr>)}</tbody></table>
            {!visible.length&&<p className="table-empty">{annotations.length?'No hay notas con este filtro.':'Selecciona una frase o marca una zona del PDF para añadir una nota.'}</p>}
          </div>
          {selected&&<AnnotationEditor key={`${selected.id}:${selected.version}`} annotation={selected} documentId={document.id} onUpdate={onUpdate} onDelete={async a=>{await onDelete(a);setSelectedId(null);}}/>}
        </div>
        <div id="suggestions-panel" role="tabpanel" aria-labelledby="suggestions-tab" hidden={tab!=='suggestions'}><Suggestions document={document} page={page} selectedId={findingId} onSelect={selectFinding} onSave={onDecision} busy={busy||working}/></div>
      </section>
    </div>
    {draft&&<AnnotationDialog draft={draft} onClose={()=>setDraft(null)} onSave={async note=>{const saved=await onCreate({...draft,note});setSelectedId(saved.id);setFindingId(null);setTab('notes');setDraft(null);window.getSelection()?.removeAllRanges();}}/>}
  </div>;
}

function AnnotationDialog({draft,onClose,onSave}){
  const dialog=useRef(null),input=useRef(null),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const previous=window.document.activeElement;dialog.current.showModal();input.current.focus();return()=>previous?.focus();},[]);
  async function save(e){e.preventDefault();if(saving)return;setSaving(true);setError('');try{await onSave(note);}catch(e){setError(e.message);}finally{setSaving(false);}}
  return <dialog className="annotation-dialog" ref={dialog} aria-labelledby="annotation-title" onCancel={e=>{e.preventDefault();if(!saving)onClose();}}><form onSubmit={save}>
    <div className="card-heading"><h2 id="annotation-title">Añadir nota · página {draft.page}</h2><button type="button" aria-label="Cerrar nota sin guardar" disabled={saving} onClick={onClose}>×</button></div>
    {draft.quote?<blockquote className="annotation-quote">{draft.quote}</blockquote>:<p className="small muted">Zona marcada del PDF</p>}
    {draft.preview&&<img className="annotation-preview" src={draft.preview} alt="Recorte de la selección del PDF"/>}
    <label htmlFor="annotation-note">¿Qué te suena raro o qué quieres cambiar?</label><textarea id="annotation-note" ref={input} required maxLength={5000} rows={5} value={note} onChange={e=>setNote(e.target.value)} placeholder="Explica el problema o el cambio que quieres proponer…" onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')save(e);}}/>
    {error&&<p className="error-message" role="alert">{error}</p>}
    <div className="decision-actions"><button className="primary" type="submit" disabled={saving||!note.trim()}>{saving?'Guardando…':'Guardar nota'}</button><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><span className="small muted">Ctrl / ⌘ + Enter para guardar</span></div>
  </form></dialog>;
}

function AnnotationEditor({annotation:a,documentId,onUpdate,onDelete}){
  const [note,setNote]=useState(a.note),[saving,setSaving]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
  async function act(fn){setSaving(true);setError('');try{await fn();}catch(e){setError(e.message);}finally{setSaving(false);}}
  return <div className="annotation-editor"><div className="card-heading"><h3>Nota · página {a.page}</h3><span className="small muted">{a.kind==='text'?'Texto':'Zona / infografía'}</span></div>
    {a.anchor.text&&<blockquote className="annotation-quote">{a.anchor.text.quote}</blockquote>}
    {a.has_preview&&<img className="annotation-preview" src={`/api/documents/${documentId}/annotations/${a.id}/preview`} alt={`Zona marcada en la página ${a.page}`}/>}
    <label htmlFor="saved-annotation-note">Tu indicación</label><textarea id="saved-annotation-note" rows={4} maxLength={5000} value={note} onChange={e=>setNote(e.target.value)}/>
    {error&&<p className="error-message" role="alert">{error}</p>}
    <div className="decision-actions"><button className="primary" disabled={saving||!note.trim()||note===a.note} onClick={()=>act(()=>onUpdate(a,note,a.status))}>Guardar cambios</button><button disabled={saving||!note.trim()} onClick={()=>act(()=>onUpdate(a,note,a.status==='open'?'resolved':'open'))}>{a.status==='open'?'Marcar resuelta':'Reabrir'}</button></div>
    <div className="annotation-delete">{confirm?<><span>¿Eliminar esta nota?</span><button className="danger" disabled={saving} onClick={()=>act(()=>onDelete(a))}>Confirmar eliminación</button><button disabled={saving} onClick={()=>setConfirm(false)}>Conservar</button></>:<button className="text-button" onClick={()=>setConfirm(true)}>Eliminar nota</button>}</div>
    <p className="small muted">El exportado incluye la página, el área exacta, el recorte y tu indicación.</p>
  </div>;
}
