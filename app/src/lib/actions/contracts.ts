"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { computeContract, validateStudent, type SemesterAidInput } from "@/lib/calc";
import { renderHtmlToPdf } from "@/lib/pdf/renderPdf";
import { contractHtmlPath, renderContractHtmlFor } from "@/lib/pdf/contractDocument";

export interface IssueResult {
  success: boolean;
  error?: string;
  contractNumber?: string;
}

/** Issues one contract: validates, renders the PDF, stores it, and writes the audit row. */
export async function issueContract(classId: string, studentId: string): Promise<IssueResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  const [{ data: cls }, { data: semesterDates }, { data: student }] = await Promise.all([
    supabase.from("classes").select("*, programs(name, credential_name, degree_type), signers(full_name)").eq("id", classId).single(),
    supabase.from("class_semesters").select("*").eq("class_id", classId).order("n"),
    supabase.from("students").select("*, student_semester_aid(*), contracts(id)").eq("id", studentId).single(),
  ]);

  if (!cls || !student) return { success: false, error: "Class or student not found" };
  if ((student.contracts?.length ?? 0) > 0) return { success: false, error: "Contract already issued for this student" };

  const hasSixSemesterDates =
    (semesterDates?.length ?? 0) === 6 && semesterDates!.every((s) => s.start_date && s.end_date);

  const aid: SemesterAidInput[] = (student.student_semester_aid ?? [])
    .slice()
    .sort((a, b) => a.semester_n - b.semester_n)
    .map((a) => ({
      n: a.semester_n,
      credits: a.credits,
      fees: a.fees,
      pell: a.pell,
      sub: a.sub,
      unsub: a.unsub,
      plus: a.plus,
      efc: a.efc,
    }));

  const validation = validateStudent(
    { firstName: student.first_name, lastName: student.last_name, ssn: student.ssn, dateOfBirth: student.date_of_birth },
    aid,
    cls.credits_total,
    hasSixSemesterDates,
    cls.tuition_per_credit
  );

  if (!validation.readyToIssue) {
    return { success: false, error: validation.errors.join("; ") || "Student is not ready to issue" };
  }

  // Step 1: insert the audit row (contract_number auto-assigned by the DB trigger,
  // and this also freezes the class's financial snapshot via the lock trigger).
  const { data: contract, error: insertError } = await supabase
    .from("contracts")
    .insert({
      contract_number: null as unknown as string, // trigger fills this in
      student_id: studentId,
      class_id: classId,
      tuition_per_credit_applied: cls.tuition_per_credit,
      issued_by: user.id,
      totals_snapshot: buildTotalsSnapshot(aid, cls.tuition_per_credit),
    })
    .select()
    .single();

  if (insertError || !contract) {
    return { success: false, error: insertError?.message ?? "Could not create contract record" };
  }

  // Step 2: render and store the PDF, then attach its path (the only allowed update).
  try {
    const html = await renderContractHtmlFor(supabase, classId, studentId, contract.contract_number);
    if (!html) return { success: false, error: "Could not render the contract" };

    // The HTML is frozen alongside the PDF. Signing fills in this exact
    // document's signature boxes rather than rendering a new one, so the signed
    // contract is provably the contract that was issued.
    const { error: htmlError } = await supabase.storage
      .from("contracts")
      .upload(contractHtmlPath(classId, contract.contract_number), html, {
        contentType: "text/html; charset=utf-8",
        upsert: true,
      });
    if (htmlError) return { success: false, error: `Could not store the contract source: ${htmlError.message}` };

    const pdfBuffer = await renderHtmlToPdf(html);
    const pdfPath = `${classId}/${contract.contract_number}.pdf`;

    const { error: uploadError } = await supabase.storage.from("contracts").upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (uploadError) return { success: false, error: `PDF stored failed: ${uploadError.message}` };

    const { error: attachError } = await supabase.from("contracts").update({ pdf_path: pdfPath }).eq("id", contract.id);
    if (attachError) return { success: false, error: `Could not attach PDF: ${attachError.message}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "PDF generation failed" };
  }

  revalidatePath(`/classes/${classId}`);
  revalidatePath(`/classes/${classId}/students/${studentId}`);

  return { success: true, contractNumber: contract.contract_number };
}

function buildTotalsSnapshot(aid: SemesterAidInput[], rate: number): Json {
  return computeContract(aid, rate) as unknown as Json;
}

export async function getContractDownloadUrl(pdfPath: string, forceDownload = false): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(pdfPath, 60 * 10, forceDownload ? { download: true } : undefined);
  if (error) return null;
  return data.signedUrl;
}

export async function issueAllReadyContracts(classId: string): Promise<{ issued: number; errors: string[] }> {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, contracts(id)")
    .eq("class_id", classId);

  const errors: string[] = [];
  let issued = 0;

  for (const s of students ?? []) {
    if ((s.contracts?.length ?? 0) > 0) continue;
    const result = await issueContract(classId, s.id);
    if (result.success) issued += 1;
    else errors.push(`${s.id}: ${result.error}`);
  }

  return { issued, errors };
}
