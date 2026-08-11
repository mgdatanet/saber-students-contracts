import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/actions/profile";
import { saveStudentIdentity } from "@/lib/actions/students";
import { StudentAidGrid } from "./StudentAidGrid";
import { GenerateContractButton } from "./GenerateContractButton";
import { DownloadContractLink } from "../../DownloadContractLink";
import { DeleteStudentButton } from "./DeleteStudentButton";
import { AdminDeleteContractButton } from "./AdminDeleteContractButton";
import { AdminDeleteStudentButton } from "./AdminDeleteStudentButton";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; studentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: classId, studentId } = await params;
  const { error: errorParam } = await searchParams;
  const { profile } = await requireProfile();
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  const [{ data: cls }, { data: semesters }, { data: student }] = await Promise.all([
    supabase.from("classes").select("*").eq("id", classId).single(),
    supabase.from("class_semesters").select("*").eq("class_id", classId).order("n"),
    supabase
      .from("students")
      .select("*, student_semester_aid(*), contracts(id, contract_number, issued_at, pdf_path)")
      .eq("id", studentId)
      .single(),
  ]);

  if (!cls || !student) notFound();

  const hasSixSemesterDates = (semesters?.length ?? 0) === 6 && semesters!.every((s) => s.start_date && s.end_date);
  const contract = student.contracts?.[0];
  const editable = !contract || isAdmin;

  const initialSemesters = (student.student_semester_aid ?? [])
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

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href={`/classes/${classId}`} className="text-sm text-slate-500 hover:text-brand-navy">
          ← {cls.code}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <h1 className="text-2xl font-semibold text-brand-navy">
            {student.first_name} {student.last_name}
          </h1>
          <div className="flex items-center gap-3">
            {contract ? (
              <>
                <span className="text-sm font-medium text-amber-700 bg-brand-gold/15 border border-brand-gold/30 rounded-lg px-3 py-1.5">
                  Contract {contract.contract_number} issued
                </span>
                <DownloadContractLink pdfPath={contract.pdf_path} />
                {isAdmin && <AdminDeleteContractButton contractId={contract.id} />}
              </>
            ) : (
              <>
                <DeleteStudentButton
                  classId={classId}
                  studentId={studentId}
                  studentName={`${student.first_name} ${student.last_name}`}
                />
                <GenerateContractButton classId={classId} studentId={studentId} />
              </>
            )}
            {isAdmin && (
              <AdminDeleteStudentButton
                classId={classId}
                studentId={studentId}
                studentName={`${student.first_name} ${student.last_name}`}
              />
            )}
          </div>
        </div>
      </div>

      {errorParam && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{errorParam}</div>
      )}

      {contract && isAdmin && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          Admin override: this student already has an issued contract. Editing below does <strong>not</strong>{" "}
          change the already-issued PDF — to correct a mistake, fix the data here, then use{" "}
          <strong>&ldquo;Delete Contract&rdquo;</strong> above and generate a new one.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-brand-navy">{editable ? "Edit Student Details" : "Student Details"}</h2>
        <form
          action={saveStudentIdentity.bind(null, classId, studentId)}
          className="grid grid-cols-3 gap-3 mt-3"
        >
          <Field name="first_name" label="First name" defaultValue={student.first_name} required disabled={!editable} />
          <Field name="last_name" label="Last name" defaultValue={student.last_name} required disabled={!editable} />
          <Field name="middle_initial" label="Middle initial" defaultValue={student.middle_initial ?? ""} disabled={!editable} />
          <Field name="ssn" label="SS # (999-99-9999)" defaultValue={student.ssn ?? ""} disabled={!editable} />
          <Field
            name="date_of_birth"
            label="Date of birth"
            type="date"
            defaultValue={student.date_of_birth ?? ""}
            disabled={!editable}
          />
          <Field name="phone" label="Telephone" defaultValue={student.phone ?? ""} disabled={!editable} />
          <Field name="mobile" label="Cell phone" defaultValue={student.mobile ?? ""} disabled={!editable} />
          <Field
            name="contract_date"
            label="Contract date"
            type="date"
            defaultValue={student.contract_date ?? ""}
            disabled={!editable}
          />
          <Field name="address" label="Current address" defaultValue={student.address ?? ""} className="col-span-3" disabled={!editable} />
          {editable && (
            <div className="col-span-3">
              <button
                type="submit"
                className="rounded-lg border border-brand-navy/30 text-brand-navy text-sm font-medium px-4 py-2.5 hover:bg-brand-navy/5 transition-colors"
              >
                Save details
              </button>
            </div>
          )}
        </form>
      </div>

      <StudentAidGrid
        classId={classId}
        studentId={studentId}
        ratePerCredit={cls.tuition_per_credit}
        expectedCredits={cls.credits_total}
        hasSixSemesterDates={hasSixSemesterDates}
        initialSemesters={initialSemesters}
        identity={{
          firstName: student.first_name,
          lastName: student.last_name,
          ssn: student.ssn,
          dateOfBirth: student.date_of_birth,
        }}
        locked={!editable}
      />
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  disabled = false,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}
