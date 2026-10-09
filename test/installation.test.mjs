import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:http';
import {readSettings,saveSettings,validModel} from '../server/local-settings.mjs';
import {localConfig,modelStatus} from '../server/ollama.mjs';
import {configureSettings,color,lightModel,npmCli} from '../tools/install.mjs';
import {instanceMembers,parseProcesses} from '../tools/processes.mjs';

test('preferences persist independently of documents and validate local model names',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'humanizador config '));
 try{assert.deepEqual(readSettings(dir),{});const s={ollama_enabled:true,ollama_model:'example:4b'};saveSettings(s,dir);assert.deepEqual(readSettings(dir),s);assert.equal(localConfig(s).model,s.ollama_model);
 assert.throws(()=>saveSettings({...s,ollama_model:'x:cloud'},dir));assert.deepEqual(readSettings(dir),s);
 for(const name of ['--help','x;rm','x\nrun','x:cloud','',null])assert.equal(validModel(name),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('environment overrides saved preferences',()=>{
 const before={...process.env};try{process.env.HUMANIZADOR_OLLAMA_MODEL='override:4b';process.env.HUMANIZADOR_OLLAMA_ENABLED='0';assert.deepEqual(localConfig({ollama_enabled:true,ollama_model:'stored:4b'}),{enabled:false,url:'http://127.0.0.1:11434',model:'override:4b'});}finally{process.env=before;}
});
test('diagnostics distinguish disabled, missing, invalid, remote, ready and unreachable without inference',async()=>{
 let tags={models:[]},detail={},requests=[];
 const server=createServer((req,res)=>{requests.push(req.url);res.setHeader('content-type','application/json');res.end(JSON.stringify(req.url==='/api/tags'?tags:detail));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const config={enabled:true,model:'test:4b',url:`http://127.0.0.1:${server.address().port}`};
 try {
 assert.equal((await modelStatus({...config,enabled:false})).status,'disabled');assert.equal(requests.length,0);
 assert.equal((await modelStatus(config)).status,'missing_model');tags={};assert.equal((await modelStatus(config)).status,'invalid_response');
 tags={models:[{name:'test:4b',size:123,digest:'hash'}]};detail={remote_host:'example.test'};assert.equal((await modelStatus(config)).status,'remote_model');
 detail={};const ready=await modelStatus(config);assert.equal(ready.status,'ready');assert.equal(ready.size_bytes,123);assert.deepEqual(ready.installed_models,['test:4b']);
 assert.ok(requests.every(p=>['/api/tags','/api/show'].includes(p)));
 }finally{await new Promise(r=>server.close(r));}
 assert.equal((await modelStatus(config)).status,'unreachable');
});
function io(choices,{ready=true,download=false}={}) {
 const calls=[];return {calls,choose:async()=>choices.shift(),ask:async()=>'',say:()=>{},open:u=>calls.push(['open',u]),status:async c=>({status:ready?'ready':'unreachable',ready,installed_models:['installed:4b'],message:'No conecta',model:c.model}),confirm:async(q,defaultValue)=>{calls.push(['consent',defaultValue]);return download;},pull:async m=>calls.push(['pull',m])};
}
test('wizard defaults can stay offline, keep configuration, and fall back when Ollama is unavailable',async()=>{
 for(const [choices,current,expected] of [[['rules'],{},false],[['keep'],{ollama_enabled:true,ollama_model:'old:4b'},true],[['local','rules'],{},false]]){
 const deps=io(choices,{ready:false});const result=await configureSettings(current,deps);assert.equal(result.ollama_enabled,expected);assert.equal(deps.calls.length,0);
 }
});
test('model downloads require separate opt-in; installed models do not download',async()=>{
 const declined=io(['local','light']);assert.equal((await configureSettings({},declined)).ollama_enabled,false);assert.deepEqual(declined.calls,[['consent',false]]);
 const accepted=io(['local','light'],{download:true});assert.deepEqual(await configureSettings({},accepted),{ollama_enabled:true,ollama_model:lightModel});assert.deepEqual(accepted.calls,[['consent',false],['pull',lightModel]]);
 const installed=io(['local','installed:4b']);assert.equal((await configureSettings({},installed)).ollama_enabled,true);assert.equal(installed.calls.length,0);
 const remote=io(['local','installed:4b']);remote.status=async()=>({ready:false,status:'remote_model',installed_models:['installed:4b'],message:'Remoto rechazado'});await assert.rejects(configureSettings({},remote),/Remoto rechazado/);
});
test('process ownership requires exact instance token and a known script, including paths with spaces',()=>{
 const root=resolve(tmpdir(),'Humanizador with spaces'),state={root,token:'abc12345'};
 const script=resolve(root,'server/worker.mjs');
 const rows=[{pid:1,command:`node "${script}" --instance=abc12345`},{pid:2,command:`node ${script} --instance=abc12345`},{pid:3,command:`node "${script}" --instance=abc12345-extra`},{pid:4,command:`node "${script}.other" --instance=abc12345`},{pid:5,command:`node other.mjs --instance=abc12345`}];
 assert.deepEqual(instanceMembers(state,root,rows),[1,2]);assert.deepEqual(instanceMembers({...state,root:'elsewhere'},root,rows),[]);
 assert.deepEqual(parseProcesses('[{"ProcessId":4,"CommandLine":null}]','win32'),[{pid:4,command:''}]);assert.deepEqual(parseProcesses('  4 node something\n','darwin'),[{pid:4,command:'node something'}]);
 assert.equal(color('plain','31',{NO_COLOR:'',FORCE_COLOR:'1'},true),'plain');assert.match(npmCli(),/npm-cli\.js$/);
});
