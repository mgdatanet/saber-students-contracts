import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CONTRACT_THEME, type ContractTheme } from "@/lib/contractTheme";

export async function fetchContractTheme(): Promise<ContractTheme> {
  const supabase = await createClient();
  const { data } = await supabase.from("contract_theme").select("*").eq("id", "default").single();

  if (!data) return DEFAULT_CONTRACT_THEME;

  return {
    primaryColor: data.primary_color,
    sectionTitleTextColor: data.section_title_text_color,
    borderColor: data.border_color,
    fontFamily: data.font_family,
    baseFontSizePt: Number(data.base_font_size_pt),
    logoMaxHeightPx: data.logo_max_height_px,
  };
}
