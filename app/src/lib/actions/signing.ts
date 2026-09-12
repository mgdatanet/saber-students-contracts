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
import { stampContractHtml } from "@/lib/pdf/contractHtml";
import type { SlotId } from "@/lib/signing/slots";
import { loadContractHtml } from "@/lib/pdf/contractDocument";
import { renderHtmlToPdf } from "@/lib/pdf/renderPdf";

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
  /** The contract itself, rendered as HTML so the student reads it full-size
   *  and places their initials directly on the page instead of squinting at
   *  an embedded PDF. */
  html: string | null;
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
      "id, contract_number, status, class_id, student_id, sign_token_expires_at, students(first_name, last_name), classes(code, programs(name))",
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

  const { html } = await loadContractHtml(admin, contract);

  return {
    contractNumber: contract.contract_number,
    studentName: `${contract.students?.first_name ?? ""} ${contract.students?.last_name ?? ""}`.trim(),
    programName: contract.classes?.programs?.name ?? "",
    className: contract.classes?.code ?? "",
    html,
    alreadySigned,
  };
}

/** The date stamped next to a signature, in the school's own timezone. */
function signatureDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/** A data URL pdf-lib-free rendering needs to embed the drawn image inline. */
function pngDataUrl(png: Buffer): string {
  return `data:image/png;base64,${png.toString("base64")}`;
}

/**
 * Records the student's drawn signature. Public by design — the token is the
 * credential — so every check that matters happens here.
 */
