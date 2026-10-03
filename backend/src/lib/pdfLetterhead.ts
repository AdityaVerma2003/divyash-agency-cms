import path from "path";

// Shared letterhead for every PDF export (invoices, monthly reports, …) — the
// header/footer chrome should look identical everywhere; only the content in
// between is specific to each document. Matches the branded sample invoice
// layout: big bold document title top-left, full wordmark+tagline logo
// top-right, and a full-bleed indigo contact bar at the bottom of every page.

export const BRAND = "#6366F1";
export const MUTED = "#6B7280";
export const INK = "#101828";
export const LIGHT = "#F4F5FF";
export const LINE = "#E5E7EB";

export const MARGIN = 45;
export const PAGE_W = 595 - MARGIN * 2; // A4 width = 595pt
export const A4_H = 841;

// Same resolution trick the pre-existing per-file LOGO_PATH constants used —
// __dirname is backend/src/lib (dev, tsx) or backend/dist/lib (prod, tsc) and
// src/assets sits beside dist either way, so this resolves correctly in both.
const LOGO_PATH = path.join(__dirname, "../../src/assets/letterhead-logo.png");
const LOGO_W = 150;
const LOGO_H = LOGO_W * (105 / 384); // the source asset's own aspect ratio

const CONTACT_PHONES = "+91 88103 76026  ·  92664 52049";
const CONTACT_EMAIL = "info@divyashdigital.co.in";
const CONTACT_WEB = "www.divyashdigital.co.in";

export const HEADER_H = 70;
export const FOOTER_H = 34;

// PDFKit's built-in Helvetica has no glyph for ₹ (U+20B9) — it silently
// substitutes a superscript "1"-like glyph instead. Inter (already the
// portal's own font, OFL-1.1 licensed) covers it, so every PDF registers
// and uses these in place of Helvetica/Helvetica-Bold.
export const FONT_REGULAR = "Inter";
export const FONT_BOLD = "Inter-Bold";
const FONT_REGULAR_PATH = path.join(__dirname, "../../src/assets/Inter-Regular.ttf");
const FONT_BOLD_PATH = path.join(__dirname, "../../src/assets/Inter-Bold.ttf");

export function registerLetterheadFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(FONT_REGULAR, FONT_REGULAR_PATH);
  doc.registerFont(FONT_BOLD, FONT_BOLD_PATH);
}

/**
 * Renders the shared header: the document's big bold title top-left (and an
 * optional one-line subtitle under it, e.g. a client + period line), the
 * branded logo top-right. Returns the y-coordinate below which the caller's
 * own content should start.
 */
export function renderLetterheadHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string): number {
  try {
    doc.image(LOGO_PATH, MARGIN + PAGE_W - LOGO_W, MARGIN, { width: LOGO_W, height: LOGO_H });
  } catch {
    // logo missing — skip silently, matches the previous per-file behavior
  }

  const titleMaxW = PAGE_W - LOGO_W - 16;
  doc.fontSize(26).fillColor(INK).font(FONT_BOLD);
  // Measured, not assumed — a longer title (e.g. "MONTHLY PERFORMANCE
  // REPORT") wraps to two lines, and a fixed single-line offset would let
  // the subtitle collide with the title's second line.
  const titleHeight = doc.heightOfString(title, { width: titleMaxW });
  doc.text(title, MARGIN, MARGIN, { width: titleMaxW });

  let y = MARGIN + titleHeight + 6;
  if (subtitle) {
    doc.fontSize(10).fillColor(MUTED).font(FONT_REGULAR)
      .text(subtitle, MARGIN, y, { width: titleMaxW });
    y += 16;
  }

  return Math.max(y, MARGIN + LOGO_H) + 16;
}

/**
 * Renders the shared full-bleed indigo contact bar at the bottom of the
 * current page. `extra` prepends document-specific context (e.g. the report
 * footer's previous "<client> · <month> Report" segment) before the
 * standard contact details.
 */
export function renderLetterheadFooter(doc: PDFKit.PDFDocument, pageH: number, extra?: string): void {
  const barY = pageH - FOOTER_H;
  // Full-bleed — spans the entire page width, not just the content margins.
  doc.rect(0, barY, 595, FOOTER_H).fill(BRAND);

  const segments = [extra, CONTACT_PHONES, CONTACT_EMAIL, CONTACT_WEB].filter(Boolean);
  doc.fontSize(8.5).fillColor("#FFFFFF").font(FONT_REGULAR)
    .text(segments.join("   ·   "), MARGIN, barY + FOOTER_H / 2 - 5, { width: PAGE_W, align: "center" });

  // Reset fill color so any caller drawing after the footer (e.g. on a new
  // page) isn't left with white text by accident.
  doc.fillColor(INK);
}
