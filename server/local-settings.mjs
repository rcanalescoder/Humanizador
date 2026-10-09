import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
export const defaultModel = 'qwen3.6:27b-q8_0';
export function validModel(model) {
  return typeof model === 'string' && model.length <= 180 && /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]*$/.test(model) && !/cloud/i.test(model);
}
export function settingsPath(directory = process.env.HUMANIZADOR_DATA_DIR || 'data') { return resolve(directory, 'settings.json'); }
export function validateSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.ollama_enabled !== 'boolean' || !validModel(value.ollama_model)) throw new Error('La configuración local no es válida. Vuelve a ejecutar el instalador para revisarla.');
  return { ollama_enabled: value.ollama_enabled, ollama_model: value.ollama_model };
}
export function readSettings(directory) {
  try { return validateSettings(JSON.parse(readFileSync(settingsPath(directory), 'utf8'))); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}
export function saveSettings(value, directory = process.env.HUMANIZADOR_DATA_DIR || 'data') {
  const settings = validateSettings(value); mkdirSync(directory, {recursive:true,mode:0o700});
  const file = settingsPath(directory), temp = file + '.' + randomUUID() + '.tmp';
  writeFileSync(temp,JSON.stringify(settings,null,2)+'\n',{mode:0o600}); renameSync(temp,file);
  return settings;
}
