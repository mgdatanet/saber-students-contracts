"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/actions/profile";
import { requestOrigin } from "@/lib/appUrl";
import { sendEmail } from "@/lib/email/send";
import { signRequestEmail, studentSignedEmail, fullyExecutedEmail } from "@/lib/email/templates";
import { buildExecutedPdf } from "@/lib/pdf/executedPdf";

/** How long a student's signing link stays valid. */
const SIGN_LINK_DAYS = 7;

/** A drawn signature is a few KB of PNG; anything larger is not a signature. */
const MAX_SIGNATURE_BYTES = 1_000_000;

/** Turns a canvas data URL into PNG bytes, or explains why it isn't one. */
function decodeSignaturePng(dataUrl: string): { png?: Buffer; error?: string } {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  if (base64 === dataUrl) return { error: "Signature must be a PNG image" };

  const png = Buffer.from(base64, "base64");
  if (png.byteLength === 0) return { error: "Signature is empty" };
  if (png.byteLength > MAX_SIGNATURE_BYTES) return { error: "Signature image is too large" };
  return { png };
}

function newSignToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The student's IP, recorded as part of the signature's audit trail. */
async function clientIp(): Promise<string | null> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
}

/**
 * Emails the student a link to sign. Also records the email on the student —
 * contact details are not contract terms, so they stay editable after issuing,
 * which is the whole point: you need the address precisely to send the
 * contract that has already been issued.
 */
export async function sendContractForSignature(
  contractId: string,
  studentEmail: string,
): Promise<{ error?: string }> {
  const { profile } = await requireProfile();
  if (profile.role === "financial_aid") return { error: "Financial Aid can only countersign" };

  const email = studentEmail.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address" };

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, contract_number, status, class_id, student_id, students(first_name, last_name), classes(programs(name))")
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contract not found" };
  if (contract.status !== "issued" && contract.status !== "pending_signature") {
    return { error: `This contract is ${contract.status.replace(/_/g, " ")} and can't be sent again` };
  }

  const token = newSignToken();
  const expiresAt = new Date(Date.now() + SIGN_LINK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: studentError } = await supabase
    .from("students")
    .update({ email })
    .eq("id", contract.student_id);
  if (studentError) return { error: studentError.message };

  const { error: updateError } = await supabase
    .from("contracts")
    .update({
      status: "pending_signature",
      sign_token: token,
      sign_token_expires_at: expiresAt,
      sent_at: new Date().toISOString(),
    })
    .eq("id", contractId);
  if (updateError) return { error: updateError.message };

  const origin = await requestOrigin();
  const { subject, html } = signRequestEmail({
    origin,
    studentName: `${contract.students?.first_name ?? ""} ${contract.students?.last_name ?? ""}`.trim(),
    programName: contract.classes?.programs?.name ?? "",
    contractNumber: contract.contract_number,
    signUrl: `${origin}/sign/${token}`,
    expiresAt,
  });

  const { error: emailError } = await sendEmail({ to: email, subject, html });
  if (emailError) {
    // The link is live either way — say so rather than implying nothing happened.
    return { error: `Contract marked as sent, but the email failed: ${emailError}` };
  }

  revalidatePath(`/classes/${contract.class_id}/students/${contract.student_id}`);
  revalidatePath(`/classes/${contract.class_id}`);
  return {};
}

export type SignableContract = {
  contractNumber: string;
  studentName: string;
  programName: string;
  className: string;
  pdfUrl: string | null;
  alreadySigned: boolean;
};

/**
 * Looks a contract up by its signing token. Runs with the service-role client
 * because the visitor is a student with no account — the token is the only
 * credential, so everything it can reach is scoped to that one contract.
 */
export async function getContractByToken(token: string): Promise<SignableContract | null> {
  const admin = createAdminClient();

  const { data: contract } = await admin
    .from("contracts")
    .select(
      "id, contract_number, status, pdf_path, sign_token_expires_at, students(first_name, last_name), classes(code, programs(name))",
    )
    .eq("sign_token", token)
    .single();

  if (!contract) return null;

  const expired =
    !contract.sign_token_expires_at || new Date(contract.sign_token_expires_at).getTime() < Date.now();
  const alreadySigned = contract.status !== "pending_signature";

  // An expired link on a contract still waiting for a signature is dead; one on
  // an already-signed contract still shows the confirmation.
  if (expired && !alreadySigned) return null;

  let pdfUrl: string | null = null;
  if (contract.pdf_path) {
    const { data } = await admin.storage.from("contracts").createSignedUrl(contract.pdf_path, 60 * 30);
    pdfUrl = data?.signedUrl ?? null;
  }

  return {
    contractNumber: contract.contract_number,
    studentName: `${contract.students?.first_name ?? ""} ${contract.students?.last_name ?? ""}`.trim(),
    programName: contract.classes?.programs?.name ?? "",
    className: contract.classes?.code ?? "",
    pdfUrl,
    alreadySigned,
  };
}

