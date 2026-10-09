import React from 'react';
export default function FindingsTable({findings,selectedId,statusOf,onOpen,severityNames}){
  return <div className="proposal-table-scroll"><table className="compact-table proposal-table" aria-label="Propuestas de revisión"><thead><tr><th>Pág.</th><th>Expresión y propuesta</th><th>Regla</th><th>Estado</th></tr></thead><tbody>{findings.map(f=>{
    const status=statusOf(f);
    return <tr key={f.id} className={selectedId===f.id?'selected':''}>
      <td><button className="page-link" aria-label={`Ver propuesta en página ${f.page}`} onClick={()=>onOpen(f)}>{f.page}</button></td>
      <td><button className="proposal-open" onClick={()=>onOpen(f)}><strong title={f.phrase}>{f.phrase}</strong><span title={f.replacement??f.explanation}>{f.replacement===null||f.replacement===undefined?f.explanation:f.replacement||'Propuesta: eliminar el fragmento'}</span></button></td>
      <td><span className="small" title={f.rule_name}>{f.rule_id}</span><small className={`severity ${f.severity}`}>{severityNames[f.severity]}</small></td>
      <td><span className={`pill ${status==='approved'?'green':''}`}>{status==='approved'?'Aprobada':status==='kept'?'Conservada':'Pendiente'}</span></td>
    </tr>;
  })}</tbody></table></div>;
}
