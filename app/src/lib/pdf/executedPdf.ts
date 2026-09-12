import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LOGO_BASE64_PNG } from "./logoBase64";

/**
 * Builds the fully executed PDF.
 *
 * The issued contract's own bytes are never re-rendered — that document is the
 * legal instrument the student read and signed, and regenerating it from live
 * data could quietly produce a different one. Instead both signatures are
 * appended as a signature certificate page, the way e-signature services do it.
 */
export type ExecutedPdfInput = {
  /** The issued contract PDF, exactly as stored. */
  contractPdf: Uint8Array;
  contractNumber: string;
  studentName: string;
  programName: string;
  student: { signaturePng: Uint8Array; signedAt: string; ip: string | null };
  school: { signaturePng: Uint8Array; signedAt: string; name: string; role: string };
};

const NAVY = rgb(0.145, 0.216, 0.482); // #25377B
const BLUE = rgb(0.275, 0.349, 0.639); // #4659A3
const INK = rgb(0.086, 0.137, 0.227);
const MUTED = rgb(0.396, 0.451, 0.545);
const HAIRLINE = rgb(0.78, 0.82, 0.878);

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;

function formatStamp(iso: string): string {
  // Miami is the only place this school operates, so the audit trail reads in
  // its local time rather than UTC.
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "long",
    timeStyle: "short",
  });
}

export async function buildExecutedPdf(input: ExecutedPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(input.contractPdf);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  // Header band.
  const bandHeight = 86;
  const bandTop = PAGE_HEIGHT - bandHeight;
  page.drawRectangle({ x: 0, y: bandTop, width: PAGE_WIDTH, height: bandHeight, color: NAVY });

  const logo = await pdf.embedPng(LOGO_BASE64_PNG);
  const logoHeight = 42;
  const logoWidth = (logo.width / logo.height) * logoHeight;
  page.drawRectangle({
    x: MARGIN,
    y: bandTop + (bandHeight - logoHeight - 12) / 2,
    width: logoWidth + 12,
    height: logoHeight + 12,
    color: rgb(1, 1, 1),
  });
  page.drawImage(logo, {
    x: MARGIN + 6,
    y: bandTop + (bandHeight - logoHeight) / 2,
    width: logoWidth,
    height: logoHeight,
  });

  const titleX = MARGIN + logoWidth + 26;
  page.drawText("SABER COLLEGE", {
    x: titleX,
    y: bandTop + bandHeight / 2 + 6,
    size: 9,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Signature Certificate", {
    x: titleX,
    y: bandTop + bandHeight / 2 - 14,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });

  let y = bandTop - 40;

  page.drawText("This certificate is part of contract " + input.contractNumber + ".", {
    x: MARGIN,
    y,
    size: 10,
    font: regular,
    color: INK,
  });
  y -= 26;

  // Summary rows.
  for (const [label, value] of [
    ["Student", input.studentName],
    ["Program", input.programName],
    ["Contract No.", input.contractNumber],
    ["Status", "Fully executed"],
  ] as const) {
    page.drawText(label.toUpperCase(), { x: MARGIN, y, size: 8, font: bold, color: MUTED });
    page.drawText(value || "—", { x: MARGIN + 110, y, size: 10, font: regular, color: INK });
    y -= 19;
  }

  y -= 14;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + contentWidth, y },
    thickness: 1,
    color: HAIRLINE,
  });
  y -= 34;

  y = await drawSignatureBlock(
    { pdf, page, regular, bold },
    {
      y,
      heading: "Signed by the student",
      png: input.student.signaturePng,
      name: input.studentName,
      role: "Student",
      lines: [
        `Signed ${formatStamp(input.student.signedAt)}`,
        input.student.ip ? `IP address ${input.student.ip}` : null,
      ],
    },
  );

  y -= 26;

  y = await drawSignatureBlock(
    { pdf, page, regular, bold },
    {
      y,
      heading: "Countersigned by SABER College",
      png: input.school.signaturePng,
      name: input.school.name,
      role: input.school.role,
      lines: [`Countersigned ${formatStamp(input.school.signedAt)}`],
    },
  );

  // Legal footing, pinned near the bottom of the page.
  const footer = [
    "Both signatures above were captured electronically. Each signer drew their signature and affirmed that it is",
    "legally binding and equivalent to their handwritten signature, in accordance with the federal E-SIGN Act and",
    "Florida's Uniform Electronic Transactions Act. The date, time and (for the student) originating IP address",
    "recorded here form the audit trail of this agreement.",
  ];
  let footerY = MARGIN + 34;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 22 },
    end: { x: MARGIN + contentWidth, y: footerY + 22 },
    thickness: 1,
    color: HAIRLINE,
  });
  for (const line of footer) {
    page.drawText(line, { x: MARGIN, y: footerY, size: 7.5, font: regular, color: MUTED });
    footerY -= 11;
  }

  return pdf.save();
}

type DrawContext = {
  pdf: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
};

/** Draws one signature: the drawn image sitting on a ruled line, then who and when. Returns the new cursor. */
async function drawSignatureBlock(
  ctx: DrawContext,
  block: {
    y: number;
    heading: string;
    png: Uint8Array;
    name: string;
    role: string;
    lines: (string | null)[];
  },
): Promise<number> {
  const { page, regular, bold } = ctx;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = block.y;

  page.drawText(block.heading.toUpperCase(), { x: MARGIN, y, size: 8, font: bold, color: BLUE });
  y -= 16;

  // The drawn signature is scaled to fit its box while keeping its aspect ratio.
  const boxWidth = contentWidth * 0.6;
  const boxHeight = 64;
  const image = await ctx.pdf.embedPng(block.png);
  const scale = Math.min(boxWidth / image.width, boxHeight / image.height, 1);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  page.drawImage(image, { x: MARGIN + 4, y: y - drawHeight, width: drawWidth, height: drawHeight });
  y -= drawHeight + 6;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + boxWidth, y },
    thickness: 1,
    color: INK,
  });
  y -= 14;

  page.drawText(block.name || "—", { x: MARGIN, y, size: 10, font: bold, color: INK });
  page.drawText(block.role, { x: MARGIN + bold.widthOfTextAtSize(block.name || "—", 10) + 8, y, size: 9, font: regular, color: MUTED });
  y -= 14;

  for (const line of block.lines) {
    if (!line) continue;
    page.drawText(line, { x: MARGIN, y, size: 8.5, font: regular, color: MUTED });
    y -= 12;
  }

  return y;
}