/**
 * Records the student's drawn signature. Public by design — the token is the
 * credential — so every check that matters happens here.
 */
export async function submitStudentSignature(
  token: string,
  signatureDataUrl: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { data: contract } = await admin
    .from("contracts")
    .select("id, contract_number, class_id, status, sign_token_expires_at, students(first_name, last_name)")
    .eq("sign_token", token)
    .single();

  if (!contract) return { error: "This signing link is not valid" };
  if (contract.status !== "pending_signature") return { error: "This contract has already been signed" };
  if (!contract.sign_token_expires_at || new Date(contract.sign_token_expires_at).getTime() < Date.now()) {
    return { error: "This signing link has expired. Please ask the school to send a new one." };
  }

  const { png: signature, error: decodeError } = decodeSignaturePng(signatureDataUrl);
  if (!signature) return { error: decodeError };

  const signaturePath = `${contract.class_id}/${contract.contract_number}-student-signature.png`;
  const { error: uploadError } = await admin.storage
    .from("contracts")
    .upload(signaturePath, signature, { contentType: "image/png", upsert: true });
  if (uploadError) return { error: `Could not store the signature: ${uploadError.message}` };

  const { error: updateError } = await admin
    .from("contracts")
    .update({
      status: "signed_by_student",
      student_signed_at: new Date().toISOString(),
      student_signature_path: signaturePath,
      student_signature_ip: await clientIp(),
      // Spent: the link cannot be replayed once it has produced a signature.
      sign_token: null,
      sign_token_expires_at: null,
    })
    .eq("id", contract.id)
    .eq("status", "pending_signature");
  if (updateError) return { error: updateError.message };

  await notifySchool({
    studentName: `${contract.students?.first_name ?? ""} ${contract.students?.last_name ?? ""}`.trim(),
    contractNumber: contract.contract_number,
  });

  return {};
}

/**
 * Tells whoever can countersign that a contract is waiting for them.
 *
 * Financial Aid owns this queue, so they are the audience. Admins are the
 * fallback only when no financial_aid user exists at all — otherwise the first
 * signature of a school that hasn't created those accounts yet would notify
 * nobody, and the contract would sit there silently.
 */
async function notifySchool(input: { studentName: string; contractNumber: string }): Promise<void> {
  const admin = createAdminClient();

  const { data: financialAid } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "financial_aid")
    .eq("approved", true);

  const profiles = financialAid?.length
    ? financialAid
    : (await admin.from("profiles").select("id").eq("role", "admin").eq("approved", true)).data;

  if (!profiles?.length) return;

  const { data: authUsers } = await admin.auth.admin.listUsers();
  const ids = new Set(profiles.map((p) => p.id));
  const recipients = (authUsers?.users ?? [])
    .filter((u) => ids.has(u.id) && u.email)
    .map((u) => u.email as string);

  if (!recipients.length) return;

  const origin = await requestOrigin();
  const { subject, html } = studentSignedEmail({
    origin,
    studentName: input.studentName,
    contractNumber: input.contractNumber,
    reviewUrl: `${origin}/pending-signatures`,
  });

  await sendEmail({ to: recipients, subject, html });
}

/** Only these two roles may put the school's signature on a contract. */
function canCountersign(role: string): boolean {
  return role === "admin" || role === "financial_aid";
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  financial_aid: "Financial Aid",
};

/**
 * Puts the school's signature on a contract the student has already signed,
 * builds the fully executed PDF, and emails the student their copy.
 *
 * The status change is written through the signer's own session, so RLS and the
 * contract-immutability trigger both apply: the database itself refuses any
 * move to `countersigned` that doesn't come from `signed_by_student`, which is
 * what makes a countersignature without a real student signature impossible.
 */
