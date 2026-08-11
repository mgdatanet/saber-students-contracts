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
  const issuedCount = studentRows.filter((r) => r.hasContract).length;
  const missingCount = studentRows.filter((r) => !r.hasContract && !r.validation.readyToIssue && r.validation.errors.length > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/classes" className="text-sm text-slate-500 hover:text-brand-navy">
          ← Classes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <div>
            <h1 className="text-2xl font-semibold text-brand-navy">{cls.code}</h1>
            <p className="text-sm text-slate-500">
              {cls.programs?.name} · {cls.schedule} · {formatDeliveryLabel(cls.method_of_delivery)} ·{" "}
              {cls.locked ? "Locked" : "Open"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/classes/${id}/edit`}
              className="rounded-lg border border-brand-navy/30 text-brand-navy text-sm font-medium px-4 py-2.5 hover:bg-brand-navy/5 transition-colors"
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
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {!hasSixSemesterDates && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          This class is missing one or more semester start/end dates. No contract can be issued until all 6
          semesters have dates.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Students" value={studentRows.length} />
        <StatCard label="Ready to Issue" value={readyCount} accent="text-emerald-600" />
        <StatCard label="Contracts Issued" value={issuedCount} accent="text-brand-gold" />
        <StatCard label="Missing Data" value={missingCount} accent="text-red-600" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Credits</th>
                <th className="px-5 py-3">Total cost</th>
                <th className="px-5 py-3">Total aid</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map(({ student, validation, totals, hasContract, pdfPath }) => (
                <tr key={student.id} className="border-t border-slate-100 hover:bg-brand-navy/5 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/classes/${id}/students/${student.id}`}
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {student.first_name} {student.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{totals.creditsTotal}</td>
                  <td className="px-5 py-3">${totals.costeTotal.toLocaleString()}</td>
                  <td className="px-5 py-3">${totals.ayudaTotal.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <StatusBadge hasContract={hasContract} validation={validation} />
                  </td>
                  <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
                    {hasContract && <DownloadContractLink pdfPath={pdfPath} />}
                    <Link href={`/classes/${id}/students/${student.id}`} className="text-brand-navy hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {studentRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No students in this class yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-brand-navy mb-3">Add Student</h2>
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
              className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2.5 shadow-sm hover:bg-brand-blue transition-colors"
            >
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ?? "text-brand-navy"}`}>{value}</div>
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
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
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
    return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-gold/15 text-amber-700 whitespace-nowrap">Contract issued</span>;
  }
  if (validation.readyToIssue) {
    return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">Ready to issue</span>;
  }
  if (validation.errors.length > 0) {
    return (
      <span
        className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 whitespace-nowrap"
        title={validation.errors.join("; ")}
      >
        Missing data
      </span>
    );
  }
  return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">Review</span>;
}
