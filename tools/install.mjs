import { accessSync, constants, existsSync, realpathSync } from 'node:fs';
import { mkdir, open, rm, statfs } from 'node:fs/promises';
import { dirname, resolve, delimiter, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { totalmem, platform, arch } from 'node:os';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { readSettings, saveSettings, validModel, defaultModel } from '../server/local-settings.mjs';
import { localConfig, modelStatus } from '../server/ollama.mjs';

export const lightModel='qwen3.5:4b';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function findExecutable(name, paths=(process.env.PATH||'').split(delimiter)) {
  const candidates=paths.map(p=>join(p,process.platform==='win32'?name+'.exe':name));
  if(name==='ollama') candidates.push('/Applications/Ollama.app/Contents/Resources/ollama',join(process.env.LOCALAPPDATA||'', 'Programs/Ollama/ollama.exe'));
  return candidates.find(p=>{try{accessSync(p,constants.X_OK);return true;}catch{return false;}});
}
export function npmCli() {
  const base=dirname(process.execPath);
  const candidates=[resolve(base,'node_modules/npm/bin/npm-cli.js'),resolve(base,'../lib/node_modules/npm/bin/npm-cli.js')];
  for(const p of (process.env.PATH||'').split(delimiter))try{candidates.push(realpathSync(join(p,'npm')));}catch{}
  const cli=candidates.find(p=>p.endsWith('npm-cli.js')&&existsSync(p));
  if(!cli)throw Error('No se encuentra npm. Reinstala Node.js con npm desde https://nodejs.org/en/download y abre una terminal nueva.');
  return cli;
}
export function run(command,args,options={}) {
  return new Promise((res,rej)=>{const p=spawn(command,args,{cwd:root,stdio:'inherit',shell:false,...options});p.on('error',rej);p.on('exit',(code,signal)=>code===0?res():rej(Error(`El comando terminó ${signal||'con código '+code}. Consulta el mensaje anterior.`)));});
}
export function openUrl(url) {
  const p=spawn(process.platform==='darwin'?'open':process.platform==='win32'?'explorer.exe':'xdg-open',[url],{stdio:'ignore',detached:true});
  p.on('error',()=>{});p.unref();
}
export function color(text,code,env=process.env,tty=process.stdout.isTTY) {
  return !('NO_COLOR' in env)&&(tty||env.FORCE_COLOR==='1')?`\x1b[${code}m${text}\x1b[0m`:text;
}
export function platformGuide(os=process.platform) {
  if(os==='darwin')return 'Mac: instala Ollama desde https://ollama.com/download/mac, arrástralo a Aplicaciones y ábrelo. macOS 14 o posterior; Apple Silicon usa GPU, Mac Intel usa CPU y puede ir despacio.';
  if(os==='win32')return 'Windows: instala Ollama desde https://ollama.com/download/windows y ábrelo. Windows 10 22H2 o posterior. Cierra y abre la terminal si no encuentra el comando ollama. La GPU depende del equipo y sus controladores.';
  return 'Linux: sigue https://docs.ollama.com/linux para instalar y arrancar Ollama. Comprueba sus requisitos y el servicio antes de continuar.';
}
// IO is explicit so the consent and fallback paths can be tested without downloading a model.
export async function configureSettings(current,io) {
  const mode=await io.choose('Revisión automática',[
    ...(current.ollama_model?[['keep','Conservar mi configuración actual']]:[]),
    ['rules','Solo reglas (no necesita Ollama)'],['local','Reglas y Ollama local']]);
  if(mode==='keep')return current;
  if(mode==='rules')return {ollama_enabled:false,ollama_model:current.ollama_model||defaultModel};
  const config={enabled:true,url:io.url||'http://127.0.0.1:11434',model:current.ollama_model||defaultModel};
  let status=await io.status(config);
  while(['unreachable','invalid_response'].includes(status.status)) {
    io.say(status.message);io.say(platformGuide());
    const action=await io.choose('Ollama todavía no está disponible',[
      ['rules','Continuar con reglas; podré configurarlo después'],['retry','Ya lo he instalado y abierto: comprobar otra vez'],['web','Abrir la descarga oficial']]);
    if(action==='rules')return {ollama_enabled:false,ollama_model:config.model};
    if(action==='web')io.open('https://ollama.com/download');
    else status=await io.status(config);
  }
  const models=status.installed_models||[];
  io.say('Un modelo pequeño consume menos recursos, pero no hemos demostrado que conserve la calidad editorial de otro mayor. El contexto también ocupa memoria.');
  const selection=await io.choose('Modelo local',[
    ...models.map(m=>[m,`Usar el modelo instalado ${m}`]),
    ['light',`Descargar ${lightModel} (varios GB; opción ligera sin evaluación editorial comparativa)`],
    ['custom','Escribir otra etiqueta local'],['rules','Usar solo reglas por ahora']]);
  if(selection==='rules')return {ollama_enabled:false,ollama_model:config.model};
  const model=selection==='light'?lightModel:selection==='custom'?(await io.ask('Etiqueta exacta del modelo: ')).trim():selection;
  if(!validModel(model))throw Error('Etiqueta no válida. Usa un nombre local de Ollama, sin espacios ni etiquetas cloud.');
  config.model=model;
  if(!models.includes(model)) {
    io.say(`La descarga ${model} ocupa disco y requiere Internet. Revisa su ficha en https://ollama.com/library antes de seguir. El modelo avanzado qwen3.6:27b-q8_0 ronda los 30 GB de descarga; no es la opción predeterminada del instalador.`);
    if(!await io.confirm(`¿Descargar ahora ${model}?`,false)) {
      io.say('No se ha descargado nada. Quedan habilitadas las reglas; puedes repetir la configuración más adelante.');
      return {ollama_enabled:false,ollama_model:model};
    }
    await io.pull(model);
  }
  status=await io.status(config);
  if(!status.ready)throw Error(status.message+' No se ha guardado una configuración nueva.');
  io.say('Modelo local disponible. Comprobarlo no ha iniciado inferencia.');
  return {ollama_enabled:true,ollama_model:model};
}

async function main() {
  process.chdir(root);
  const args=process.argv.slice(2);
  if(args.some(a=>!['--check','--configure'].includes(a)))throw Error('Uso: instalar [--check | --configure]');
  if(args.length>1)throw Error('Elige --check o --configure, no ambas.');
  const say=text=>console.log(text), step=text=>say('\n'+color(text,'1;36'));
  step('Humanizador · instalación guiada');
  say('Construido con Codex, bajo la dirección de Roberto Canales Mora. Requiere revisión humana; no necesitas una cuenta de Codex para usarlo.');
  say(`Equipo: ${platform()} ${arch()} · Node ${process.versions.node} · memoria total ${(totalmem()/1024**3).toFixed(1)} GB (no equivale a memoria libre).`);
  if(Number(process.versions.node.split('.')[0])<24)throw Error('Se necesita Node.js 24 o posterior: https://nodejs.org/en/download');
  if(args.includes('--check')) {
    const config=localConfig(), status=await modelStatus(config);
    say(`npm: ${npmCli()}\nOllama CLI: ${findExecutable('ollama')?'disponible':'no encontrado; el servicio puede seguir instalado'}\nModelo: ${config.model}\nEstado: ${status.status} · ${status.message}`);
    if(!status.ready)say(platformGuide());
    say('Diagnóstico terminado. No se han instalado paquetes, descargado modelos ni iniciado análisis.');return;
  }
  if(!process.stdin.isTTY)throw Error('Abre una terminal interactiva para responder a las preguntas. Para un diagnóstico sin cambios usa --check.');
  const rl=createInterface({input:process.stdin,output:process.stdout});
  const questions=new AbortController();
  rl.on('SIGINT',()=>{questions.abort();rl.close();});
  let closed=false;rl.on('close',()=>{closed=true;questions.abort();});
  const ask=async q=>{if(closed)throw Error('Instalación cancelada.');return rl.question(q,{signal:questions.signal});};
  const confirm=async(q,yes=false)=>{for(;;){const a=(await ask(q+(yes?' [S/n] ':' [s/N] '))).trim().toLowerCase();if(!a)return yes;if(['s','si','sí','y','yes'].includes(a))return true;if(['n','no'].includes(a))return false;say('Responde s o n.');}};
  const choose=async(q,options)=>{say('\n'+q);options.forEach(([,label],i)=>say(`  ${i+1}. ${label}`));for(;;){const a=(await ask('Elige una opción [1]: ')).trim()||'1';const n=Number(a);if(Number.isInteger(n)&&n>=1&&n<=options.length)return options[n-1][0];say('Escribe el número de una opción.');}};
  const data=resolve(process.env.HUMANIZADOR_DATA_DIR||'data');
  let lock;
  try {
    say(`Carpeta de la aplicación: ${root}\nDatos y preferencias: ${data}`);
    say(args.includes('--configure')?'Se revisarán únicamente las preferencias de Ollama.':'Se instalarán las dependencias con npm ci, se compilará la interfaz y se guardará tu elección de Ollama. Los PDF, notas y decisiones se conservan.');
    if(!await confirm('¿Continuar?',true))return;
    await mkdir(data,{recursive:true,mode:0o700});
    try{lock=await open(resolve(data,'installer.lock'),'wx',0o600);await lock.writeFile(String(process.pid));}
    catch(e){if(e.code==='EEXIST')throw Error('Hay un instalador abierto o interrumpido. Cierra el otro instalador; si ya no existe, elimina únicamente data/installer.lock y repite.');throw e;}
    let current;
    try{current=readSettings(data);}catch(e){say(color(e.message,'33'));if(!await confirm('¿Sustituir la configuración ilegible? Los documentos se conservan.',false))return;current={};}
    if(Object.keys(process.env).some(k=>k.startsWith('HUMANIZADOR_OLLAMA_')))say(color('Hay variables HUMANIZADOR_OLLAMA_* en esta terminal. Tienen prioridad sobre las preferencias guardadas. Revísalas si el resultado no coincide con tu elección.','33'));
    if(!args.includes('--configure')) {
      step('1/3 · Preparar la aplicación');
      const statePath=resolve(data,'runtime/instance.json');
      if(existsSync(statePath)) {
        if(!await confirm('Hay una instancia registrada. ¿Pararla de forma segura antes de instalar?',false))throw Error('Instalación cancelada. Para actualizar, para primero Humanizador.');
        await run(process.execPath,[resolve(root,'tools/lifecycle.mjs'),'stop']);
      }
      const disk=await statfs(root);say(`Espacio disponible: ${(Number(disk.bavail)*Number(disk.bsize)/1024**3).toFixed(1)} GB en esta unidad. Los modelos pueden guardarse en otra.`);
      const npm=npmCli();say('Instalando las versiones fijadas en package-lock.json…');await run(process.execPath,[npm,'ci']);
      say('Compilando la interfaz…');await run(process.execPath,[npm,'run','build']);
    }
    step('2/3 · Elegir cómo revisar');
    const url=localConfig(current).url;
    const settings=await configureSettings(current,{ask,confirm,choose,say,url,status:modelStatus,open:openUrl,pull:async model=>{
      const cli=findExecutable('ollama');if(!cli)throw Error('Ollama responde, pero no se encuentra su comando. Abre una terminal nueva tras instalarlo y repite la configuración.');
      await run(cli,['pull',model]);
    }});
    saveSettings(settings,data);
    step('3/3 · Preparado');
    say(color(settings.ollama_enabled?`Preferencia guardada: Ollama local con ${settings.ollama_model}.`:'Preferencia guardada: reglas, sin Ollama.','32'));
    say('Puedes repetir el instalador con --configure para cambiar de modelo; con --check para diagnosticar sin cambios.');
    say(process.platform==='win32'?'Arrancar: .\\arrancar.ps1 · Parar: .\\parar.ps1':'Arrancar: ./arrancar.sh · Parar: ./parar.sh');
    if(await confirm('¿Arrancar Humanizador y abrir el navegador?',true))await run(process.execPath,[resolve(root,'tools/lifecycle.mjs'),'start']);
  } finally {rl.close();if(lock){await lock.close();await rm(resolve(data,'installer.lock'),{force:true});}}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main().catch(e=>{console.error(color('\nNo se ha completado la instalación: '+e.message,'31'));console.error('Guía: https://rcanalescoder.github.io/Humanizador/#empezar');process.exitCode=1;});
