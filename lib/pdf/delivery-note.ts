import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { DeliveryView } from "@/types/delivery";
import { COMPANY } from "@/lib/sites";
import { formatDateFr, formatDateLong, formatQty } from "@/lib/format";

/*
 * Bon de livraison / état des stocks, A4 portrait, in the house layout used since the start:
 * company block and big title with REF, "Fait le / Demandée pour", the issuer box with the
 * document pattern, the online link and QR code, the "Date d'envoi" box, the delivery address,
 * the list (#, article with its packaging below, qty) and the page footer.
 *
 * Improvements over the first version:
 *   - dates as JJ/MM/AAAA;
 *   - as many lines as possible on one page: one column while it fits, then two columns, with
 *     rows tightening before a new page is used;
 *   - the pattern under the name comes from the document id (same PDF every time);
 *   - aligned columns, long names wrapped instead of overflowing, French number format, total line.
 * Pure module (no database, no "server-only") so test scripts can render it too.
 */

const W = 210;
const H = 297;
const M = 16;
const FOOTER_LINE = H - 18;
const LIMIT = FOOTER_LINE - 3;
const TOTAL_H = 8;
const HEAD_H = 7.5;

type Density = { row: number; name: number; unit: number; base: number; unitGap: number; extra: number };
type Layout = { twoCols: boolean; d: Density };
const COMFY: Density = { row: 9.2, name: 9, unit: 7.4, base: 4.2, unitGap: 3.3, extra: 3.8 };
const SNUG: Density = { row: 8.2, name: 8.4, unit: 6.9, base: 3.8, unitGap: 3, extra: 3.5 };
const TIGHT: Density = { row: 7.3, name: 8, unit: 6.6, base: 3.4, unitGap: 2.9, extra: 3.3 };
/** Tried in order; the first one that puts the whole list on one page is used. */
const LAYOUTS: Layout[] = [
  { twoCols: false, d: COMFY },
  { twoCols: false, d: SNUG },
  { twoCols: true, d: SNUG },
  { twoCols: true, d: TIGHT },
];

// WinAnsi (the standard PDF fonts) covers Latin-1 plus a few typographic signs.
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function clean(value: unknown): string {
  const s = (typeof value === "string" || typeof value === "number" ? String(value) : "").normalize("NFC");
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (c === 0x2713 || c === 0x2714) out += "x";
    else if (c >= 0x20 && c <= 0x7e) out += ch;
    else if (c >= 0xa0 && c <= 0xff) out += ch;
    else if (WIN_ANSI_EXTRA.has(ch)) out += ch;
    else if (c === 0x09 || c === 0x0a) out += " ";
    // anything else (emoji, other scripts) is dropped
  }
  return out.replace(/\s+/g, " ").trim();
}

const plural = (n: number, word: string) => `${formatQty(n)} ${word}${Math.abs(n) > 1 ? "s" : ""}`;

type Row = { index: number; qty: number; name: string[]; unit: string; h: number };
type Block = { x: number; w: number };

