import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateClass } from "@/lib/actions/classes";
import { ClassForm } from "../../new/ClassForm";

export default async function EditClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: cls }, { data: semesters }, { data: programs }, { data: signers }] = await Promise.all([
    supabase.from("classes").select("*").eq("id", id).single(),
    supabase.from("class_semesters").select("n, start_date, end_date").eq("class_id", id).order("n"),
    supabase.from("programs").select("*").order("code"),
    supabase.from("signers").select("*").order("full_name"),
  ]);

  if (!cls) notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-brand-navy mb-4">Edit Class — {cls.code}</h1>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <ClassForm
          action={updateClass.bind(null, id)}
          programs={programs ?? []}
          signers={signers ?? []}
          error={error}
          defaultValues={cls}
          defaultSemesters={semesters ?? []}
          locked={cls.locked}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
