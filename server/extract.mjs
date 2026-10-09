import { getDocument, version } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { hash, canonical, documentHash } from '../core/changes.mjs';
import { analyzeBlocks, ruleSnapshot, ruleHash } from '../core/rules.mjs';
import { pageText } from '../core/pdf-text.mjs';

const require = createRequire(import.meta.url);
const assets = dirname(require.resolve('pdfjs-dist/package.json'));
export const MAX_PAGES = 300;
export async function extractPdf(bytes, profile, progress = () => {}) {
  const pdfSha = hash(bytes);
  const loading = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false,
    standardFontDataUrl: join(assets, 'standard_fonts/'), cMapUrl: join(assets, 'cmaps/'), cMapPacked: true });
  let pdf;
  try {
    pdf = await loading.promise;
    if (pdf.numPages > MAX_PAGES) throw new Error(`El límite de esta versión es ${MAX_PAGES} páginas.`);
    const blocks = [], pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const { text, segments } = pageText(content);
      const noText = !text.trim();
      const rotated = segments.some(s => s.rotated);
      // Mixed right-to-left/vertical content is deliberately withheld from editable results.
      const unsupported = rotated || content.items.some(i => i.dir === 'rtl' || i.dir === 'ttb');
      const excluded = noText || unsupported;
      const reason = noText ? 'Sin texto extraíble. OCR pendiente de una versión posterior.' : unsupported ? 'Texto girado o dirección no compatible; revisar extracción.' : null;
      const id = `p${String(pageNumber).padStart(4, '0')}-b0001`;
      const characters = [...text].length;
      pages.push({ page: pageNumber, view: page.view, rotation: page.rotate, excluded, reason, characters });
      blocks.push({ id, page: pageNumber, text, sha256: hash(text), segments: segments.map(s => ({ ...s, end: Math.min(s.end, characters) })), excluded });
      progress({ status: 'extracting', current: pageNumber, total: pdf.numPages });
      page.cleanup();
    }
    progress({ status: 'analyzing', current: pdf.numPages, total: pdf.numPages });
    const findings = analyzeBlocks(blocks, profile);
    const profileHash = hash(canonical(profile));
    return { source_pdf_sha256: pdfSha, canonical_document_sha256: documentHash(blocks), blocks, pages, findings,
      extraction: { engine: 'pdf.js', version, normalization: 'NFC/LF', layout: 'page-native-order-v1', offset_unit: 'unicode_code_points' },
      analysis: { engine: 'humanizador-reglas', version: '0.3.0', catalogue_sha256: ruleHash, rules: ruleSnapshot,
        profile, profile_sha256: profileHash, segmentation: 'page-block-v1' },
      coverage: { analyzed: pages.filter(p => !p.excluded).length, total: pages.length,
        words: blocks.filter(b => !b.excluded).reduce((n, b) => n + (b.text.match(/[\p{L}\p{N}]+/gu) || []).length, 0) } };
  } catch (e) {
    if (e.name === 'PasswordException') throw new Error('Este PDF está protegido por contraseña. Sube una copia desbloqueada.');
    if (e.name === 'InvalidPDFException') throw new Error('El fichero no contiene un PDF que se pueda leer.');
    throw e;
  } finally { await loading.destroy(); }
}
