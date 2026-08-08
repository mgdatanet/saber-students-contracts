"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONTRACT_TEXT_BLOCK_KEYS, type ContractTextBlocks } from "@/lib/contractText";
import { DEFAULT_CONTRACT_THEME, type ContractTheme } from "@/lib/contractTheme";
import { renderContractHtml } from "@/lib/pdf/contractHtml";
import { renderHtmlToPdf } from "@/lib/pdf/renderPdf";
import type { SemesterAidInput } from "@/lib/calc";

function themeFromFormData(formData: FormData): ContractTheme {
  return {
    primaryColor: String(formData.get("primary_color") ?? DEFAULT_CONTRACT_THEME.primaryColor),
    sectionTitleTextColor: String(formData.get("section_title_text_color") ?? DEFAULT_CONTRACT_THEME.sectionTitleTextColor),
    borderColor: String(formData.get("border_color") ?? DEFAULT_CONTRACT_THEME.borderColor),
    fontFamily: String(formData.get("font_family") ?? DEFAULT_CONTRACT_THEME.fontFamily),
    baseFontSizePt: Number(formData.get("base_font_size_pt")) || DEFAULT_CONTRACT_THEME.baseFontSizePt,
    logoMaxHeightPx: Number(formData.get("logo_max_height_px")) || DEFAULT_CONTRACT_THEME.logoMaxHeightPx,
  };
}

function textBlocksFromFormData(formData: FormData): ContractTextBlocks {
  const blocks: ContractTextBlocks = {};
  for (const key of CONTRACT_TEXT_BLOCK_KEYS) {
    const value = formData.get(`text_${key}`);
    if (value !== null) blocks[key] = String(value);
  }
  return blocks;
}

export async function saveContractDesign(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const theme = themeFromFormData(formData);
  const { error: themeError } = await supabase
    .from("contract_theme")
    .update({
      primary_color: theme.primaryColor,
      section_title_text_color: theme.sectionTitleTextColor,
      border_color: theme.borderColor,
      font_family: theme.fontFamily,
      base_font_size_pt: theme.baseFontSizePt,
      logo_max_height_px: theme.logoMaxHeightPx,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq("id", "default");

  if (themeError) {
    redirect(`/contract-editor?error=${encodeURIComponent(themeError.message)}`);
  }

  for (const key of CONTRACT_TEXT_BLOCK_KEYS) {
    const value = formData.get(`text_${key}`);
    if (value === null) continue;
    const { error } = await supabase
      .from("contract_text_blocks")
      .update({ content: String(value), updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
      .eq("key", key);
    if (error) {
      redirect(`/contract-editor?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/contract-editor");
  redirect("/contract-editor?saved=1");
}

// Fixed sample data (Ana Muguerza Horta's verified fixture from ESPECIFICACION.md)
// used purely to render a representative preview — never touches real student data.
const SAMPLE_SEMESTERS: SemesterAidInput[] = [
  { n: 1, credits: 13, fees: 217, pell: 3698, sub: 1732, unsub: 2969, plus: 0, efc: -1500 },
  { n: 2, credits: 13, fees: 217, pell: 3698, sub: 1732, unsub: 2969, plus: 0, efc: -1500 },
  { n: 3, credits: 13, fees: 603, pell: 3697, sub: 2227, unsub: 2969, plus: 0, efc: -1500 },
  { n: 4, credits: 14, fees: 603, pell: 3697, sub: 2227, unsub: 2969, plus: 0, efc: -1500 },
  { n: 5, credits: 13, fees: 603, pell: 0, sub: 2721, unsub: 3464, plus: 0, efc: 0 },
  { n: 6, credits: 14, fees: 603, pell: 0, sub: 2721, unsub: 3464, plus: 0, efc: 0 },
];
const SAMPLE_SEMESTER_DATES = [
  { n: 1, startDate: "2026-07-13", endDate: "2026-11-01" },
  { n: 2, startDate: "2026-11-09", endDate: "2027-03-07" },
  { n: 3, startDate: "2027-03-15", endDate: "2027-06-27" },
  { n: 4, startDate: "2027-07-05", endDate: "2027-10-24" },
  { n: 5, startDate: "2027-11-01", endDate: "2028-02-27" },
  { n: 6, startDate: "2028-03-06", endDate: "2028-07-02" },
];

export async function previewContractDesign(formData: FormData): Promise<{ pdfBase64?: string; error?: string }> {
  try {
    const theme = themeFromFormData(formData);
    const textBlocks = textBlocksFromFormData(formData);

    const html = renderContractHtml({
      student: {
        firstName: "Ana",
        lastName: "Muguerza Horta",
        ssn: "307-83-0409",
        dateOfBirth: "2002-08-12",
        phone: null,
        mobile: "786-651-4796",
        address: "3545 NE 167 St apt#207, Miami FL 33160",
        contractDate: "2026-07-13",
      },
      program: { name: "Professional Nursing", credentialName: "Associate in Science", degreeType: "associate" },
      klass: {
        schedule: "Evening",
        methodOfDelivery: "Residential",
        tuitionPerCredit: 582,
        creditsTotal: 80,
        weeksTotal: 96,
        monthsTotal: 24,
        minGradePct: 77,
        testingFee: 50,
        applicationFeePerSem: 50,
        registrationFeePerSem: 100,
        skillsLabFee: 500,
        materialsSuppliesFee: 300,
        booksSuppliesFee: 1546.23,
        blsFee: 300,
        otherCostsFee: 300,
        theoryLabHoursA: 885,
        clinicalHoursA: 630,
        theoryLabHoursB: 210,
        clinicalHoursB: 0,
      },
      semesters: SAMPLE_SEMESTERS,
      semesterDates: SAMPLE_SEMESTER_DATES,
      signerName: "Dayanis Camps",
      contractNumber: "SC-PREVIEW",
      textBlocks,
      theme,
    });

    const pdf = await renderHtmlToPdf(html);
    return { pdfBase64: pdf.toString("base64") };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Preview failed" };
  }
}
