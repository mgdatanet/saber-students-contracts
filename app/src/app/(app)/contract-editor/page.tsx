import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { fetchContractTheme } from "@/lib/contractThemeServer";
import { ContractDesignForm } from "./ContractDesignForm";

export default async function ContractEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/classes");

  const { error, saved } = await searchParams;
  const supabase = await createClient();

  const [{ data: blocks }, theme] = await Promise.all([
    supabase.from("contract_text_blocks").select("*").order("key"),
    fetchContractTheme(),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Contract Editor</h1>
        <p className="text-sm text-slate-500">
          Every visual and text modifier for the printed contract lives here — colors, font, logo size, and the
          legal boilerplate text.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
          Saved. New contracts will use these changes.
        </div>
      )}

      <ContractDesignForm textBlocks={blocks ?? []} theme={theme} />
    </div>
  );
}
