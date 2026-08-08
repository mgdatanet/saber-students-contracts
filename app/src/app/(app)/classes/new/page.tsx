import { createClient } from "@/lib/supabase/server";
import { createClass } from "@/lib/actions/classes";
import { ClassForm } from "./ClassForm";

export default async function NewClassPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: programs }, { data: signers }] = await Promise.all([
    supabase.from("programs").select("*").eq("active", true).order("code"),
    supabase.from("signers").select("*").eq("active", true).order("full_name"),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-lg font-semibold text-slate-900 mb-4">New Class</h1>
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <ClassForm action={createClass} programs={programs ?? []} signers={signers ?? []} error={error} />
      </div>
    </div>
  );
}
