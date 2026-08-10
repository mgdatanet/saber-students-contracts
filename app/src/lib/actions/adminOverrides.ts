"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/actions/profile";

async function requireAdmin() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") throw new Error("Only admins can do this");
  return profile;
}

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

/**
 * Deletes one erroneous contract: removes its frozen PDF from storage, deletes
 * the audit row, and re-opens the class (unlocks its financial fields) if no
 * other contract still references it. The student and their aid data are kept
 * so they can be corrected and a new, correct contract issued.
 */
export async function adminDeleteContract(contractId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select("id, class_id, student_id, pdf_path")
    .eq("id", contractId)
    .single();

  if (fetchError || !contract) return { success: false, error: fetchError?.message ?? "Contract not found" };

  if (contract.pdf_path) {
    await supabase.storage.from("contracts").remove([contract.pdf_path]);
  }

  const { error: deleteError } = await supabase.from("contracts").delete().eq("id", contractId);
  if (deleteError) return { success: false, error: deleteError.message };

  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("class_id", contract.class_id);

  if (!count || count === 0) {
    await supabase.from("classes").update({ locked: false }).eq("id", contract.class_id);
  }

  revalidatePath(`/classes/${contract.class_id}`);
  revalidatePath(`/classes/${contract.class_id}/students/${contract.student_id}`);
  return { success: true };
}

/**
 * Full admin override: deletes a student outright, even if they already have
 * an issued contract (deletes that contract first, same as adminDeleteContract).
 * Use for a student that should never have existed — otherwise prefer
 * adminDeleteContract + correct the data + reissue.
 */
export async function adminDeleteStudent(classId: string, studentId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, pdf_path")
    .eq("student_id", studentId);

  for (const c of contracts ?? []) {
    if (c.pdf_path) await supabase.storage.from("contracts").remove([c.pdf_path]);
  }
  if (contracts && contracts.length > 0) {
    await supabase
      .from("contracts")
      .delete()
      .in("id", contracts.map((c) => c.id));
  }

  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) return { success: false, error: error.message };

  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
  if (!count || count === 0) {
    await supabase.from("classes").update({ locked: false }).eq("id", classId);
  }

  revalidatePath(`/classes/${classId}`);
  return { success: true };
}
