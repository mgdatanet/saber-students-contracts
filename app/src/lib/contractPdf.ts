/**
 * Which stored PDF *is* the contract right now.
 *
 * A contract gains versions as it is signed, and anywhere someone asks to see
 * "the contract" they mean the most complete one — showing the blank issued
 * copy of an executed agreement reads as if the signatures were lost.
 */
export function currentContractPdfPath(contract: {
  pdf_path?: string | null;
  student_signed_pdf_path?: string | null;
  executed_pdf_path?: string | null;
}): string | null {
  return contract.executed_pdf_path ?? contract.student_signed_pdf_path ?? contract.pdf_path ?? null;
}

/** The columns `currentContractPdfPath` needs, for embedding in a select(). */
export const CONTRACT_PDF_COLUMNS = "pdf_path, student_signed_pdf_path, executed_pdf_path";
