// Copies the pdf.js worker to public/ so the PDF viewer (components/pdf/PdfPages.tsx) can load it from
// our own origin (/pdf.worker.min.mjs, no CDN). Runs after every `npm install` ("postinstall"), so the
// worker always matches the installed pdfjs-dist version. The copied file is generated: it is ignored by git.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const target = path.join(root, "public", "pdf.worker.min.mjs");

let source;
try {
  // The legacy build runs on older phones (iOS 15+, older Android WebViews); it must match the
  // `pdfjs-dist/legacy/build/pdf.mjs` import of the viewer.
  source = path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "legacy", "build", "pdf.worker.min.mjs");
} catch {
  source = "";
}

if (!source || !existsSync(source)) {
  console.warn("[copy-pdf-worker] pdfjs-dist is not installed: public/pdf.worker.min.mjs was not updated.");
  process.exit(0);
}

const same = existsSync(target) && readFileSync(target).equals(readFileSync(source));
if (!same) {
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(source, target);
}
console.log(`[copy-pdf-worker] public/pdf.worker.min.mjs ${same ? "already up to date" : "updated"}.`);

// Standard fonts (Helvetica…): the PDFs use them without embedding, pdf.js needs these files to draw
// the exact letter shapes. Served from /pdfjs-fonts/ (see standardFontDataUrl in PdfPages.tsx).
const fonts = path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts");
if (existsSync(fonts)) {
  cpSync(fonts, path.join(root, "public", "pdfjs-fonts"), { recursive: true });
  console.log("[copy-pdf-worker] public/pdfjs-fonts/ updated.");
}
