import { createClient } from "@/lib/supabase/server";

export interface ContractTheme {
  primaryColor: string;
  sectionTitleTextColor: string;
  borderColor: string;
  fontFamily: string;
  baseFontSizePt: number;
  logoMaxHeightPx: number;
}

export const DEFAULT_CONTRACT_THEME: ContractTheme = {
  primaryColor: "#cccccc",
  sectionTitleTextColor: "#000000",
  borderColor: "#333333",
  fontFamily: "Arial, Helvetica, sans-serif",
  baseFontSizePt: 9.5,
  logoMaxHeightPx: 70,
};

export const FONT_FAMILY_OPTIONS = [
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "'Trebuchet MS', Tahoma, sans-serif", label: "Trebuchet MS" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia (serif)" },
  { value: "'Times New Roman', Times, serif", label: "Times New Roman (serif)" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
];

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
