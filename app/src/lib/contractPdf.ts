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

/** Every column that can hold a stored file, for deleting a contract cleanly. */
export const CONTRACT_ARTIFACT_COLUMNS =
  "class_id, contract_number, pdf_path, student_signed_pdf_path, executed_pdf_path, student_signature_path, student_initials_path, school_signature_path";

export interface ContractArtifacts {
  class_id: string;
  contract_number: string;
  pdf_path?: string | null;
  student_signed_pdf_path?: string | null;
  executed_pdf_path?: string | null;
  student_signature_path?: string | null;
  student_initials_path?: string | null;
  school_signature_path?: string | null;
}

/**
 * Every file a contract owns in storage.
 *
 * A contract accumulates files as it is signed — the frozen HTML, the
 * student-signed copy, the executed copy, the drawn marks — and deleting the
 * row without them leaves the lot orphaned, including signature images of a
 * contract that no longer exists.
 */
export function contractArtifactPaths(contract: ContractArtifacts): string[] {
  const paths = [
    contract.pdf_path,
    contract.student_signed_pdf_path,
    contract.executed_pdf_path,
    contract.student_signature_path,
    contract.student_initials_path,
    contract.school_signature_path,
    // The frozen source has no column: its path is fixed by convention.
    `${contract.class_id}/${contract.contract_number}.html`,
  ];

  return [...new Set(paths.filter((p): p is string => Boolean(p)))];
}
