"use server";

import { PDFDocument } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

export interface MergeContractsResult {
  pdfBase64?: string;
  skipped: string[]; // student names with no issued contract
  error?: string;
}

/** Merges the issued contract PDFs for the given students into one PDF, in the given order. */
export async function mergeContractPdfs(studentIds: string[]): Promise<MergeContractsResult> {
  if (studentIds.length === 0) return { skipped: [], error: "No students selected" };

  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("students")
    .select("id, first_name, last_name, contracts(pdf_path)")
    .in("id", studentIds);

  if (error) return { skipped: [], error: error.message };

  const merged = await PDFDocument.create();
  const skipped: string[] = [];

  // Preserve the order the caller selected them in.
  const byId = new Map((students ?? []).map((s) => [s.id, s]));

  for (const id of studentIds) {
    const student = byId.get(id);
    const pdfPath = student?.contracts?.[0]?.pdf_path;
    if (!student || !pdfPath) {
      if (student) skipped.push(`${student.first_name} ${student.last_name}`);
      continue;
    }

    const { data: file, error: downloadError } = await supabase.storage.from("contracts").download(pdfPath);
    if (downloadError || !file) {
      skipped.push(`${student.first_name} ${student.last_name}`);
      continue;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const doc = await PDFDocument.load(bytes);
    const copiedPages = await merged.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => merged.addPage(page));
  }

  if (merged.getPageCount() === 0) {
    return { skipped, error: "None of the selected students have an issued contract yet" };
  }

  const mergedBytes = await merged.save();
  return { pdfBase64: Buffer.from(mergedBytes).toString("base64"), skipped };
}
