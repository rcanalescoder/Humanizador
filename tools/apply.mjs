import { readFile, writeFile } from 'node:fs/promises';
import { applyPackage } from '../core/changes.mjs';
const [sourcePath, packagePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !packagePath || !outputPath) {
  console.error('Uso: npm run apply -- texto-origen.json cambios.json texto-revisado.txt');
  process.exit(1);
}
try {
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  const blocks = applyPackage(source, pkg);
  await writeFile(outputPath, blocks.map(b => `Página ${b.page}${b.excluded ? ' · no analizada' : ''}\n\n${b.text}`).join('\n\n'), { flag: 'wx' });
  console.log(`Texto revisado guardado en ${outputPath}.`);
} catch (e) { console.error(e.message); process.exit(1); }
