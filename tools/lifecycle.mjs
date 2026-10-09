import { instanceMembers } from './processes.mjs';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, rm, open } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = resolve(process.env.HUMANIZADOR_DATA_DIR || resolve(root,'data'));
const runtime = resolve(data,'runtime'), statePath=resolve(runtime,'instance.json'), lockPath=resolve(runtime,'command.lock');
const runner=resolve(root,'tools/run.mjs');
const alive = pid => { try { process.kill(pid,0); return true; } catch { return false; } };
async function readState(){try{return JSON.parse(await readFile(statePath,'utf8'));}catch{return null;}}
function owned(s){return Boolean(s && alive(s.pid) && members(s).includes(s.pid));}
function browser(url){
  console.log(url);
  if(process.env.HUMANIZADOR_NO_BROWSER==='1')return;
  const command=process.platform==='darwin'?'open':process.platform==='win32'?'explorer.exe':'xdg-open';
  const child=spawn(command,[url],{stdio:'ignore',detached:true});child.on('error',()=>console.error('Abre en tu navegador la dirección anterior.'));child.unref();
}
function members(s){return instanceMembers(s,root);}
async function stop(){
  const s=await readState();
  if(!s){console.log('Humanizador ya está parado.');return;}
  const parent=owned(s),remaining=members(s);
  if(!parent && alive(s.pid))throw new Error('El PID registrado ya no corresponde a Humanizador. No se ha detenido ningún proceso ajeno.');
  // A supervisor killed abruptly may have left children behind. Each signal is
  // restricted to a process carrying this instance token and a known script.
  if(process.platform==='win32' && remaining.length){
    // Windows terminates processes without delivering POSIX signal handlers.
    // Fence every DB claim first; only terminate processes scoped to this token.
    const {openDatabase}=await import('../server/db.mjs');
    const {pauseJobs}=await import('../server/pause.mjs');
    const db=openDatabase(resolve(data,'humanizador.sqlite'));
    try {pauseJobs(db);} finally {db.close();}
    for(const pid of remaining.filter(pid=>pid!==s.pid)) {try{process.kill(pid);}catch(e){if(e.code!=='ESRCH')throw e;}}
    for(const pid of members(s)) {try{process.kill(pid);}catch(e){if(e.code!=='ESRCH')throw e;}}
    const finalDb=openDatabase(resolve(data,'humanizador.sqlite'));
    try {pauseJobs(finalDb);} finally {finalDb.close();}
  }
  for(const pid of (process.platform==='win32'?[]:parent?[s.pid]:remaining)){try{process.kill(pid,'SIGTERM');}catch(e){if(e.code!=='ESRCH')throw e;}}
  const deadline=Date.now()+15000;
  while(Date.now()<deadline && members(s).length)await delay(process.platform==='win32'?500:100);
  if(members(s).length)throw new Error('La instancia no ha confirmado la parada segura. Revisa el registro antes de volver a arrancar.');
  await rm(statePath,{force:true});console.log('Humanizador parado. Las revisiones en curso quedan pendientes de tu decisión.');
}
async function available(port){return new Promise((resolve,reject)=>{const s=createServer();s.once('error',e=>e.code==='EADDRINUSE'?resolve(false):reject(e));s.listen(port,'127.0.0.1',()=>s.close(()=>resolve(true)));});}
async function start(){
  await stop();
  if(Number(process.versions.node.split('.')[0])<24)throw new Error('Se necesita Node.js 24 o posterior.');
  if(process.env.HUMANIZADOR_BIND && process.env.HUMANIZADOR_BIND!=='127.0.0.1')throw new Error('Estos scripts abren una instancia local en 127.0.0.1. Para un servidor remoto utiliza la configuración de despliegue documentada.');
  const preferred=Number(process.env.PORT||8787);
  if(!Number.isInteger(preferred)||preferred<1024||preferred>65435)throw new Error('PORT debe estar entre 1024 y 65435.');
  let port=preferred;
  while(port<preferred+100 && !await available(port))port++;
  if(port===preferred+100)throw new Error('Los 100 puertos candidatos están ocupados. Configura otro PORT.');
  if(process.env.HUMANIZADOR_SKIP_BUILD!=='1'){
    console.log('Preparando la interfaz…');
    await new Promise((res,rej)=>{const child=spawn(process.execPath,[resolve(root,'node_modules/vite/bin/vite.js'),'build'],{cwd:root,stdio:['ignore',log.fd,log.fd]});child.on('error',rej);child.on('exit',code=>code===0?res():rej(new Error('No se pudo preparar la interfaz. Comprueba las dependencias con npm ci y consulta el registro.')));});
  }
  const token=randomUUID();
  const message=port===preferred?'':`El puerto ${preferred} estaba ocupado. Humanizador se ha abierto en el puerto ${port}.`;
  const url=`http://127.0.0.1:${port}/`;
  const child=spawn(process.execPath,[runner,`--instance=${token}`],{cwd:root,detached:true,stdio:['ignore',log.fd,log.fd],env:{...process.env,PORT:String(port),HUMANIZADOR_DATA_DIR:data,HUMANIZADOR_PUBLIC_URL:url,HUMANIZADOR_START_NOTICE:message,HUMANIZADOR_INSTANCE:token}});
  child.on('error',()=>{});child.unref();
  await writeFile(statePath,JSON.stringify({root,pid:child.pid,token,port,url,started_at:new Date().toISOString()}),{mode:0o600});
  for(let i=0;i<100;i++){
    if(!alive(child.pid))throw new Error('El servidor terminó durante el arranque. Consulta el registro para ver la causa.');
    try {const r=await fetch(url+'api/session',{signal:AbortSignal.timeout(500)});if(r.ok && (await r.json()).instance===token){browser(url);return;}}catch{}
    await delay(100);
  }
  await stop();throw new Error('El servidor no respondió a tiempo; se ha detenido de forma segura. Consulta el registro.');
}
const escape = text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let locked=false,log;
try{
  await mkdir(runtime,{recursive:true,mode:0o700});
  try{await mkdir(lockPath);locked=true;}catch{
    const lock=JSON.parse(await readFile(resolve(lockPath,'owner.json'),'utf8').catch(()=>'{}'));
    if(!lock.pid||alive(lock.pid))throw new Error('Ya hay otro arranque o parada en curso. Espera a que termine.');
    await rm(lockPath,{recursive:true,force:true});await mkdir(lockPath);locked=true;
  }
  await writeFile(resolve(lockPath,'owner.json'),JSON.stringify({pid:process.pid}));
  log=await open(resolve(runtime,'server.log'),'a',0o600);
  if(process.argv[2]==='stop')await stop();else if(process.argv[2]==='start')await start();else throw new Error('Uso: node tools/lifecycle.mjs start|stop');
}catch(error){
  let path=resolve(runtime,`problema-${process.pid}.html`);
  try{await mkdir(runtime,{recursive:true,mode:0o700});}catch{path=resolve(tmpdir(),`humanizador-problema-${randomUUID()}.html`);}
  const tail=(await readFile(resolve(runtime,'server.log'),'utf8').catch(()=>'' )).slice(-6000);
  await writeFile(path,`<!doctype html><meta charset="utf-8"><title>Humanizador · problema de arranque</title><style>body{max-width:900px;margin:4rem auto;font:18px system-ui;padding:1rem}pre{white-space:pre-wrap;background:#f3f4f7;padding:1rem}</style><h1>No se pudo completar ${process.argv[2]==='stop'?'la parada':'el arranque'}</h1><p>${escape(error.message)}</p><p>Tus documentos se conservan. Registro: ${escape(resolve(runtime,'server.log'))}</p><details><summary>Ver registro técnico</summary><pre>${escape(tail)}</pre></details>`,{mode:0o600});
  console.error(error.message);browser(pathToFileURL(path).href);process.exitCode=1;
}finally{await log?.close();if(locked)await rm(lockPath,{recursive:true,force:true});}