export async function submitStudentSignature(
  token: string,
  signatureDataUrl: string,
  initialsDataUrl: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { data: contract } = await admin
    .from("contracts")
    .select("id, contract_number, class_id, student_id, status, sign_token_expires_at, students(first_name, last_name)")
    .eq("sign_token", token)
    .single();

  if (!contract) return { error: "This signing link is not valid" };
  if (contract.status !== "pending_signature") return { error: "This contract has already been signed" };
  if (!contract.sign_token_expires_at || new Date(contract.sign_token_expires_at).getTime() < Date.now()) {
    return { error: "This signing link has expired. Please ask the school to send a new one." };
  }

  const { png: signature, error: signatureError } = decodeSignaturePng(signatureDataUrl);
  if (!signature) return { error: signatureError };

  const { png: initials, error: initialsError } = decodeSignaturePng(initialsDataUrl);
  if (!initials) return { error: `Initials: ${initialsError}` };

  const signedAt = new Date().toISOString();
  const base = `${contract.class_id}/${contract.contract_number}`;

  const uploads = await Promise.all([
    admin.storage.from("contracts").upload(`${base}-student-signature.png`, signature, {
      contentType: "image/png",
      upsert: true,
    }),
    admin.storage.from("contracts").upload(`${base}-student-initials.png`, initials, {
      contentType: "image/png",
      upsert: true,
    }),
  ]);
  const uploadError = uploads.find((u) => u.error)?.error;
  if (uploadError) return { error: `Could not store the signature: ${uploadError.message}` };

  // Fill this contract's own signature boxes — the student's signature lands on
  // the Student Signature line of page 4 and their initials on all four initial
  // boxes, exactly where the paper form puts them.
  const { html } = await loadContractHtml(admin, contract);
  if (!html) return { error: "Could not load the contract document" };

  const signedPdfPath = `${base}-student-signed.pdf`;
  try {
    const stamped = stampContractHtml(html, studentStamps(initials, signature, signedAt));
    const pdf = await renderHtmlToPdf(stamped);
    const { error: pdfError } = await admin.storage
      .from("contracts")
      .upload(signedPdfPath, pdf, { contentType: "application/pdf", upsert: true });
    if (pdfError) return { error: `Could not store the signed contract: ${pdfError.message}` };
  } catch (e) {
    return { error: `Could not build the signed contract: ${e instanceof Error ? e.message : "unknown error"}` };
  }

  const { error: updateError } = await admin
    .from("contracts")
    .update({
      status: "signed_by_student",
      student_signed_at: signedAt,
      student_signature_path: `${base}-student-signature.png`,
      student_initials_path: `${base}-student-initials.png`,
      student_signed_pdf_path: signedPdfPath,
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

/** Everything the student fills in: four initial boxes, the signature, the date. */
function studentStamps(initials: Buffer, signature: Buffer, signedAt: string): Partial<Record<SlotId, string>> {
  const initialsUrl = pngDataUrl(initials);
  return {
    i1: initialsUrl,
    i2: initialsUrl,
    i3: initialsUrl,
    i4: initialsUrl,
    "student-signature": pngDataUrl(signature),
    "d-student": signatureDate(signedAt),
  };
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

/**
 * Puts the school's signature on the "Accepted by" line of a contract the
 * student has already signed, and emails the student the executed copy.
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
      "id, contract_number, status, class_id, student_id, student_signature_path, student_initials_path, student_signed_at, students(first_name, last_name, email)",
    )
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contract not found" };
  if (contract.status !== "signed_by_student") {
    return { error: `This contract is ${contract.status.replace(/_/g, " ")} and can't be countersigned` };
  }
  if (!contract.student_signature_path || !contract.student_initials_path || !contract.student_signed_at) {
    return { error: "The student's signature is missing — nothing to countersign" };
  }

  const admin = createAdminClient();
  const studentName = `${contract.students?.first_name ?? ""} ${contract.students?.last_name ?? ""}`.trim();
  const countersignedAt = new Date().toISOString();
  const base = `${contract.class_id}/${contract.contract_number}`;

  // Rebuild from the contract's own frozen source with every box filled, rather
  // than drawing on top of the student-signed PDF: one document, one renderer.
  const [studentSignature, studentInitials, { html }] = await Promise.all([
    admin.storage.from("contracts").download(contract.student_signature_path),
    admin.storage.from("contracts").download(contract.student_initials_path),
    loadContractHtml(admin, contract),
  ]);
  if (studentSignature.error || !studentSignature.data || studentInitials.error || !studentInitials.data) {
    return { error: "Could not read the student's signature" };
  }
  if (!html) return { error: "Could not load the contract document" };

  const schoolSignaturePath = `${base}-school-signature.png`;
  const { error: signatureUploadError } = await admin.storage
    .from("contracts")
    .upload(schoolSignaturePath, schoolSignature, { contentType: "image/png", upsert: true });
  if (signatureUploadError) return { error: `Could not store the signature: ${signatureUploadError.message}` };

  const executedPdfPath = `${base}-executed.pdf`;
  let executedPdf: Buffer;
  try {
    const stamped = stampContractHtml(html, {
      ...studentStamps(
        Buffer.from(await studentInitials.data.arrayBuffer()),
        Buffer.from(await studentSignature.data.arrayBuffer()),
        contract.student_signed_at,
      ),
      "school-signature": pngDataUrl(schoolSignature),
      "d-school": signatureDate(countersignedAt),
    });
    executedPdf = await renderHtmlToPdf(stamped);
  } catch (e) {
    return { error: `Could not build the signed PDF: ${e instanceof Error ? e.message : "unknown error"}` };
  }

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
    const { subject, html: body } = fullyExecutedEmail({
      origin,
      studentName,
      contractNumber: contract.contract_number,
    });
    const result = await sendEmail({
      to: contract.students.email,
      subject,
      html: body,
      attachments: [
        { filename: `${contract.contract_number}-signed.pdf`, content: executedPdf.toString("base64") },
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

/**
 * The contract as the student left it — their initials and signature already
 * on the page — for the countersigner to read before adding theirs. Loaded on
 * demand rather than with the queue, since it is the whole document.
 */
export async function getContractForCountersign(
  contractId: string,
): Promise<{ html?: string; error?: string }> {
  const { profile } = await requireProfile();
  if (!canCountersign(profile.role)) return { error: "Only Financial Aid or an admin can countersign" };

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select(
      "class_id, student_id, contract_number, student_signature_path, student_initials_path, student_signed_at",
    )
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contract not found" };
  if (!contract.student_signature_path || !contract.student_initials_path || !contract.student_signed_at) {
    return { error: "The student's signature is missing" };
  }

  const admin = createAdminClient();
  const [signature, initials, { html }] = await Promise.all([
    admin.storage.from("contracts").download(contract.student_signature_path),
    admin.storage.from("contracts").download(contract.student_initials_path),
    loadContractHtml(admin, contract),
  ]);

  if (!html) return { error: "Could not load the contract document" };
  if (!signature.data || !initials.data) return { error: "Could not read the student's signature" };

  return {
    html: stampContractHtml(
      html,
      studentStamps(
        Buffer.from(await initials.data.arrayBuffer()),
        Buffer.from(await signature.data.arrayBuffer()),
        contract.student_signed_at,
      ),
    ),
  };
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