export async function countersignContract(
  contractId: string,
  signatureDataUrl: string,
): Promise<{ error?: string }> {
  const { profile } = await requireProfile();
  if (!canCountersign(profile.role)) return { error: "Only Financial Aid or an admin can countersign" };

  const { png: schoolSignature, error: decodeError } = decodeSignaturePng(signatureDataUrl);
  if (!schoolSignature) return { error: decodeError };

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select(
      "id, contract_number, status, class_id, student_id, pdf_path, student_signature_path, student_signed_at, student_signature_ip, students(first_name, last_name, email), classes(programs(name))",
    )
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contract not found" };
  if (contract.status !== "signed_by_student") {
    return { error: `This contract is ${contract.status.replace(/_/g, " ")} and can't be countersigned` };
  }
  if (!contract.pdf_path) return { error: "This contract has no PDF on file" };
  if (!contract.student_signature_path || !contract.student_signed_at) {
    return { error: "The student's signature is missing — nothing to countersign" };
  }

  const admin = createAdminClient();
  const studentName = `${contract.students?.first_name ?? ""} ${contract.students?.last_name ?? ""}`.trim();
  const countersignedAt = new Date().toISOString();

  // Fetch the pieces the certificate page is built from.
  const [issuedPdf, studentSignature] = await Promise.all([
    admin.storage.from("contracts").download(contract.pdf_path),
    admin.storage.from("contracts").download(contract.student_signature_path),
  ]);
  if (issuedPdf.error || !issuedPdf.data) return { error: `Could not read the contract PDF: ${issuedPdf.error?.message}` };
  if (studentSignature.error || !studentSignature.data) {
    return { error: `Could not read the student's signature: ${studentSignature.error?.message}` };
  }

  const schoolSignaturePath = `${contract.class_id}/${contract.contract_number}-school-signature.png`;
  const { error: signatureUploadError } = await admin.storage
    .from("contracts")
    .upload(schoolSignaturePath, schoolSignature, { contentType: "image/png", upsert: true });
  if (signatureUploadError) return { error: `Could not store the signature: ${signatureUploadError.message}` };

  let executedPdf: Uint8Array;
  try {
    executedPdf = await buildExecutedPdf({
      contractPdf: new Uint8Array(await issuedPdf.data.arrayBuffer()),
      contractNumber: contract.contract_number,
      studentName,
      programName: contract.classes?.programs?.name ?? "",
      student: {
        signaturePng: new Uint8Array(await studentSignature.data.arrayBuffer()),
        signedAt: contract.student_signed_at,
        ip: contract.student_signature_ip,
      },
      school: {
        signaturePng: new Uint8Array(schoolSignature),
        signedAt: countersignedAt,
        name: profile.full_name,
        role: ROLE_LABEL[profile.role] ?? "SABER College",
      },
    });
  } catch (e) {
    return { error: `Could not build the signed PDF: ${e instanceof Error ? e.message : "unknown error"}` };
  }

  const executedPdfPath = `${contract.class_id}/${contract.contract_number}-executed.pdf`;
  const { error: pdfUploadError } = await admin.storage
    .from("contracts")
    .upload(executedPdfPath, executedPdf, { contentType: "application/pdf", upsert: true });
  if (pdfUploadError) return { error: `Could not store the signed PDF: ${pdfUploadError.message}` };

  const { error: updateError } = await supabase
    .from("contracts")
    .update({
      status: "countersigned",
      countersigned_by: profile.id,
      countersigned_at: countersignedAt,
      school_signature_path: schoolSignaturePath,
      executed_pdf_path: executedPdfPath,
    })
    .eq("id", contract.id)
    .eq("status", "signed_by_student");
  if (updateError) return { error: updateError.message };

  // The contract is executed either way — a bounced email doesn't undo that, so
  // the failure is reported without rolling anything back.
  let emailError: string | undefined;
  if (contract.students?.email) {
    const origin = await requestOrigin();
    const { subject, html } = fullyExecutedEmail({
      origin,
      studentName,
      contractNumber: contract.contract_number,
    });
    const result = await sendEmail({
      to: contract.students.email,
      subject,
      html,
      attachments: [
        {
          filename: `${contract.contract_number}-signed.pdf`,
          content: Buffer.from(executedPdf).toString("base64"),
        },
      ],
    });
    if (result.error) emailError = `Contract countersigned, but the copy to the student failed: ${result.error}`;
  } else {
    emailError = "Contract countersigned, but the student has no email on file to send the copy to.";
  }

  revalidatePath("/pending-signatures");
  revalidatePath(`/classes/${contract.class_id}/students/${contract.student_id}`);
  revalidatePath(`/classes/${contract.class_id}`);

  return emailError ? { error: emailError } : {};
}

/** A short-lived link to the fully executed PDF, for the staff-side download. */
export async function getExecutedPdfUrl(contractId: string): Promise<string | null> {
  await requireProfile();

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("executed_pdf_path")
    .eq("id", contractId)
    .single();

  if (!contract?.executed_pdf_path) return null;

  const { data } = await supabase.storage
    .from("contracts")
    .createSignedUrl(contract.executed_pdf_path, 60 * 10);
  return data?.signedUrl ?? null;
}
