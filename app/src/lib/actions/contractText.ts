"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateContractTextBlock(key: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const content = String(formData.get("content") ?? "");
  const { error } = await supabase
    .from("contract_text_blocks")
    .update({ content, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
    .eq("key", key);

  if (error) return { error: error.message };

  revalidatePath("/contract-text");
  return {};
}
