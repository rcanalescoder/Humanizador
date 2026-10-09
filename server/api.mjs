import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { openDatabase, event } from './db.mjs';
import { summarizeDocuments, projectStatistics } from './statistics.mjs';
import { hash, canonical, makePackage, applyPackage } from '../core/changes.mjs';
import { exportFindings } from '../core/findings-export.mjs';
import { rules, sources, activeRules } from '../core/rules.mjs';
import { evidence, coverage, catalogueValidation } from '../core/evidence.mjs';
import { annotationList, annotationNote, annotationImage, createAnchor, exportEdition } from './annotations.mjs';
import { diagnosticView } from './diagnostics.mjs';
import { archiveDocument, listRuns } from './revisions.mjs';
import { modelStatus } from './ollama.mjs';

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const utc = () => new Date().toISOString();
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function createApp(db = openDatabase(), options = {}) {
  const maxUploadMb = Number(options.maxUploadMb ?? process.env.HUMANIZADOR_MAX_UPLOAD_MB ?? 100);
  if (!Number.isInteger(maxUploadMb) || maxUploadMb < 1 || maxUploadMb > 500) throw new Error('HUMANIZADOR_MAX_UPLOAD_MB debe ser un entero entre 1 y 500.');
  const maxUpload = maxUploadMb * 1024 * 1024;
  const password = options.password ?? process.env.HUMANIZADOR_PASSWORD ?? '';
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const publicUrl = options.publicUrl ?? process.env.HUMANIZADOR_PUBLIC_URL ?? `http://127.0.0.1:${process.env.PORT || 8787}`;
  const origin = new URL(publicUrl).origin;
  if (production && (password.length < 12 || !origin.startsWith('https://'))) throw new Error('Producción requiere HUMANIZADOR_PASSWORD (12 caracteres) y HUMANIZADOR_PUBLIC_URL con HTTPS.');
  const origins = new Set([origin]);
  if (!production) {
    origins.add('http://127.0.0.1:8787'); origins.add('http://localhost:8787');
    if (process.env.HUMANIZADOR_DEV === '1' || options.dev) {
      origins.add('http://127.0.0.1:5187'); origins.add('http://localhost:5187');
    }
  }
  const passwordSalt = randomBytes(16);
  const passwordDigest = scryptSync(password, passwordSalt, 32);
  const secure = production;
  const staticRoot = resolve('dist');
  async function reviewProfile(mode = 'rules') {
    if (!['rules', 'local'].includes(mode)) fail(400, 'Modo de revisión no reconocido.');
    if (mode === 'rules') return { review_mode: 'rules' };
    const status = await modelStatus();
    if (!status.ready) fail(503, status.message);
    return { review_mode: 'local', local_model: { model: status.model, digest: status.digest } };
  }
  function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  }
  async function body(req, limit) {
    if (Number(req.headers['content-length']) > limit) fail(413, 'El fichero supera el límite permitido.');
    let size = 0; const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) fail(413, 'La petición supera el límite permitido.');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  async function json(req, limit = 64000) {
    if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'Se esperaba JSON.');
    try { return JSON.parse((await body(req, limit)).toString('utf8')); }
    catch (e) { if (e instanceof HttpError) throw e; fail(400, 'JSON no válido.'); }
  }
  function authenticated(req) {
    if (!password) return !production;
    const token = /(?:^|;\s*)humanizador_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    if (!token) return false;
    return Boolean(db.prepare('SELECT token_hash FROM sessions WHERE token_hash=? AND expires>?').get(hash(token), Date.now()));
  }
  function document(id) {
    const d = db.prepare('SELECT id,name,project_id,size_bytes,started_at_ms,finished_at_ms,processing_ms,sha256,created_at,profile,status,progress,total,error,result,revision,diagnostics,lease_until FROM documents WHERE id=?').get(id);
    if (!d) fail(404, 'El documento ya no está disponible.');
    return d;
  }
  function decisions(id) { return db.prepare('SELECT finding_id,status,replacement,note,updated_at FROM decisions WHERE document_id=? ORDER BY finding_id').all(id); }
  function detail(d) {
    return { ...d, profile: JSON.parse(d.profile), result: d.result ? JSON.parse(d.result) : null,
      diagnostics: diagnosticView(db,d), runs: listRuns(db,d.id), annotations: annotationList(db,d.id), decisions: decisions(d.id), events: db.prepare('SELECT at,message FROM events WHERE document_id=? ORDER BY id DESC LIMIT 30').all(d.id) };
  }
  function mutate(fn) { db.exec('BEGIN IMMEDIATE'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } }
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'${production ? '' : " 'unsafe-inline'"}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);
    try {
      if (!production && server.address()) {
        origins.add(`http://127.0.0.1:${server.address().port}`);
        origins.add(`http://localhost:${server.address().port}`);
      }
      const reqHost = req.headers.host;
      if (!reqHost || ![...origins].some(o => new URL(o).host === reqHost)) fail(403, 'Servidor no reconocido.');
      const url = new URL(req.url, origin);
      const pathname = url.pathname;
      if (pathname.startsWith('/api/')) {
        if (req.headers.origin && !origins.has(req.headers.origin)) fail(403, 'Origen no permitido.');
        const mutation = !['GET', 'HEAD'].includes(req.method);
        if (mutation && req.headers['x-humanizador-request'] !== '1') fail(403, 'Falta la comprobación de la petición.');
        if (pathname === '/api/session' && req.method === 'GET') {
          return send(res, 200, { authenticated: authenticated(req), passwordRequired: Boolean(password), mode: production ? 'server' : 'local', version: '0.5.0', instance: process.env.HUMANIZADOR_INSTANCE || null, start_notice: process.env.HUMANIZADOR_START_NOTICE || '', limits: { upload_mb: maxUploadMb, pages: 300 } });
        }
        if (pathname === '/api/session' && req.method === 'POST') {
          const address = req.socket.remoteAddress ?? 'unknown';
          const previous = db.prepare('SELECT * FROM auth_attempts WHERE address=?').get(address);
          if (previous && previous.reset_at > Date.now() && previous.attempts >= 5) fail(429, 'Espera diez minutos antes de volver a probar.');
          const input = await json(req);
          if (typeof input.password !== 'string' || input.password.length > 1000) fail(400, 'Contraseña no válida.');
          if (!timingSafeEqual(scryptSync(input.password, passwordSalt, 32), passwordDigest)) {
            const attempts = previous && previous.reset_at > Date.now() ? previous.attempts + 1 : 1;
            db.prepare('INSERT OR REPLACE INTO auth_attempts(address,attempts,reset_at) VALUES(?,?,?)').run(address, attempts, Date.now() + 600000);
            fail(401, 'La contraseña no es correcta.');
          }
          db.prepare('DELETE FROM auth_attempts WHERE address=?').run(address);
          db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
          const token = randomBytes(32).toString('hex');
          db.prepare('INSERT INTO sessions(token_hash, expires) VALUES(?,?)').run(hash(token), Date.now() + 86400000);
          return send(res, 200, { authenticated: true }, { 'Set-Cookie': `humanizador_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure ? '; Secure' : ''}` });
        }
        if (!authenticated(req)) fail(401, 'Inicia sesión para acceder a tus documentos.');
        if (pathname === '/api/session' && req.method === 'DELETE') {
          const token = /humanizador_session=([a-f0-9]{64})/.exec(req.headers.cookie || '')?.[1];
          if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
          return send(res, 200, { ok: true }, { 'Set-Cookie': `humanizador_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}` });
        }
        if (pathname === '/api/rules' && req.method === 'GET') return send(res, 200, { rules,
          sources: [...evidence.sources, ...sources], coverage, validation: catalogueValidation,
          evidence_reviewed_at: evidence.reviewed_at, implemented: activeRules.length, total: rules.length });
        if (pathname === '/api/local-model' && req.method === 'GET') return send(res, 200, await modelStatus());
        if (pathname === '/api/projects' && req.method === 'GET') {
          const docs = summarizeDocuments(db);
          return send(res, 200, db.prepare('SELECT * FROM projects ORDER BY created_at,id').all().map(p => ({ ...p, statistics: projectStatistics(docs.filter(d => d.project_id === p.id)) })));
        }
        const projectMatch = /^\/api\/projects\/([a-f0-9-]{36})$/.exec(pathname);
        if (projectMatch && req.method === 'DELETE') {
          const id = projectMatch[1];
          const deleted = mutate(() => {
            if (!db.prepare('SELECT id FROM projects WHERE id=?').get(id)) fail(404, 'Proyecto no encontrado.');
            // Removing the rows also fences any worker still holding a claim.
            const documents = db.prepare('DELETE FROM documents WHERE project_id=?').run(id).changes;
            db.prepare('DELETE FROM projects WHERE id=?').run(id);
            return documents;
          });
          return send(res, 200, { ok: true, deleted_documents: deleted });
        }
        if ((pathname === '/api/projects' && req.method === 'POST') || (projectMatch && req.method === 'PATCH')) {
          const input = await json(req);
          if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120) fail(400, 'Indica un nombre de proyecto de hasta 120 caracteres.');
          if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 1000)) fail(400, 'La descripción admite hasta 1000 caracteres.');
          const id = projectMatch?.[1] || randomUUID();
          const name = input.name.trim().normalize('NFC'), description = (input.description || '').normalize('NFC');
          if (projectMatch) {
            if (!db.prepare('UPDATE projects SET name=?,description=? WHERE id=?').run(name,description,id).changes) fail(404, 'Proyecto no encontrado.');
          } else db.prepare('INSERT INTO projects(id,name,description,created_at) VALUES(?,?,?,?)').run(id,name,description,utc());
          return send(res, projectMatch ? 200 : 201, { id, name, description });
        }
        if (pathname === '/api/documents' && req.method === 'GET') {
          const projectId = url.searchParams.get('project_id');
          if (projectId && !db.prepare('SELECT id FROM projects WHERE id=?').get(projectId)) fail(404, 'Proyecto no encontrado.');
          return send(res, 200, summarizeDocuments(db, projectId));
        }
        if (pathname === '/api/documents' && req.method === 'POST') {
          if (!req.headers['content-type']?.startsWith('application/pdf')) fail(415, 'Sube un fichero PDF.');
          const projectId = url.searchParams.get('project_id') || db.prepare('SELECT id FROM projects ORDER BY created_at,id LIMIT 1').get()?.id;
          if (!projectId) fail(409, 'Crea un proyecto antes de subir un documento.');
          if (!db.prepare('SELECT id FROM projects WHERE id=?').get(projectId)) fail(404, 'Proyecto no encontrado.');
          const pdf = await body(req, maxUpload);
          if (pdf.length < 8 || pdf.subarray(0, 5).toString() !== '%PDF-') fail(400, 'El fichero no tiene una cabecera PDF válida.');
          const name = (url.searchParams.get('name') || 'Documento.pdf').normalize('NFC').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
          const genres = ['Explicación técnica', 'Ensayo', 'Comunicación profesional', 'Narrativa'];
          const genre = url.searchParams.get('genre') || genres[0];
          if (!genres.includes(genre)) fail(400, 'Género no reconocido.');
          const id = randomUUID();
          const profile = { locale: 'es-ES', name: 'Roberto · revisión de candidatos', version: '0.4.0', genre, rule_ids: activeRules.map(r => r.id), ...await reviewProfile(url.searchParams.get('review_mode') || 'rules') };
          const manual = url.searchParams.get('start_analysis') === 'false';
          const digest = hash(pdf);
          const existing = mutate(() => {
            const duplicate = db.prepare('SELECT id FROM documents WHERE project_id=? AND sha256=?').get(projectId,digest);
            if (duplicate) return duplicate;
            if (!db.prepare('SELECT id FROM projects WHERE id=?').get(projectId)) fail(404, 'Proyecto no encontrado.');
            const active = db.prepare("SELECT COUNT(*) AS n FROM documents WHERE status IN ('queued','extracting','analyzing')").get();
            if (!manual && active.n >= 5) fail(429, 'Hay cinco análisis en cola. Espera a que termine alguno.');
            db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status,project_id,size_bytes,queued_at_ms) VALUES(?,?,?,?,?,?,?,?,?,?)')
              .run(id, name, digest, pdf, utc(), JSON.stringify(profile), manual ? 'ready' : 'queued', projectId, pdf.length, Date.now());
            event(db, id, manual ? 'PDF guardado. Listo para leer y anotar.' : 'PDF guardado. Análisis añadido a la cola.');
          });
          if (existing) return send(res, 200, { id: existing.id, reused: true, message: 'Este PDF ya existe en el proyecto. Puedes abrirlo y reprocesarlo con las reglas actuales.' });
          return send(res, 202, { id, reused: false });
        }
        const match = /^\/api\/documents\/([a-f0-9-]{36})(?:\/(pdf|decisions|cancel|retry|reprocess|export|runs(?:\/[a-f0-9-]{36})?|annotations(?:\/[a-f0-9-]{36}(?:\/preview)?)?))?$/.exec(pathname);
        if (match) {
          const [, id, action] = match;
          const d = document(id);
          if (action?.startsWith('annotations')) {
            const [, annotationId, previewAction] = action.split('/');
            const row = annotationId ? db.prepare('SELECT * FROM annotations WHERE id=? AND document_id=?').get(annotationId,id) : null;
            if (annotationId && !row) fail(404,'Anotación no encontrada.');
            if (previewAction === 'preview' && req.method === 'GET') {
              if (!row.preview) fail(404,'Esta nota no tiene captura.');
              return send(res,200,Buffer.from(JSON.parse(row.preview).data_base64,'base64'),{'Content-Type':'image/png'});
            }
            if (!annotationId && req.method === 'GET') return send(res,200,annotationList(db,id));
            if (!annotationId && req.method === 'POST') {
              const input = await json(req,3000000);
              if (input.source_pdf_sha256 !== d.sha256) fail(409,'El PDF de la selección no coincide con este documento.');
              const note = annotationNote(input.note), preview = annotationImage(input.preview);
              const anchor = await createAnchor(db.prepare('SELECT pdf FROM documents WHERE id=?').get(id).pdf,input);
              const annotationId = randomUUID(), at = utc();
              mutate(()=>{
                if (db.prepare('SELECT COUNT(*) AS n FROM annotations WHERE document_id=?').get(id).n >= 2000) fail(409,'Este documento ya tiene 2000 anotaciones.');
                db.prepare('INSERT INTO annotations(id,document_id,page,kind,note,anchor,preview,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
                  .run(annotationId,id,input.page,input.kind,note,canonical(anchor),preview?canonical(preview):null,at,at);
                db.prepare('UPDATE documents SET revision=revision+1 WHERE id=?').run(id);
              });
              return send(res,201,annotationList(db,id).find(a=>a.id===annotationId));
            }
            if (annotationId && !previewAction && ['PUT','DELETE'].includes(req.method)) {
              const input = await json(req);
              if (input.version !== row.version) fail(409,'La nota ha cambiado. Recarga antes de editarla.');
              const note = req.method === 'PUT' ? annotationNote(input.note) : null;
              if (req.method === 'PUT' && !['open','resolved'].includes(input.status)) fail(400,'Estado de anotación no válido.');
              mutate(()=>{
                const change = req.method === 'DELETE' ? db.prepare('DELETE FROM annotations WHERE id=? AND version=?').run(row.id,input.version)
                  : db.prepare('UPDATE annotations SET note=?,status=?,updated_at=?,version=version+1 WHERE id=? AND version=?').run(note,input.status,utc(),row.id,input.version);
                if (!change.changes) fail(409,'La nota ha cambiado. Recarga antes de editarla.');
                db.prepare('UPDATE documents SET revision=revision+1 WHERE id=?').run(id);
              });
              return send(res,200,{annotations:annotationList(db,id)});
            }
            fail(405,'Acción de anotación no disponible.');
          }
          if (action?.startsWith('runs') && req.method === 'GET') {
            const runId = action.split('/')[1];
            if (!runId) return send(res,200,listRuns(db,id));
            const run = db.prepare('SELECT snapshot FROM document_runs WHERE id=? AND document_id=?').get(runId,id);
            if (!run) fail(404,'Revisión no encontrada.');
            return send(res,200,run.snapshot,{'Content-Disposition':`attachment; filename="revision-${runId}.json"`});
          }
          if (action === 'reprocess' && req.method === 'POST') {
            const input = await json(req);
            const review = await reviewProfile(input.review_mode || 'rules');
            mutate(() => {
              const current = document(id);
              if (['queued','extracting','analyzing'].includes(current.status)) fail(409,'Este documento ya está en proceso.');
              if (input.revision !== current.revision) fail(409,'La revisión ha cambiado. Recarga el documento.');
              if (db.prepare("SELECT COUNT(*) AS n FROM documents WHERE status IN ('queued','extracting','analyzing')").get().n >= 5) fail(429,'La cola está llena.');
              archiveDocument(db,id);
              db.prepare('DELETE FROM decisions WHERE document_id=?').run(id);
              const profile = {...JSON.parse(current.profile),version:'0.4.0',rule_ids:activeRules.map(r=>r.id),...review};
              if (review.review_mode === 'rules') delete profile.local_model;
              db.prepare("UPDATE documents SET status='queued',profile=?,result=NULL,statistics=NULL,error=NULL,attempts=0,progress=0,total=0,diagnostics=NULL,claim_token=NULL,lease_until=NULL,queued_at_ms=?,started_at_ms=NULL,finished_at_ms=NULL,processing_ms=NULL,revision=revision+1 WHERE id=?").run(JSON.stringify(profile),Date.now(),id);
              event(db,id,'Nuevo análisis en cola con las reglas actuales. La revisión anterior se conserva en Historia.');
            });
            return send(res,202,{id});
          }
          if (!action && req.method === 'GET') return send(res, 200, detail(d));
          if (!action && req.method === 'PATCH') {
            const input = await json(req);
            if (typeof input.project_id !== 'string' || !db.prepare('SELECT id FROM projects WHERE id=?').get(input.project_id)) fail(404, 'Proyecto no encontrado.');
            mutate(() => {
              if (db.prepare('SELECT id FROM documents WHERE project_id=? AND sha256=? AND id<>?').get(input.project_id,d.sha256,id)) fail(409,'Este PDF ya existe en el proyecto de destino.');
              db.prepare('UPDATE documents SET project_id=?,revision=revision+1 WHERE id=?').run(input.project_id,id);
              event(db,id,'Documento trasladado a otro proyecto.');
            });
            return send(res,200,detail(document(id)));
          }
          if (!action && req.method === 'DELETE') {
            mutate(() => { db.prepare('DELETE FROM documents WHERE id=?').run(id); });
            return send(res, 200, { ok: true });
          }
          if (action === 'pdf' && req.method === 'GET') {
            const pdf = Buffer.from(db.prepare('SELECT pdf FROM documents WHERE id=?').get(id).pdf);
            return send(res, 200, pdf, { 'Content-Type': 'application/pdf', 'Content-Length': pdf.length,
              'Content-Disposition': `inline; filename="documento.pdf"; filename*=UTF-8''${encodeURIComponent(d.name)}` });
          }
          if (action === 'cancel' && req.method === 'POST') {
            mutate(() => {
              const updated = db.prepare("UPDATE documents SET status='cancelled',finished_at_ms=?,processing_ms=CASE WHEN started_at_ms IS NULL THEN NULL ELSE MAX(0,?-started_at_ms) END,claim_token=NULL,lease_until=NULL WHERE id=? AND status IN ('queued','extracting','analyzing')").run(Date.now(),Date.now(),id);
              if (!updated.changes) fail(409, 'Este trabajo ya ha terminado.');
              event(db, id, 'Análisis cancelado por el usuario.');
            });
            return send(res, 200, { ok: true });
          }
          if (action === 'retry' && req.method === 'POST') {
            mutate(() => {
              if (db.prepare("SELECT COUNT(*) AS n FROM documents WHERE status IN ('queued','extracting','analyzing')").get().n >= 5) fail(429, 'La cola está llena.');
              const updated = db.prepare("UPDATE documents SET status='queued',error=NULL,diagnostics=NULL,attempts=0,progress=0,total=0,claim_token=NULL,queued_at_ms=?,started_at_ms=NULL,finished_at_ms=NULL,processing_ms=NULL WHERE id=? AND status IN ('failed','cancelled','paused')").run(Date.now(),id);
              if (!updated.changes) fail(409, 'Solo se puede continuar un trabajo en pausa, fallido o cancelado.');
              event(db, id, 'Continuación solicitada. Se reutilizarán los bloques completos compatibles.');
            });
            return send(res, 202, { id });
          }
          if (action === 'decisions' && req.method === 'POST') {
            const input = await json(req);
            if (d.status !== 'completed' || !d.result) fail(409, 'Espera a que termine el análisis.');
            if (!['approved', 'kept', 'pending'].includes(input.status) || typeof input.finding_id !== 'string') fail(400, 'Decisión no válida.');
            const result = JSON.parse(d.result);
            const f = result.findings.find(f => f.id === input.finding_id);
            if (!f) fail(404, 'Este hallazgo no pertenece al documento.');
            if (!Number.isInteger(input.revision) || input.revision !== d.revision) fail(409, 'La revisión ha cambiado. Recarga el documento.');
            if (input.status === 'approved' && (typeof input.replacement !== 'string' || input.replacement.length > 10000)) fail(400, 'Escribe una sustitución válida.');
            if (input.replacement != null && (typeof input.replacement !== 'string' || input.replacement.length > 10000)) fail(400,'Propuesta no válida.');
            const replacement = typeof input.replacement === 'string' ? input.replacement.normalize('NFC').replace(/\r\n?/g, '\n') : null;
            const note = typeof input.note === 'string' ? input.note.slice(0, 1000) : '';
            if (replacement !== null) canonical(replacement);
            mutate(() => {
              const changed = db.prepare("UPDATE documents SET revision=revision+1 WHERE id=? AND revision=? AND status='completed'").run(id, input.revision);
              if (!changed.changes) fail(409, 'La revisión ha cambiado. Recarga el documento.');
              const next = decisions(id).filter(x => x.finding_id !== f.id).concat([{ finding_id: f.id, status: input.status, replacement }]);
              makePackage(result, next); // Validate overlaps before persisting approval.
              db.prepare(`INSERT INTO decisions(document_id,finding_id,status,replacement,note,updated_at) VALUES(?,?,?,?,?,?)
                ON CONFLICT(document_id,finding_id) DO UPDATE SET status=excluded.status,replacement=excluded.replacement,note=excluded.note,updated_at=excluded.updated_at`)
                .run(id, f.id, input.status, replacement, note, utc());
              event(db, id, `${input.status === 'approved' ? 'Corrección aprobada' : input.status === 'kept' ? 'Expresión conservada' : 'Hallazgo reabierto'} · ${f.rule_id} · página ${f.page}.`);
            });
            return send(res, 200, detail(document(id)));
          }
          if (action === 'export' && req.method === 'GET') {
            if (url.searchParams.get('format') === 'diagnostics') return send(res,200,JSON.stringify({format:'humanizador.analysis-diagnostic',format_version:'1.0',document:{id:d.id,name:d.name,sha256:d.sha256,status:d.status,progress:d.progress,total:d.total,started_at_ms:d.started_at_ms,finished_at_ms:d.finished_at_ms},diagnostics:diagnosticView(db,d),events:db.prepare('SELECT at,message FROM events WHERE document_id=? ORDER BY id DESC LIMIT 500').all(id)},null,2),{'Content-Disposition':'attachment; filename="diagnostico-analisis.json"'});
            if (url.searchParams.get('format') === 'edition') {
              const automatic = d.status === 'completed' && d.result ? exportFindings(JSON.parse(d.result),decisions(id),d) : null;
              const previous = db.prepare('SELECT id,archived_at,snapshot FROM document_runs WHERE document_id=? ORDER BY archived_at,id').all(id).map(run=>{const snapshot=JSON.parse(run.snapshot);return {id:run.id,archived_at:run.archived_at,status:snapshot.document.status,review:snapshot.document.result?exportFindings(snapshot.document.result,snapshot.decisions,snapshot.document):null};});
              return send(res,200,JSON.stringify(exportEdition(d,annotationList(db,id,true),automatic,previous),null,2),{'Content-Disposition':'attachment; filename="edicion-pdf-para-ia.json"'});
            }
            if (d.status !== 'completed' || !d.result) fail(409, 'El análisis todavía no está terminado.');
            const result = JSON.parse(d.result), ds = decisions(id);
            const format = url.searchParams.get('format') || 'changes';
            const filename = { findings: 'hallazgos-para-ia.json', changes: 'cambios.json', source: 'texto-origen.json', text: 'texto-revisado.txt', report: 'informe.html' }[format];
            if (!filename) fail(400, 'Formato no reconocido.');
            const headers = { 'Content-Disposition': `attachment; filename="${filename}"` };
            if (format === 'findings') {
              const annotations = annotationList(db,id,true);
              let dossier = exportFindings(result,ds,d);
              if (annotations.length) {
                const {export_sha256,...original} = dossier;
                const combined = {...original,format_version:'1.1',manual_edition:exportEdition(d,annotations)};
                dossier = {...combined,export_sha256:hash(canonical(combined))};
              }
              return send(res, 200, JSON.stringify(dossier, null, 2), headers);
            }
            if (format === 'source') return send(res, 200, canonical(result), headers);
            const pkg = makePackage(result, ds);
            if (format === 'changes') return send(res, 200, canonical(pkg), headers);
            if (format === 'text') return send(res, 200, applyPackage(result, pkg).map(b => `Página ${b.page}${b.excluded ? ' · no analizada' : ''}\n\n${b.text}`).join('\n\n'), { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
            const dm = new Map(ds.map(x => [x.finding_id, x]));
            const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión de ${escapeHtml(d.name)}</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:40px auto;padding:24px}article{break-inside:avoid;border-top:1px solid #ddd;padding:16px 0}blockquote{background:#f5f6fa;padding:16px;white-space:pre-wrap}small{color:#555}@media print{body{margin:0}}</style><h1>${escapeHtml(d.name)}</h1><p>Revisión editorial en castellano de España. Coincidencias pendientes de valoración; no es una determinación de autoría.</p><p>${result.coverage.analyzed} de ${result.coverage.total} páginas analizadas. ${pkg.operations.length} cambios aprobados; ${pkg.unresolved_findings.length} pendientes.</p><p>PDF SHA-256: ${result.source_pdf_sha256}</p><p>Reglas: ${result.analysis.catalogue_sha256}</p>${result.pages.filter(p => p.excluded).map(p => `<p>Página ${p.page} excluida: ${escapeHtml(p.reason)}</p>`).join('')}${result.findings.map(f => { const decision = dm.get(f.id); return `<article><h2>${escapeHtml(f.rule_name)}</h2><small>${f.rule_id} · página ${f.page} · ${escapeHtml(decision?.status === 'approved' ? 'Corrección aprobada' : decision?.status === 'kept' ? 'Expresión conservada' : 'Pendiente')}</small><blockquote>${escapeHtml(f.phrase)}</blockquote><p>${escapeHtml(f.explanation)}</p><p>${escapeHtml(f.exception)}</p>${decision?.status === 'approved' ? `<p>Sustitución:</p><blockquote>${escapeHtml(decision.replacement || '(eliminar fragmento)')}</blockquote>` : ''}</article>`; }).join('')}</html>`;
            return send(res, 200, html, { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
          }
        }
        fail(404, 'Ruta no disponible.');
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') fail(405, 'Método no permitido.');
      const file = resolve(staticRoot, `.${decodeURIComponent(pathname === '/' ? '/index.html' : pathname)}`);
      if (!file.startsWith(staticRoot + sep)) fail(403, 'Ruta no permitida.');
      let bytes;
      try { const info = await stat(file); if (!info.isFile()) throw new Error(); bytes = await readFile(file); }
      catch { fail(404, 'La interfaz no está compilada o la ruta no existe. Ejecuta npm run build.'); }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream';
      return send(res, 200, req.method === 'HEAD' ? '' : bytes, { 'Content-Type': mime, 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
    } catch (e) {
      if (res.headersSent) { res.destroy(); return; }
      const status = e.status || (/solapan|fragmento|Unicode|corrección/u.test(e.message) ? 409 : 500);
      if (status >= 500) console.error('Petición fallida:', e.name);
      send(res, status, { error: status >= 500 ? 'No se pudo completar la petición.' : e.message });
    }
  });
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bind = process.env.HUMANIZADOR_BIND || '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(bind) && !process.env.HUMANIZADOR_PASSWORD) throw new Error('Configura una contraseña antes de exponer el servidor a la red.');
  const server = createApp();
  server.requestTimeout = 120000;
  server.headersTimeout = 15000;
  server.listen(Number(process.env.PORT || 8787), bind, () => console.log(`Humanizador: http://${bind}:${server.address().port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
}
