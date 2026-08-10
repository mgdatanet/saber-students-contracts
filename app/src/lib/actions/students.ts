"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/actions/profile";

/** Once a contract is issued, only an admin may still edit that student's data (to fix a mistake). */
async function assertCanEditLockedStudent(studentId: string): Promise<string | null> {
  const supabase = await createClient();
  const { profile } = await requireProfile();
  if (profile.role === "admin") return null;

  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  if (count && count > 0) {
    return "This student already has an issued contract. Only an admin can edit their data now.";
  }
  return null;
}

export interface SemesterAidForm {
  n: number;
  credits: number;
  fees: number;
  pell: number;
  sub: number;
  unsub: number;
  plus: number;
  efc: number;
}

export async function saveStudentIdentity(classId: string, studentId: string, formData: FormData): Promise<void> {
  const lockError = await assertCanEditLockedStudent(studentId);
  if (lockError) {
    redirect(`/classes/${classId}/students/${studentId}?error=${encodeURIComponent(lockError)}`);
  }

  const supabase = await createClient();

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();

  if (!first_name || !last_name) {
    redirect(`/classes/${classId}/students/${studentId}?error=${encodeURIComponent("First and last name are required")}`);
  }

  const { error } = await supabase
    .from("students")
    .update({
      first_name,
      last_name,
      middle_initial: String(formData.get("middle_initial") ?? "").trim() || null,
      ssn: String(formData.get("ssn") ?? "").trim() || null,
      date_of_birth: String(formData.get("date_of_birth") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      mobile: String(formData.get("mobile") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      contract_date: String(formData.get("contract_date") ?? "").trim() || null,
    })
    .eq("id", studentId);

  if (error) {
    redirect(`/classes/${classId}/students/${studentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/classes/${classId}/students/${studentId}`);
  revalidatePath(`/classes/${classId}`);
}

export async function saveStudentAid(
  classId: string,
  studentId: string,
  semesters: SemesterAidForm[]
): Promise<{ error?: string }> {
  const lockError = await assertCanEditLockedStudent(studentId);
  if (lockError) return { error: lockError };

  const supabase = await createClient();

  for (const s of semesters) {
    const { error } = await supabase
      .from("student_semester_aid")
      .update({
        credits: s.credits,
        fees: s.fees,
        pell: s.pell,
        sub: s.sub,
        unsub: s.unsub,
        plus: s.plus,
        efc: s.efc,
      })
      .eq("student_id", studentId)
      .eq("semester_n", s.n);

    if (error) return { error: error.message };
  }

  revalidatePath(`/classes/${classId}/students/${studentId}`);
  revalidatePath(`/classes/${classId}`);
  return {};
}
