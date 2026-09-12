import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SemesterAidInput } from "@/lib/calc";
import { renderContractHtml } from "./contractHtml";
import { fetchContractTextBlocksWith } from "@/lib/contractText";
import { fetchContractThemeWith } from "@/lib/contractThemeServer";

type Client = SupabaseClient<Database>;

/** Where a contract's frozen HTML source lives, next to its PDF. */
export function contractHtmlPath(classId: string, contractNumber: string): string {
  return `${classId}/${contractNumber}.html`;
}

/**
 * Renders the contract's HTML from the data as it stands right now.
 *
 * This is what gets frozen into storage the moment a contract is issued. Every
 * later version of the document — the one the student reads, the one they sign,
 * the fully executed one — is that same stored HTML with signature boxes filled
 * in, never a fresh render, so the signed contract is provably the contract
 * that was issued.
 */
export async function renderContractHtmlFor(
  supabase: Client,
  classId: string,
  studentId: string,
  contractNumber: string,
): Promise<string | null> {
  const [{ data: cls }, { data: semesterDates }, { data: student }, textBlocks, theme] = await Promise.all([
    supabase
      .from("classes")
      .select("*, programs(name, credential_name, degree_type), signers(full_name)")
      .eq("id", classId)
      .single(),
    supabase.from("class_semesters").select("*").eq("class_id", classId).order("n"),
    supabase.from("students").select("*, student_semester_aid(*)").eq("id", studentId).single(),
    fetchContractTextBlocksWith(supabase),
    fetchContractThemeWith(supabase),
  ]);

  if (!cls || !student) return null;

  const semesters: SemesterAidInput[] = (student.student_semester_aid ?? [])
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

  return renderContractHtml({
    student: {
      firstName: student.first_name,
      lastName: student.last_name,
      ssn: student.ssn,
      dateOfBirth: student.date_of_birth,
      phone: student.phone,
      mobile: student.mobile,
      address: student.address,
      contractDate: student.contract_date,
    },
    program: {
      name: cls.programs?.name ?? "",
      credentialName: cls.programs?.credential_name ?? "",
      degreeType: (cls.programs?.degree_type ?? "associate") as "associate" | "diploma",
    },
    klass: {
      schedule: cls.schedule,
      methodOfDelivery: cls.method_of_delivery,
      tuitionPerCredit: cls.tuition_per_credit,
      creditsTotal: cls.credits_total,
      weeksTotal: cls.weeks_total,
      monthsTotal: cls.months_total,
      minGradePct: cls.min_grade_pct,
      testingFee: cls.testing_fee,
      applicationFeePerSem: cls.application_fee_per_sem,
      registrationFeePerSem: cls.registration_fee_per_sem,
      skillsLabFee: cls.skills_lab_fee,
      materialsSuppliesFee: cls.materials_supplies_fee,
      booksSuppliesFee: cls.books_supplies_fee,
      blsFee: cls.bls_fee,
      otherCostsFee: cls.other_costs_fee,
      theoryLabHoursA: cls.theory_lab_hours_a,
      clinicalHoursA: cls.clinical_hours_a,
      theoryLabHoursB: cls.theory_lab_hours_b,
      clinicalHoursB: cls.clinical_hours_b,
    },
    semesters,
    semesterDates: (semesterDates ?? []).map((d) => ({ n: d.n, startDate: d.start_date, endDate: d.end_date })),
    signerName: cls.signers?.full_name ?? "",
    contractNumber,
    textBlocks,
    theme,
  });
}

/**
 * The contract's frozen HTML, falling back to a fresh render for contracts
 * issued before the HTML started being stored. `frozen` says which it was, so
 * callers can be honest about it rather than quietly implying provenance.
 */
export async function loadContractHtml(
  supabase: Client,
  contract: { class_id: string; student_id: string; contract_number: string },
): Promise<{ html: string | null; frozen: boolean }> {
  const path = contractHtmlPath(contract.class_id, contract.contract_number);
  const { data } = await supabase.storage.from("contracts").download(path);

  if (data) return { html: await data.text(), frozen: true };

  const html = await renderContractHtmlFor(
    supabase,
    contract.class_id,
    contract.student_id,
    contract.contract_number,
  );
  return { html, frozen: false };
}
