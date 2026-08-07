"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

function numberField(formData: FormData, name: string): number {
  const raw = formData.get(name);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function programFieldsFromForm(formData: FormData) {
  return {
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim(),
    credential_name: String(formData.get("credential_name") ?? "").trim(),
    degree_type: String(formData.get("degree_type") ?? "associate") as "associate" | "diploma",
    default_tuition_per_credit: numberField(formData, "default_tuition_per_credit"),
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
  };
}

export async function createProgram(formData: FormData) {
  const supabase = await createClient();
  const fields = programFieldsFromForm(formData) satisfies TablesInsert<"programs">;

  const { error } = await supabase.from("programs").insert(fields);
  if (error) redirect(`/programs/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/programs");
  redirect("/programs");
}

export async function updateProgram(programId: string, formData: FormData) {
  const supabase = await createClient();
  const fields = programFieldsFromForm(formData) satisfies TablesUpdate<"programs">;

  const { error } = await supabase.from("programs").update(fields).eq("id", programId);
  if (error) redirect(`/programs/${programId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/programs");
  redirect("/programs");
}

export async function toggleProgramActive(programId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("programs").update({ active }).eq("id", programId);
  if (error) throw new Error(error.message);
  revalidatePath("/programs");
}
