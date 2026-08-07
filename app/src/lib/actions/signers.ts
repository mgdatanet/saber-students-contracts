"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSigner(formData: FormData) {
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;

  if (!full_name) return;

  const { error } = await supabase.from("signers").insert({ full_name, title });
  if (error) throw new Error(error.message);

  revalidatePath("/signers");
}

export async function toggleSignerActive(signerId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("signers").update({ active }).eq("id", signerId);
  if (error) throw new Error(error.message);
  revalidatePath("/signers");
}
