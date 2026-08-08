import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addStudent } from "@/lib/actions/classes";
import { computeContract, validateStudent } from "@/lib/calc";
import { GenerateAllButton } from "./GenerateAllButton";
import { DownloadContractLink } from "./DownloadContractLink";
import { DeleteClassButton } from "../DeleteClassButton";

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: cls }, { data: semesters }, { data: students }] = await Promise.all([
    supabase.from("classes").select("*, programs(code, name)").eq("id", id).single(),
    supabase.from("class_semesters").select("*").eq("class_id", id).order("n"),
    supabase
      .from("students")
      .select("*, student_semester_aid(*), contracts(id, contract_number, pdf_path)")
      .eq("class_id", id)
      .order("last_name"),
  ]);

  if (!cls) notFound();

  const hasSixSemesterDates = (semesters?.length ?? 0) === 6 && semesters!.every((s) => s.start_date && s.end_date);

  const studentRows = (students ?? []).map((s) => {
    const aid = (s.student_semester_aid ?? [])
      .slice()
      .sort((a, b) => a.semester_n - b.semester_n)
      .map((a) => ({
        n: a.semester_n,
        credits: a.credits,
        fees: a.fees,
        pell: a.pell,
        sub: a.sub,
        unsub: a.unsub,
        plus: a.plus,
        efc: a.efc,
      }));
    const validation = validateStudent(
      { firstName: s.first_name, lastName: s.last_name, ssn: s.ssn, dateOfBirth: s.date_of_birth },
      aid,
      cls.credits_total,
      hasSixSemesterDates,
      cls.tuition_per_credit
    );
    const totals = computeContract(aid, cls.tuition_per_credit);
    const hasContract = (s.contracts?.length ?? 0) > 0;
    const pdfPath = s.contracts?.[0]?.pdf_path ?? null;

    return { student: s, validation, totals, hasContract, pdfPath };
  });

  const readyCount = studentRows.filter((r) => r.validation.readyToIssue && !r.hasContract).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/classes" className="text-sm text-slate-500 hover:text-slate-700">
          ← Classes
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{cls.code}</h1>
            <p className="text-sm text-slate-500">
              {cls.programs?.name} · {cls.schedule} · {formatDeliveryLabel(cls.method_of_delivery)} ·{" "}
              {cls.locked ? "Locked" : "Open"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/classes/${id}/edit`}
              className="rounded-md border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50"
            >
              Edit Class
            </Link>
            {!cls.locked && (
              <DeleteClassButton classId={id} classCode={cls.code} afterDeleteHref="/classes" />
            )}
            {readyCount > 0 && <GenerateAllButton classId={id} readyCount={readyCount} />}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {!hasSixSemesterDates && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          This class is missing one or more semester start/end dates. No contract can be issued until all 6
          semesters have dates.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Credits</th>
              <th className="px-4 py-2">Total cost</th>
              <th className="px-4 py-2">Total aid</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {studentRows.map(({ student, validation, totals, hasContract, pdfPath }) => (
              <tr key={student.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/classes/${id}/students/${student.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {student.first_name} {student.last_name}
                  </Link>
                </td>
                <td className="px-4 py-2">{totals.creditsTotal}</td>
                <td className="px-4 py-2">${totals.costeTotal.toLocaleString()}</td>
                <td className="px-4 py-2">${totals.ayudaTotal.toLocaleString()}</td>
                <td className="px-4 py-2">
                  <StatusBadge hasContract={hasContract} validation={validation} />
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  {hasContract && <DownloadContractLink pdfPath={pdfPath} />}
                  <Link href={`/classes/${id}/students/${student.id}`} className="text-slate-600 hover:text-slate-900">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {studentRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No students in this class yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h2 className="text-sm font-medium text-slate-900 mb-3">Add Student</h2>
        <form action={addStudent.bind(null, id)} className="grid grid-cols-3 gap-3">
          <Field name="first_name" label="First name" required />
          <Field name="last_name" label="Last name" required />
          <Field name="middle_initial" label="Middle initial" />
          <Field name="ssn" label="SS # (999-99-9999)" />
          <Field name="date_of_birth" label="Date of birth" type="date" />
          <Field name="phone" label="Telephone" />
          <Field name="mobile" label="Cell phone" />
          <Field name="contract_date" label="Contract date" type="date" />
          <Field name="address" label="Current address" className="col-span-3" />
          <div className="col-span-3">
            <button
              type="submit"
              className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
            >
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function formatDeliveryLabel(v: string) {
  return v === "Full Distance" ? "Full Distance (Online)" : v;
}

function StatusBadge({
  hasContract,
  validation,
}: {
  hasContract: boolean;
  validation: ReturnType<typeof validateStudent>;
}) {
  if (hasContract) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Contract issued</span>;
  }
  if (validation.readyToIssue) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Ready to issue</span>;
  }
  if (validation.errors.length > 0) {
    return (
      <span
        className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"
        title={validation.errors.join("; ")}
      >
        Missing data
      </span>
    );
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Review</span>;
}
