"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function numberField(formData: FormData, name: string): number {
  const n = Number(formData.get(name));
  return Number.isFinite(n) ? n : 0;
}

export async function createClass(formData: FormData) {
  const supabase = await createClient();

  const code = String(formData.get("code") ?? "").trim();
  const program_id = String(formData.get("program_id") ?? "");
  const schedule = String(formData.get("schedule") ?? "Day") as "Day" | "Evening";
  const signer_id = String(formData.get("signer_id") ?? "") || null;
  const method_of_delivery = String(formData.get("method_of_delivery") ?? "Residential") as
    | "Residential"
    | "Blended Hybrid"
    | "Full Distance";
  const cohort_label = String(formData.get("cohort_label") ?? "").trim() || null;

  const { data: cls, error } = await supabase
    .from("classes")
    .insert({
      code,
      program_id,
      schedule,
      signer_id,
      method_of_delivery,
      cohort_label,
      tuition_per_credit: numberField(formData, "tuition_per_credit"),
      credits_total: numberField(formData, "credits_total"),
      weeks_total: numberField(formData, "weeks_total"),
      months_total: numberField(formData, "months_total"),
      min_grade_pct: numberField(formData, "min_grade_pct"),
      testing_fee: numberField(formData, "testing_fee"),
      application_fee_per_sem: numberField(formData, "application_fee_per_sem"),
      registration_fee_per_sem: numberField(formData, "registration_fee_per_sem"),
      skills_lab_fee: numberField(formData, "skills_lab_fee"),
      materials_supplies_fee: numberField(formData, "materials_supplies_fee"),
      books_supplies_fee: numberField(formData, "books_supplies_fee"),
      bls_fee: numberField(formData, "bls_fee"),
      other_costs_fee: numberField(formData, "other_costs_fee"),
      theory_lab_hours_a: numberField(formData, "theory_lab_hours_a"),
      clinical_hours_a: numberField(formData, "clinical_hours_a"),
      theory_lab_hours_b: numberField(formData, "theory_lab_hours_b"),
      clinical_hours_b: numberField(formData, "clinical_hours_b"),
    })
    .select()
    .single();

  if (error || !cls) {
    redirect(`/classes/new?error=${encodeURIComponent(error?.message ?? "Could not create class")}`);
  }

  const semesterRows = [1, 2, 3, 4, 5, 6].map((n) => ({
    class_id: cls.id,
    n,
    start_date: String(formData.get(`sem_${n}_start`) ?? ""),
    end_date: String(formData.get(`sem_${n}_end`) ?? ""),
  }));

  const { error: semError } = await supabase.from("class_semesters").insert(semesterRows);
  if (semError) {
    redirect(`/classes/new?error=${encodeURIComponent(semError.message)}`);
  }

  revalidatePath("/classes");
  redirect(`/classes/${cls.id}`);
}

export async function addStudent(classId: string, formData: FormData) {
  const supabase = await createClient();

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const middle_initial = String(formData.get("middle_initial") ?? "").trim() || null;
  const ssn = String(formData.get("ssn") ?? "").trim() || null;
  const date_of_birth = String(formData.get("date_of_birth") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const mobile = String(formData.get("mobile") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const contract_date = String(formData.get("contract_date") ?? "").trim() || null;

  if (!first_name || !last_name) {
    redirect(`/classes/${classId}?error=${encodeURIComponent("First and last name are required")}`);
  }

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      class_id: classId,
      first_name,
      last_name,
      middle_initial,
      ssn,
      date_of_birth,
      phone,
      mobile,
      address,
      contract_date,
    })
    .select()
    .single();

  if (error || !student) {
    redirect(`/classes/${classId}?error=${encodeURIComponent(error?.message ?? "Could not add student")}`);
  }

  revalidatePath(`/classes/${classId}`);
  redirect(`/classes/${classId}/students/${student.id}`);
}

/** Deletes a student, but only if no contract has ever been issued for them. */
export async function deleteStudent(classId: string, studentId: string): Promise<DeleteClassResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  if (count && count > 0) {
    return { success: false, error: "This student already has an issued contract and cannot be deleted." };
  }

  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/classes/${classId}`);
  return { success: true };
}

export async function updateClass(classId: string, formData: FormData) {
  const supabase = await createClient();

  const code = String(formData.get("code") ?? "").trim();
  const schedule = String(formData.get("schedule") ?? "Day") as "Day" | "Evening";
  const signer_id = String(formData.get("signer_id") ?? "") || null;
  const method_of_delivery = String(formData.get("method_of_delivery") ?? "Residential") as
    | "Residential"
    | "Blended Hybrid"
    | "Full Distance";
  const cohort_label = String(formData.get("cohort_label") ?? "").trim() || null;

  const { error } = await supabase
    .from("classes")
    .update({
      code,
      schedule,
      signer_id,
      method_of_delivery,
      cohort_label,
      tuition_per_credit: numberField(formData, "tuition_per_credit"),
      credits_total: numberField(formData, "credits_total"),
      weeks_total: numberField(formData, "weeks_total"),
      months_total: numberField(formData, "months_total"),
      min_grade_pct: numberField(formData, "min_grade_pct"),
      testing_fee: numberField(formData, "testing_fee"),
      application_fee_per_sem: numberField(formData, "application_fee_per_sem"),
      registration_fee_per_sem: numberField(formData, "registration_fee_per_sem"),
      skills_lab_fee: numberField(formData, "skills_lab_fee"),
      materials_supplies_fee: numberField(formData, "materials_supplies_fee"),
      books_supplies_fee: numberField(formData, "books_supplies_fee"),
      bls_fee: numberField(formData, "bls_fee"),
      other_costs_fee: numberField(formData, "other_costs_fee"),
      theory_lab_hours_a: numberField(formData, "theory_lab_hours_a"),
      clinical_hours_a: numberField(formData, "clinical_hours_a"),
      theory_lab_hours_b: numberField(formData, "theory_lab_hours_b"),
      clinical_hours_b: numberField(formData, "clinical_hours_b"),
    })
    .eq("id", classId);

  if (error) {
    redirect(`/classes/${classId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  const semesterRows = [1, 2, 3, 4, 5, 6].map((n) => ({
    class_id: classId,
    n,
    start_date: String(formData.get(`sem_${n}_start`) ?? ""),
    end_date: String(formData.get(`sem_${n}_end`) ?? ""),
  }));

  const { error: semError } = await supabase
    .from("class_semesters")
    .upsert(semesterRows, { onConflict: "class_id,n" });
  if (semError) {
    redirect(`/classes/${classId}/edit?error=${encodeURIComponent(semError.message)}`);
  }

  revalidatePath(`/classes/${classId}`);
  redirect(`/classes/${classId}`);
}

export interface DeleteClassResult {
  success: boolean;
  error?: string;
}

/** Deletes a class and its students, but only if no contract has ever been issued for it. */
export async function deleteClass(classId: string): Promise<DeleteClassResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);

  if (count && count > 0) {
    return { success: false, error: "This class has issued contracts and cannot be deleted." };
  }

  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/classes");
  return { success: true };
}
