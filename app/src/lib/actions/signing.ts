"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/actions/profile";
import { requestOrigin } from "@/lib/appUrl";
import { sendEmail } from "@/lib/email/send";
import { signRequestEmail, studentSignedEmail } from "@/lib/email/templates";

/** How long a student's signing link stays valid. */
const SIGN_LINK_DAYS = 7;

/** A drawn signature is a few KB of PNG; anything larger is not a signature. */
const MAX_SIGNATURE_BYTES = 1_000_000;

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

  const base64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
  if (base64 === signatureDataUrl) return { error: "Signature must be a PNG image" };

  const signature = Buffer.from(base64, "base64");
  if (signature.byteLength === 0) return { error: "Signature is empty" };
  if (signature.byteLength > MAX_SIGNATURE_BYTES) return { error: "Signature image is too large" };

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
