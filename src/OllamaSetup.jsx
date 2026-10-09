import React, {useState} from 'react';

export default function OllamaSetup({status,onRefresh,busy=false}) {
  const [system,setSystem]=useState(null);
  const detected=system||status?.host_platform;
  const os=detected==='win32'?'win32':detected==='linux'?'linux':'darwin';
  return <details className="ollama-setup">
    <summary><span className={status?.ready?'ollama-ready':'ollama-unavailable'}>{status?.ready?'Ollama disponible':status?.status==='disabled'?'Ollama desactivado':status?.status==='missing_model'?'Falta el modelo de Ollama':'Comprobar Ollama'}</span> · Instalación y ayuda</summary>
    <div className="ollama-help">
      <p role="status">{status?.message||'No hay un diagnóstico disponible. Pulsa «Volver a comprobar» para consultar el servicio local.'}</p>
      <div className="ollama-actions"><button disabled={busy} onClick={onRefresh}>Volver a comprobar</button><a href="https://rcanalescoder.github.io/Humanizador/#ollama" target="_blank" rel="noreferrer">Guía completa de Ollama ↗</a></div>
      <p>Puedes leer, anotar y revisar con reglas sin Ollama. Esta comprobación no inicia un análisis.</p>
      <label>Ordenador donde se ejecuta Humanizador <select value={os} onChange={e=>setSystem(e.target.value)}><option value="darwin">Mac</option><option value="win32">Windows</option><option value="linux">Linux</option></select></label>
      {os==='darwin'?<ol><li>Descarga <a href="https://ollama.com/download/mac" target="_blank" rel="noreferrer">Ollama para Mac</a>, llévalo a Aplicaciones y ábrelo. Requiere macOS 14 o posterior. Apple Silicon puede usar GPU; Mac Intel utiliza CPU y puede tardar más.</li><li>En la carpeta de Humanizador, ejecuta <code>./instalar.sh --configure</code>. El asistente permite elegir un modelo ya instalado o confirmar una descarga.</li></ol>:os==='win32'?<ol><li>Instala <a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer">Ollama para Windows</a> y ábrelo. Requiere Windows 10 22H2 o posterior; la aceleración depende de la GPU y sus controladores.</li><li>Abre una terminal nueva en la carpeta de Humanizador y ejecuta <code>.\instalar.ps1 -Configure</code>. Si PowerShell bloquea el script, consulta el apartado de instalación del manual.</li></ol>:<ol><li>Sigue la <a href="https://docs.ollama.com/linux" target="_blank" rel="noreferrer">instalación oficial para Linux</a> y arranca su servicio.</li><li>En la carpeta de Humanizador ejecuta <code>./instalar.sh --configure</code> para elegir un modelo.</li></ol>}
      {status?.model&&<p>Modelo configurado: <code>{status.model}</code>. {status?.installed_models?.length>0&&<>Instalados: {status.installed_models.join(', ')}.</>}</p>}
      <p>Los modelos ocupan varios GB y también necesitan memoria para el contexto. El instalador ofrece <code>qwen3.5:4b</code> como opción ligera; su calidad editorial no está comparada con la de modelos mayores. La configuración histórica <code>qwen3.6:27b-q8_0</code> requiere muchos más recursos.</p>
      <p>Si Ollama consume recursos, consulta «Ver actividad» en la revisión. <code>ollama ps</code> muestra modelos cargados, que pueden permanecer en memoria después del análisis. Humanizador solo inicia inferencia cuando pides una revisión o continúas una pendiente.</p>
    </div>
  </details>;
}
