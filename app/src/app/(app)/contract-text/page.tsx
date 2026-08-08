import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/actions/profile";
import { TextBlockEditor } from "./TextBlockEditor";

export default async function ContractTextPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/classes");

  const supabase = await createClient();
  const { data: blocks } = await supabase.from("contract_text_blocks").select("*").order("key");

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Contract Text</h1>
        <p className="text-sm text-slate-500">
          Edit the legal boilerplate printed on every contract — Cancellation Policy, Methods of Payment,
          Termination Policy, Graduation Requirements, and the signature-page notices. Changes apply to every
          contract generated from now on; contracts already issued are unaffected (they keep their own frozen PDF).
        </p>
      </div>

      <div className="space-y-3">
        {blocks?.map((b) => (
          <TextBlockEditor key={b.key} blockKey={b.key} label={b.label} initialContent={b.content} />
        ))}
      </div>
    </div>
  );
}
