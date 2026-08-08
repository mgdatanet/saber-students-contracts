import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/actions/profile";
import { fetchContractTheme, FONT_FAMILY_OPTIONS } from "@/lib/contractTheme";
import { updateContractTheme } from "@/lib/actions/contractTheme";

export default async function ContractThemePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/classes");

  const { error, saved } = await searchParams;
  const theme = await fetchContractTheme();

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Contract Appearance</h1>
        <p className="text-sm text-slate-500">
          Safe visual settings for the printed contract — colors, font, and logo size. The legal layout (TILA
          disclosure boxes, payment schedule table, page structure) is fixed and cannot be changed here, so a
          visual tweak can never break federal compliance formatting.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          Saved. New contracts will use this appearance.
        </div>
      )}

      <form action={updateContractTheme} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Section header background color</label>
            <div className="flex items-center gap-2">
              <input type="color" name="primary_color" defaultValue={theme.primaryColor} className="h-9 w-14 rounded border border-slate-300" />
              <span className="text-xs text-slate-400">e.g. the gray bar behind &ldquo;Cancellation and Refund Policy&rdquo;</span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Section header text color</label>
            <input
              type="color"
              name="section_title_text_color"
              defaultValue={theme.sectionTitleTextColor}
              className="h-9 w-14 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Table border color</label>
            <input type="color" name="border_color" defaultValue={theme.borderColor} className="h-9 w-14 rounded border border-slate-300" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Logo max height (px)</label>
            <input
              type="number"
              name="logo_max_height_px"
              defaultValue={theme.logoMaxHeightPx}
              min={20}
              max={150}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Font</label>
            <select name="font_family" defaultValue={theme.fontFamily} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {FONT_FAMILY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Base font size (pt)</label>
            <input
              type="number"
              name="base_font_size_pt"
              defaultValue={theme.baseFontSizePt}
              min={7}
              max={12}
              step="0.5"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button type="submit" className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800">
          Save Appearance
        </button>
        <p className="text-xs text-slate-400">
          Applies to every contract generated from now on. Already-issued contracts keep their own frozen PDF.
        </p>
      </form>
    </div>
  );
}
