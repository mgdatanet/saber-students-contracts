import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProgram } from "@/lib/actions/programs";
import { ProgramForm } from "../ProgramForm";

export default async function EditProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: program } = await supabase.from("programs").select("*").eq("id", id).single();

  if (!program) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-semibold text-slate-900 mb-4">Edit Program — {program.code}</h1>
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <ProgramForm
          action={updateProgram.bind(null, id)}
          defaultValues={program}
          error={error}
          submitLabel="Save Changes"
        />
      </div>
      <p className="text-xs text-slate-400 mt-3">
        Changes here only affect new classes created from this program. Classes already created keep their own
        snapshot of these numbers (and are frozen once a contract has been issued).
      </p>
    </div>
  );
}
