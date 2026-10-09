import React,{useEffect,useState} from 'react';

const stages={paused:'Revisión en pausa',ready:'Sin análisis automático',queued:'Esperando turno',extracting:'Extrayendo texto del PDF',rules:'Aplicando reglas del catálogo',model:'Comprobando el modelo local',generation:'Buscando propuestas con Ollama',editorial:'Comprobando los diagnósticos',fidelity:'Comprobando la fidelidad de las sustituciones',cache:'Recuperando revisión guardada',completed:'Análisis terminado'};
const clock=value=>value?new Date(value).toLocaleString('es-ES'):'Sin registro';
const duration=ms=>{const seconds=Math.max(0,Math.floor(ms/1000));return seconds<60?`${seconds} s`:`${Math.floor(seconds/60)} min ${seconds%60} s`;};
export default function AnalysisStatus({document:d,busy,onRetry,onCancel,onExport}) {
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const x=d.diagnostics||{},working=['queued','extracting','analyzing'].includes(d.status);
  const age=x.heartbeat_at_ms?now-x.heartbeat_at_ms:null;
  const local=d.profile.review_mode==='local'&&!['extracting','rules'].includes(x.phase);
  const current=x.completed??d.progress,total=x.total??d.total;
  return <section className="card analysis-status" aria-label="Estado del análisis">
    <div className="card-heading"><div><span className={`pill ${d.status==='failed'?'red':d.status==='completed'?'green':'blue'}`}>{d.status==='failed'?'Análisis detenido':d.status==='cancelled'?'Cancelado':d.status==='paused'?'En pausa':d.status==='ready'?'Sin iniciar':working?'En proceso':'Terminado'}</span><h2>{stages[['paused','ready'].includes(d.status)?d.status:x.stage||x.phase]||'Estado del análisis'}</h2></div><button onClick={onExport} disabled={busy}>Descargar diagnóstico</button></div>
    {d.error&&<p className="error-message" role="alert">{d.error}</p>}
    {x.explanation&&<p>{x.explanation}</p>}
    {x.legacy&&d.status==='failed'&&<p>Este análisis es anterior al registro detallado. Conservamos su error y los fragmentos terminados; un reintento registrará la fase y la página de cualquier fallo nuevo.</p>}
    <dl className="analysis-metrics"><div><dt>Avance</dt><dd>{total?`${current} de ${total} ${local?'fragmentos':'páginas'} terminados`:'Esperando el inicio de esta fase'}</dd></div><div><dt>Página actual o del fallo</dt><dd>{x.page||'Sin registro'}{x.chunk?` · fragmento ${x.chunk}`:''}</dd></div><div><dt>Fragmentos recuperados en esta pasada</dt><dd>{x.cached_chunks??0}</dd></div><div><dt>Revisiones guardadas para reintentar</dt><dd>{x.stored_chunks??0}</dd></div><div><dt>Modelo</dt><dd>{x.model||'Solo reglas del catálogo'}</dd></div><div><dt>Última actividad registrada</dt><dd>{clock(x.updated_at_ms)}</dd></div></dl>
    {working&&<div className="analysis-live" role="status"><p>{d.status==='queued'?'El trabajo está en la cola del servidor.':age===null?'Esperando la primera señal del proceso.':age<15000?`El proceso sigue activo. Última señal hace ${duration(age)}.`:`No hay una señal reciente del proceso (hace ${duration(age)}). Si se interrumpió, el servidor intentará recuperarlo.`}</p>{x.stage_started_at_ms&&<p>Tiempo en la fase actual: {duration(now-x.stage_started_at_ms)}. {['generation','editorial','fidelity'].includes(x.stage)&&'Esperando una respuesta completa de Ollama; no hay un porcentaje fiable dentro de esta petición.'}</p>}</div>}
    {d.started_at_ms&&<p className="small muted">Inicio: {clock(d.started_at_ms)} · {working?'Tiempo transcurrido':'Duración'}: {duration((d.finished_at_ms||now)-d.started_at_ms)}</p>}
    <div className="decision-actions">{['failed','cancelled','paused'].includes(d.status)&&<button className="primary" disabled={busy} onClick={onRetry}>{d.status==='paused'?'Continuar revisión':'Reintentar análisis'}</button>}{working&&<button disabled={busy} onClick={onCancel}>Cancelar análisis</button>}</div>
    <p className="small muted">Los fragmentos completos se reutilizan si coinciden el texto, el contexto, el modelo y las reglas. Una respuesta no validada no se publica como hallazgo.</p>
    <details className="diagnostic-details"><summary>Detalles técnicos del diagnóstico</summary><pre>{JSON.stringify(x,null,2)}</pre></details>
    {Boolean(x.recent_failures?.length)&&<details className="diagnostic-details"><summary>Últimos fallos registrados · {x.recent_failures.length}</summary>{x.recent_failures.map((f,i)=><div key={i}><p><strong>{clock(f.at_ms)} · {f.page?`Página ${f.page}`:'Sin página registrada'}</strong><br/>{f.explanation||f.error?.message}</p><pre>{JSON.stringify(f,null,2)}</pre></div>)}</details>}
    <h3>Actividad reciente</h3><ol className="analysis-events">{(d.events||[]).map((e,i)=><li key={`${e.at}:${i}`}><time>{new Date(e.at).toLocaleString('es-ES')}</time><span>{e.message}</span></li>)}</ol>
  </section>;
}
