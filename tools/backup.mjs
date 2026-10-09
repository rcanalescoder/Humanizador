import { backup } from 'node:sqlite';
import { resolve } from 'node:path';
import { access, chmod } from 'node:fs/promises';
import { openDatabase } from '../server/db.mjs';
const destination = process.argv[2];
if (!destination) { console.error('Uso: npm run backup -- /ruta/privada/copia.sqlite'); process.exit(1); }
const path = resolve(destination);
try { await access(path); console.error('La ruta de copia ya existe. Elige otra para evitar sobrescribirla.'); process.exit(1); } catch {}
const db = openDatabase();
try { await backup(db, path); await chmod(path, 0o600); console.log('Copia privada creada. Incluye los PDF y sus revisiones.'); }
finally { db.close(); }
