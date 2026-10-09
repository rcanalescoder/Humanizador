import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Inspect staged blobs, not merely ignored names or the working tree.
const files = execFileSync('git', ['ls-files', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
assert.ok(files.length, 'Añade al índice Git únicamente los archivos revisados antes de auditar.');
const read = file => execFileSync('git', ['show', `:${file}`], {maxBuffer:8*1024*1024});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const shots = JSON.parse(read('docs/capturas-publicas.json')).assets;
const allowedImages = new Map(shots.map(a=>[a.path,a]));
const allowedRoot = new Set(['.gitignore','.dockerignore','AGENTS.md','LICENSE','README.md','Dockerfile','arrancar.sh','parar.sh','instalar.sh','instalar.ps1','arrancar.ps1','parar.ps1','package.json','package-lock.json','index.html','vite.config.js']);
const allowedDirectories = new Set(['src','core','server','rules','tools','test','evaluation','deploy','docs','manual','.github']);
let totalBytes=0;
for(const file of files){
  assert.ok(allowedRoot.has(file)||allowedDirectories.has(file.split('/')[0]), `Ruta no aprobada: ${file}`);
  assert.ok(!/(^|\/)(?:data|privado|node_modules|dist|test-results|privada|intermedios|backups|\.env)(\/|$|\.)/i.test(file), `Material privado: ${file}`);
  assert.ok(!/\.(?:pdf|sqlite\w*|db|pem|key|zip|gz|log)(?:-|$)/i.test(file), `Formato privado o empaquetado: ${file}`);
  assert.ok(!/edicion-pdf-para-ia/i.test(file), `Exportación privada: ${file}`);
  const mode=execFileSync('git',['ls-files','-s','--',file],{encoding:'utf8'}).slice(0,6);
  assert.notEqual(mode,'120000',`Enlace simbólico no permitido: ${file}`);
  const bytes=read(file);totalBytes+=bytes.length;
  assert.ok(bytes.length<5_000_000,`Archivo excesivo para esta entrega: ${file}`);
  assert.ok(!bytes.subarray(0,16).toString().startsWith('%PDF-')&&!bytes.subarray(0,16).toString().startsWith('SQLite format 3'),`Datos binarios privados: ${file}`);
  if(/\.(png|jpe?g|webp|gif)$/i.test(file)){
    const asset=allowedImages.get(file);assert.ok(asset,`Captura no autorizada: ${file}`);
    assert.equal(sha(bytes),asset.sha256,`Captura modificada: ${file}`);assert.equal(bytes.length,asset.bytes);continue;
  }
  const text=bytes.toString('utf8');
  assert.ok(!/\/Users\/[^\s/]+\/|\/home\/[^\s/]+\//.test(text),`Ruta personal en ${file}`);
  assert.ok(!/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9]{40,}/.test(text),`Posible credencial en ${file}`);
  // Actual export payloads must never be committed; schema strings in code are fine.
  if(file.endsWith('.json')){
    const payload=JSON.parse(text);
    assert.ok(!String(payload.format||payload.schema||'').startsWith('humanizador.pdf-edition'),`Exportación editorial en ${file}`);
    assert.ok(!(payload.document?.original_name&&payload.annotations),`Registro de revisión en ${file}`);
  }
  if(file.startsWith('manual/'))assert.ok(/\.(html|css|md)$/.test(file),`Recurso de manual no admitido: ${file}`);
}
for(const asset of shots)assert.ok(files.includes(asset.path),`Falta la captura ${asset.path}`);
for(const file of files.filter(f=>f.startsWith('manual/')&&f.endsWith('.html'))){
  const html=read(file).toString();
  assert.equal((html.match(/<h1\b/g)||[]).length,1,`H1 en ${file}`);
  assert.ok(!/<(?:script|iframe)\b|\b(?:src|srcset)=["']https?:\/\//i.test(html),`Contenido activo o carga externa en ${file}`);
  for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(/^(https?:|mailto:)/.test(url))continue;
    const [relative,anchor]=url.split('#');
    const destination=relative?path.posix.normalize(path.posix.join(path.posix.dirname(file),relative)):file;
    assert.ok(files.includes(destination),`Enlace roto ${url} en ${file}`);
    if(anchor)assert.ok(read(destination).toString().includes(`id="${anchor}"`),`Ancla rota ${url}`);
  }
}
console.log(`Publicación comprobada: ${files.length} archivos, ${(totalBytes/1024/1024).toFixed(2)} MiB, ${shots.length} capturas autorizadas; sin PDF, bases ni exportaciones. Manual y enlaces locales válidos.`);
