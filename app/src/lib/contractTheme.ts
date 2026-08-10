// Pure constants/types only — safe to import from Client Components.
// The DB-fetching function lives in contractThemeServer.ts (server-only).

export interface ContractTheme {
  primaryColor: string;
  sectionTitleTextColor: string;
  borderColor: string;
  fontFamily: string;
  baseFontSizePt: number;
  logoMaxHeightPx: number;
}

export const DEFAULT_CONTRACT_THEME: ContractTheme = {
  primaryColor: "#4d4d4d",
  sectionTitleTextColor: "#ffffff",
  borderColor: "#000000",
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
