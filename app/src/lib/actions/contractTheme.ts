"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateContractTheme(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("contract_theme")
    .update({
      primary_color: String(formData.get("primary_color") ?? "#cccccc"),
      section_title_text_color: String(formData.get("section_title_text_color") ?? "#000000"),
      border_color: String(formData.get("border_color") ?? "#333333"),
      font_family: String(formData.get("font_family") ?? "Arial, Helvetica, sans-serif"),
      base_font_size_pt: Number(formData.get("base_font_size_pt")) || 9.5,
      logo_max_height_px: Number(formData.get("logo_max_height_px")) || 70,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq("id", "default");

  if (error) {
    redirect(`/contract-theme?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/contract-theme");
  redirect("/contract-theme?saved=1");
}
