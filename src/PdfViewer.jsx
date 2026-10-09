import React, { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { pageText, orderedRect } from '../core/pdf-text.mjs';
// Older servers served .mjs as octet-stream with an immutable cache header.
// Use a new URL so existing browser tabs receive the corrected JavaScript MIME.
GlobalWorkerOptions.workerSrc = `${workerUrl}?module=1`;

export default function PdfViewer({ documentId, pageNumber, setPageNumber, finding, result, editing=false,
  findings=[], onSelectFinding, sourceHash, annotations=[], selectedAnnotation, onSelectAnnotation, onDraft }) {
  const container=useRef(null),canvas=useRef(null),pdfRef=useRef(null),pageElement=useRef(null),textElement=useRef(null);
  const layerRef=useRef(null),pageData=useRef(null),dragRef=useRef(null),renderGate=useRef(Promise.resolve());
  const [ready,setReady]=useState(0),[width,setWidth]=useState(600),[zoom,setZoom]=useState(1);
  const [viewport,setViewport]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [tool,setTool]=useState('text'),[selection,setSelection]=useState(null),[drag,setDrag]=useState(null),[menu,setMenu]=useState(null);
  useEffect(()=>{setSelection(null);setMenu(null);},[annotations.length]);
  useEffect(()=>{container.current?.scrollTo({top:0,left:0});},[pageNumber]);
  useEffect(()=>{
    const observer=new ResizeObserver(([entry])=>setWidth(Math.max(220,entry.contentRect.width-44)));
    if(container.current)observer.observe(container.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    let alive=true;setError('');setLoading(true);setReady(0);setViewport(null);
    const task=getDocument({url:`/api/documents/${documentId}/pdf`,withCredentials:true,isEvalSupported:false,disableRange:true,disableStream:true});
    task.promise.then(pdf=>{if(alive){pdfRef.current=pdf;setReady(pdf.numPages);}}).catch(e=>{if(alive){console.error('No se pudo abrir el PDF:',e.message);setLoading(false);setError('No se pudo abrir el PDF. Recarga el documento.');}});
    return()=>{alive=false;pdfRef.current=null;task.destroy();};
  },[documentId]);
  useEffect(()=>{
    if(!ready)return;
    let alive=true,rendering=null,layer=null;
    setLoading(true);setError('');setSelection(null);setDrag(null);setMenu(null);pageData.current=null;
    // Finish cancellation before another render uses this same canvas.
    const operation=renderGate.current.catch(()=>{}).then(async()=>{
      if(!alive)return;
      const pdf=pdfRef.current,page=await pdf.getPage(Math.min(Math.max(1,pageNumber),pdf.numPages));if(!alive)return;
      const base=page.getViewport({scale:1}),v=page.getViewport({scale:width/base.width*zoom});
      const ratio=Math.min(window.devicePixelRatio||1,2),target=canvas.current;
      target.width=Math.round(v.width*ratio);target.height=Math.round(v.height*ratio);
      target.style.width=`${v.width}px`;target.style.height=`${v.height}px`;setViewport(v);
      rendering=page.render({canvas:target,canvasContext:target.getContext('2d'),viewport:v,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});
      await rendering.promise;if(!alive)return;
      if(editing){
        const content=await page.getTextContent();if(!alive)return;
        textElement.current.replaceChildren();
        layer=new TextLayer({textContentSource:content,container:textElement.current,viewport:v});
        await layer.render();if(!alive)return;
        layer.textDivs.forEach((div,i)=>{div.dataset.pdfIndex=String(i);});
        layerRef.current=layer;pageData.current=pageText(content);
      }
      setLoading(false);
    });
    renderGate.current=operation;
    operation.catch(e=>{if(alive&&!['RenderingCancelledException','AbortException'].includes(e.name)){setLoading(false);setError('No se pudo representar esta página. Prueba a recargarla.');}});
    return()=>{alive=false;rendering?.cancel();layer?.cancel();layerRef.current=null;};
  },[ready,pageNumber,width,zoom,editing]);
  const toStyle=rect=>{
    const [a,b]=viewport.convertToViewportPoint(rect[0],rect[1]),[c,d]=viewport.convertToViewportPoint(rect[2],rect[3]);
    return {left:Math.min(a,c),top:Math.min(b,d),width:Math.abs(c-a),height:Math.abs(d-b)};
  };
  const pageFindings=viewport&&!loading?findings.filter(f=>f.page===pageNumber).map(f=>{const b=result?.blocks.find(b=>b.id===f.block_id);return {finding:f,boxes:(b?.segments||[]).filter(s=>s.start<f.end&&s.end>f.start).map(s=>toStyle(s.box))};}).filter(f=>f.boxes.length):[];
  const block=result?.blocks.find(b=>b.id===finding?.block_id);
  const boxes=viewport&&finding?.page===pageNumber&&block?block.segments.filter(s=>s.start<finding.end&&s.end>finding.start).map(s=>toStyle(s.box)):[];
  useEffect(()=>{if(!loading&&boxes.length)container.current?.scrollTo({top:Math.max(0,boxes[0].top-100),behavior:'smooth'});},[loading,finding?.id]);
  useEffect(()=>{if(!loading&&viewport&&selectedAnnotation?.page===pageNumber){const box=toStyle(selectedAnnotation.anchor.rects[0]);container.current?.scrollTo({top:Math.max(0,box.top-100),behavior:'smooth'});}},[loading,selectedAnnotation?.id]);
  function localPoint(e){const r=pageElement.current.getBoundingClientRect();return [Math.max(0,Math.min(viewport.width,e.clientX-r.left)),Math.max(0,Math.min(viewport.height,e.clientY-r.top))];}
  function capture(rects){
    const boxes=rects.map(toStyle),left=Math.max(0,Math.min(...boxes.map(b=>b.left))),top=Math.max(0,Math.min(...boxes.map(b=>b.top)));
    const w=Math.min(viewport.width-left,Math.max(...boxes.map(b=>b.left+b.width))-left),h=Math.min(viewport.height-top,Math.max(...boxes.map(b=>b.top+b.height))-top);
    if(w<1||h<1)return null;
    const ratio=canvas.current.width/viewport.width,scale=Math.min(ratio,1600/Math.max(w,h));
    const crop=window.document.createElement('canvas');crop.width=Math.max(1,Math.round(w*scale));crop.height=Math.max(1,Math.round(h*scale));
    crop.getContext('2d').drawImage(canvas.current,left*ratio,top*ratio,w*ratio,h*ratio,0,0,crop.width,crop.height);
    return crop.toDataURL('image/png');
  }
  function payload(kind,rects,extra={}){return {kind,page:pageNumber,rects,source_pdf_sha256:sourceHash,preview:capture(rects),...extra};}
  function selectedText(){
    if(loading||!layerRef.current||!pageData.current)return null;
    const selected=window.getSelection();if(!selected?.rangeCount||selected.isCollapsed)return null;
    const range=selected.getRangeAt(0);
    if(!textElement.current.contains(range.startContainer)||!textElement.current.contains(range.endContainer))return null;
    const spans=layerRef.current.textDivs.filter(div=>div.textContent&&range.intersectsNode(div));if(!spans.length)return null;
    const first=spans[0],last=spans.at(-1),data=pageData.current;
    function offset(div,node,n,end){
      if(!div.contains(node))return end?[...div.textContent.normalize('NFC')].length:0;
      const before=window.document.createRange();before.selectNodeContents(div);before.setEnd(node,n);return [...before.toString().normalize('NFC')].length;
    }
    let start=data.items[Number(first.dataset.pdfIndex)].start+offset(first,range.startContainer,range.startOffset,false);
    let end=data.items[Number(last.dataset.pdfIndex)].start+offset(last,range.endContainer,range.endOffset,true);
    const chars=[...data.text];while(start<end&&/\s/u.test(chars[start]))start++;while(end>start&&/\s/u.test(chars[end-1]))end--;
    if(end<=start)return null;
    if(end-start>12000){setError('Selecciona un fragmento de menos de 12.000 caracteres.');return null;}
    const pageRect=pageElement.current.getBoundingClientRect(),seen=new Set();
    const rects=[...range.getClientRects()].filter(r=>r.width>1&&r.height>1).map(r=>{
      const a=[Math.max(0,r.left-pageRect.left),Math.max(0,r.top-pageRect.top)],b=[Math.min(viewport.width,r.right-pageRect.left),Math.min(viewport.height,r.bottom-pageRect.top)];
      return orderedRect([...viewport.convertToPdfPoint(...a),...viewport.convertToPdfPoint(...b)]);
    }).filter(r=>{const key=r.map(n=>n.toFixed(2)).join(',');if(seen.has(key))return false;seen.add(key);return true;});
    if(!rects.length||rects.length>100)return null;
    return payload('text',rects,{start,end,quote:chars.slice(start,end).join('')});
  }
  function beginNote(draft=selection){if(draft){setMenu(null);onDraft(draft);}}
  function contextMenu(e){
    if(!editing||loading)return;e.preventDefault();const draft=selectedText()||(tool==='region'?selection:null);
    if(draft){setSelection(draft);beginNote(draft);}else setMenu(localPoint(e));
  }
  function endArea(e){
    if(!dragRef.current)return;const from=dragRef.current,to=localPoint(e);dragRef.current=null;setDrag(null);
    if(Math.abs(to[0]-from[0])<6||Math.abs(to[1]-from[1])<6)return;
    const rect=orderedRect([...viewport.convertToPdfPoint(...from),...viewport.convertToPdfPoint(...to)]);
    const draft=payload('region',[rect]);setSelection(draft);beginNote(draft);
  }
  return <section className={`pdf-viewer ${editing?'pdf-editing':''}`} aria-label="Documento original">
    <div className="viewer-toolbar"><span className="small muted">Documento original</span><div className="zoom-controls"><button aria-label="Reducir zoom" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}>−</button><span>{Math.round(zoom*100)} %</span><button aria-label="Ampliar zoom" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}>+</button></div></div>
    {editing&&<div className="annotation-tools" role="toolbar" aria-label="Herramientas de edición">
      <button aria-pressed={tool==='text'} onClick={()=>{setTool('text');setMenu(null);setSelection(null);}}>Seleccionar texto</button>
      <button aria-pressed={tool==='region'} onClick={()=>{setTool('region');setMenu(null);setSelection(null);window.getSelection()?.removeAllRanges();}}>Marcar zona / infografía</button>
      <button disabled={!selection||loading} onMouseDown={e=>e.preventDefault()} onClick={()=>beginNote()}>Añadir nota a la selección</button>
    </div>}
    <div className="pdf-stage"><div ref={container} className="pdf-scroll">
      {error&&<p className="error-message" role="alert">{error}</p>}{loading&&<span className="pdf-loading" role="status">Abriendo página…</span>}
      <div ref={pageElement} className="pdf-page" style={viewport?{width:viewport.width,height:viewport.height,'--total-scale-factor':viewport.scale,'--scale-factor':viewport.scale}:undefined} onMouseUp={()=>{if(editing&&tool==='text')setSelection(selectedText());}} onContextMenu={contextMenu}>
        <canvas ref={canvas} aria-label={`Vista de la página ${pageNumber}`}/>
        {editing&&<div ref={textElement} className="textLayer" style={{pointerEvents:tool==='text'&&!loading?'auto':'none'}}/>}
        {pageFindings.map(({finding:f,boxes:marks},i)=><React.Fragment key={f.id}>{marks.map((box,j)=><span key={j} className={`automatic-highlight ${f.id===finding?.id?'selected':''}`} style={box} aria-hidden="true"/>)}<button className="automatic-pin" style={{left:Math.min(viewport.width-25,marks[0].left+marks[0].width-12),top:Math.max(0,marks[0].top-16)}} aria-label={`Abrir sugerencia ${i+1}: ${f.phrase.slice(0,60)}`} onClick={()=>onSelectFinding?.(f)}>S{i+1}</button></React.Fragment>)}
        {!findings.length&&boxes.map((box,i)=><span key={i} className="pdf-highlight" style={box} aria-hidden="true"/>)}
        {editing&&viewport&&!loading&&annotations.filter(a=>a.page===pageNumber).map((a,i)=><React.Fragment key={a.id}>
          {a.anchor.rects.map((rect,j)=><span key={j} className={`annotation-highlight ${a.id===selectedAnnotation?.id?'selected':''} ${a.status==='resolved'?'resolved':''}`} style={toStyle(rect)}/>)}
          <button className="annotation-pin" style={{left:Math.max(0,toStyle(a.anchor.rects[0]).left-12),top:Math.max(0,toStyle(a.anchor.rects[0]).top-16)}} aria-label={`Abrir nota ${i+1}: ${a.note.slice(0,60)}`} onClick={()=>onSelectAnnotation(a)}>{i+1}</button>
        </React.Fragment>)}
        {editing&&tool==='region'&&!loading&&<div className="area-selector" aria-label="Arrastra para marcar una zona del PDF" onPointerDown={e=>{if(e.button!==0)return;setMenu(null);dragRef.current=localPoint(e);setDrag([...dragRef.current,...dragRef.current]);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(dragRef.current)setDrag([...dragRef.current,...localPoint(e)]);}} onPointerUp={endArea} onPointerCancel={()=>{dragRef.current=null;setDrag(null);}}/>}
        {drag&&<span className="area-draft" style={{left:Math.min(drag[0],drag[2]),top:Math.min(drag[1],drag[3]),width:Math.abs(drag[2]-drag[0]),height:Math.abs(drag[3]-drag[1])}}/>}
        {menu&&<div className="pdf-context-menu" style={{left:Math.max(0,Math.min(menu[0],viewport.width-200)),top:menu[1]}}><button onClick={()=>{setTool('region');setMenu(null);}}>Marcar una zona</button><button onClick={()=>{setMenu(null);beginNote(payload('region',[orderedRect([...viewport.convertToPdfPoint(0,0),...viewport.convertToPdfPoint(viewport.width,viewport.height)])]));}}>Anotar la página completa</button><button onClick={()=>setMenu(null)}>Cerrar</button></div>}
      </div>
    </div>
    <nav className="pdf-navigation page-controls" aria-label="Navegación de páginas del PDF">
      <button aria-label="Página anterior" title="Página anterior" disabled={!ready||pageNumber<=1} onClick={()=>setPageNumber(pageNumber-1)}>‹</button>
      <label>Página <input aria-label="Número de página" type="number" min="1" max={ready||1} disabled={!ready} value={pageNumber} onChange={e=>setPageNumber(Math.min(Math.max(Number(e.target.value)||1,1),ready||1))}/></label><span>de {ready||'…'}</span>
      <button aria-label="Página siguiente" title="Página siguiente" disabled={!ready||pageNumber>=ready} onClick={()=>setPageNumber(pageNumber+1)}>›</button>
    </nav></div>
    <div className="viewer-note">{editing?'Selecciona una frase y pulsa «Añadir nota» o el botón derecho. Para una infografía, activa «Marcar zona» y arrastra sobre ella. El PDF original se conserva.':'El resaltado abarca los fragmentos del PDF que contienen la coincidencia.'}</div>
  </section>;
}
