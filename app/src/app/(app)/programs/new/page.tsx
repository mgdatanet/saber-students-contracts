import { createProgram } from "@/lib/actions/programs";
import { ProgramForm } from "../ProgramForm";

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-brand-navy mb-4">New Program</h1>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <ProgramForm action={createProgram} error={error} submitLabel="Create Program" />
      </div>
    </div>
  );
}