export async function renderDeliveryNote(doc: DeliveryView, opts: { url: string }): Promise<ArrayBuffer> {
  const isStock = doc.kind === "stock";
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const lines = doc.lines.filter((l) => clean(l.name));
  const totalQty = lines.reduce((s, l) => s + (Number.isFinite(l.qty) ? l.qty : 0), 0);
  const month = isStock && doc.date ? formatDateLong(doc.date).replace(/^\S+\s+\d+\s+/, "").toUpperCase() : "";
  const title = isStock ? (month ? `ÉTAT DES STOCKS (${month})` : "ÉTAT DES STOCKS") : "BON DE LIVRAISON";

  pdf.setProperties({
    title: clean(`${isStock ? "État des stocks" : "Bon de livraison"} ${doc.number} – ${doc.siteShortName}`),
    subject: clean(`${title} ${doc.siteName}`),
    author: "BKTK International",
    creator: "BKTK International",
    keywords: clean(`${doc.number} ${doc.siteSlug ?? ""}`),
  });

  const font = (size: number, gray: number) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(gray);
  };
  const text = (s: string, x: number, y: number, align: "left" | "right" | "center" = "left") =>
    pdf.text(clean(s), x, y, { align });
  /** Split to the current font; the last kept line ends with "…" when text is cut. */
  const wrap = (s: string, width: number, maxLines: number): string[] => {
    const parts = pdf.splitTextToSize(clean(s), width) as string[];
    if (parts.length <= maxLines) return parts;
    const kept = parts.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && pdf.getTextWidth(`${last}…`) > width) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  };

  /* ───────── Header (page 1) ───────── */
  const qr = await QRCode.toDataURL(opts.url, { margin: 0, width: 240, errorCorrectionLevel: "M" });
  const drawHeader = () => {
    font(10, 30);
    text(COMPANY.name, M, 14);
    font(8, 110);
    text(COMPANY.line1, M, 18);
    text(COMPANY.line2, M, 22);

    font(isStock && month ? 19 : 23, 20);
    text(title, W - M, 16, "right");
    font(8.5, 110);
    text(`REF : ${doc.number}`, W - M, 22, "right");

    pdf.setDrawColor(220);
    pdf.setLineWidth(0.2);
    pdf.line(M, 26, W - M, 26);

    const top = 30;
    font(9, 40);
    text(`Fait le : ${formatDateFr(doc.date) || "—"}`, M, top + 2);
    if (!isStock) text(`Demandée pour : ${formatDateFr(doc.requestedDate) || "—"}`, M, top + 6);

    // Issuer box: big light name over the document pattern
    pdf.setDrawColor(220);
    pdf.roundedRect(80, top - 2, 80, 10, 1.2, 1.2, "S");
    font(18, 200);
    const big = (isStock ? doc.siteShortName : doc.author || doc.siteShortName || "BKTK").toUpperCase();
    pdf.text(wrap(big, 76, 1)[0] ?? "", 82, top + 4);

    // Pattern made from the document id: one small square per character, shade from the character
    const id = doc.id.slice(0, 24);
    let x = 82;
    for (let i = 0; i < id.length; i++) {
      const c = id.charCodeAt(i);
      const s1 = 50 + ((c * 37 + i * 11) % 151);
      const s2 = 50 + ((c * 53 + i * 29) % 151);
      pdf.setFillColor(s1, s1, s1);
      pdf.roundedRect(x, top + 5.2, 0.8, 0.8, 0.4, 0.4, "F");
      pdf.setFillColor(s2, s2, s2);
      pdf.roundedRect(x, top + 7, 0.8, 0.8, 0.4, 0.4, "F");
      x += 1.3;
    }
    font(2, 20);
    x = 82.2;
    for (let i = 0; i < id.length; i++) {
      pdf.text(id[i], x, top + 6.8);
      x += 1.3;
    }

    font(8, 60);
    text(opts.url, W * 0.75, top + 12, "right");

    if (!isStock) {
      pdf.setDrawColor(220);
      pdf.roundedRect(74, 44, 86, 20, 1.2, 1.2, "S");
      font(8, 40);
      text("Expedition date / Date d'envoi", 82, 48);
    }

    // Delivery address
    let y = top + 18;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    for (const l of wrap(doc.siteName, 56, 2)) {
      font(10, 30);
      text(l, M, y);
      y += 4.4;
    }
    font(9, 110);
    for (const l of doc.siteAddress.length ? doc.siteAddress : ["Adresse non renseignée"]) {
      text(l, M, y);
      y += 4;
    }

    pdf.addImage(qr, "PNG", W - M - 30, top - 2, 30, 30);

    // Colour swatches on the page edges
    const swatches = [230, 180, 120, 0];
    swatches.forEach((g, i) => {
      pdf.setFillColor(g, g, g);
      pdf.roundedRect(-1, 60 + i * 6, 4, 4, 1.2, 1.2, "F");
      pdf.roundedRect(W - 3, 240 + i * 6, 4, 4, 1.2, 1.2, "F");
    });
    return Math.max(64, y);
  };

  /* ───────── Header (next pages) ───────── */
  const drawCompactHeader = () => {
    font(10, 30);
    text(`BKTK INTERNATIONAL · ${title}`, M, 14);
    font(8, 110);
    text(`REF : ${doc.number} · ${doc.siteShortName}`, W - M, 14, "right");
    pdf.setDrawColor(220);
    pdf.setLineWidth(0.2);
    pdf.line(M, 18, W - M, 18);
    return 22;
  };

  /* ───────── Rows ───────── */
  const halfW = (W - 2 * M - 6) / 2;
  const nameWidth = (twoCols: boolean) => (twoCols ? halfW - 9 - 14 : W - 2 * M - 14 - 34);
  const measure = ({ twoCols, d }: Layout): Row[] => {
    const width = nameWidth(twoCols);
    return lines.map((line, index) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(d.name);
      const name = wrap(line.name, width, 2);
      pdf.setFontSize(d.unit);
      const unit = wrap(line.unit, width, 1)[0] ?? "";
      const h = d.row + (name.length - 1) * d.extra - (unit ? 0 : d.unitGap - 0.6);
      return { index, qty: line.qty, name, unit, h };
    });
  };

  const sum = (rs: Row[]) => rs.reduce((s, r) => s + r.h, 0);
  /** Whole list in the space left (two columns balanced), or null. */
  const fitAll = (rows: Row[], twoCols: boolean, avail: number): Row[][] | null => {
    if (!twoCols) return sum(rows) <= avail ? [rows] : null;
    if (rows.length <= 1) return sum(rows) <= avail ? [rows, []] : null;
    const total = sum(rows);
    let best: Row[][] | null = null;
    let bestH = Infinity;
    let left = 0;
    for (let k = 1; k < rows.length; k++) {
      left += rows[k - 1].h;
      const tallest = Math.max(left, total - left);
      if (left >= total - left - 0.01 && tallest <= avail && tallest < bestH - 0.01) {
        bestH = tallest;
        best = [rows.slice(0, k), rows.slice(k)];
      }
    }
    return best;
  };
  /** Fill the page column after column. */
  const fillPage = (rows: Row[], twoCols: boolean, avail: number, max: number): Row[][] => {
    const cols: Row[][] = [];
    let i = 0;
    for (let c = 0; c < (twoCols ? 2 : 1); c++) {
      const out: Row[] = [];
      let h = 0;
      while (i < rows.length && i < max && (out.length === 0 || h + rows[i].h <= avail)) {
        out.push(rows[i]);
        h += rows[i].h;
        i++;
      }
      cols.push(out);
    }
    return cols;
  };

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  const noteLines = doc.note ? wrap(`Remarque : ${doc.note}`, W - 2 * M - 70, 3) : [];
  const tailH = Math.max(TOTAL_H, noteLines.length ? 3 + noteLines.length * 3.8 : 0);

  const tableTop = drawHeader() + 5;
  const rowsTop = (top: number) => top + HEAD_H;
  const firstAvail = LIMIT - rowsTop(tableTop) - tailH;

  let layout = LAYOUTS[LAYOUTS.length - 1];
  let rows: Row[] = [];
  for (const candidate of LAYOUTS) {
    rows = measure(candidate);
    layout = candidate;
    if (fitAll(rows, candidate.twoCols, firstAvail)) break;
  }
  const { twoCols, d } = layout;
  const blocks: Block[] = twoCols
    ? [
        { x: M, w: halfW },
        { x: W - M - halfW, w: halfW },
      ]
    : [{ x: M, w: W - 2 * M }];

  const plan: { top: number; cols: Row[][] }[] = [];
  let remaining = rows;
  let top = tableTop;
  for (;;) {
    const all = fitAll(remaining, twoCols, LIMIT - rowsTop(top) - tailH);
    if (all) {
      plan.push({ top, cols: all });
      break;
    }
    const max = remaining.length > 2 ? remaining.length - 2 : remaining.length;
    const cols = fillPage(remaining, twoCols, LIMIT - rowsTop(top), max);
    const used = cols.reduce((s, c) => s + c.length, 0);
    plan.push({ top, cols });
    remaining = remaining.slice(used);
    if (remaining.length === 0 || used === 0) break;
    top = 22;
  }

  const qtyX = (b: Block) => b.x + b.w - (twoCols ? 2 : 24);
  const nameX = (b: Block) => b.x + (twoCols ? 9 : 14);
  const drawHead = (b: Block, y: number) => {
    font(twoCols ? 8.5 : 9.5, 30);
    text("#", b.x + 2, y + 3.5);
    text("Article", nameX(b), y + 3.5);
    text("Qté", qtyX(b), y + 3.5, "right");
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.2);
    pdf.line(b.x, y + 5.5, b.x + b.w, y + 5.5);
  };
  const drawRow = (b: Block, r: Row, y: number, zebra: boolean) => {
    if (zebra) {
      pdf.setFillColor(246, 246, 246);
      pdf.rect(b.x, y, b.w, r.h, "F");
    }
    const base = y + d.base;
    font(d.name, 30);
    text(String(r.index + 1), b.x + 2, base);
    r.name.forEach((l, k) => text(l, nameX(b), base + k * d.extra));
    if (r.unit) {
      font(d.unit, 120);
      text(r.unit, nameX(b) + 0.6, base + (r.name.length - 1) * d.extra + d.unitGap);
    }
    font(d.name, 30);
    text(formatQty(r.qty), qtyX(b), base, "right");
  };

  let y = tableTop;
  plan.forEach((page, p) => {
    if (p > 0) {
      pdf.addPage();
      drawCompactHeader();
    }
    let bottom = rowsTop(page.top);
    page.cols.forEach((rs, c) => {
      if (c > 0 && rs.length === 0) return;
      drawHead(blocks[c], page.top);
      let ry = rowsTop(page.top);
      rs.forEach((r, k) => {
        drawRow(blocks[c], r, ry, k % 2 === 1);
        ry += r.h;
      });
      bottom = Math.max(bottom, ry);
    });
    if (twoCols && page.cols[1]?.length) {
      pdf.setDrawColor(220);
      pdf.setLineWidth(0.2);
      pdf.line(W / 2, page.top, W / 2, bottom);
    }
    y = bottom;
  });

  if (lines.length === 0) {
    font(9, 120);
    text("Aucun article", W / 2, y + 6, "center");
    y += 8;
  }

  // Total
  if (y + tailH > LIMIT) {
    pdf.addPage();
    y = drawCompactHeader();
  }
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.2);
  pdf.line(M, y + 1, W - M, y + 1);
  font(8.5, 90);
  text(`Total : ${plural(lines.length, "article")} · ${plural(totalQty, "unité")}`, W - M, y + 5.6, "right");

  // Note, when there is one
  if (noteLines.length) {
    font(8.5, 60);
    noteLines.forEach((l, k) => text(l, M, y + 5.6 + k * 3.8));
  }

  /* ───────── Footer on every page ───────── */
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(230);
    pdf.setLineWidth(0.2);
    pdf.line(M, FOOTER_LINE, W - M, FOOTER_LINE);
    font(7.5, 120);
    text(`Page ${p} / ${pages}`, W / 2, H - 10, "center");
    text("BKTK INTERNATIONAL", W - M, H - 10, "right");
  }

  return pdf.output("arraybuffer");
}
