import "server-only";

// Plain table-based HTML with inline styles — the only thing email clients
// agree on. Brand colors mirror the app's Tailwind tokens (globals.css) and
// the approved signing-page design.
const NAVY = "#25377B";
const BLUE = "#4659A3";
const INK = "#16233A";
const MUTED = "#55637D";
const BORDER = "#D8DEE9";
const SUPPORT_EMAIL = "enrollments@sabercollege.edu";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Header band, white card, footer — shared by every message below. */
function shell(origin: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F6F7FA;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FA;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

        <tr><td style="background-color:${NAVY};background-image:linear-gradient(135deg,${NAVY},${BLUE});border-radius:14px 14px 0 0;padding:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#FFFFFF;border-radius:10px;padding:8px;width:64px;">
                <img src="${origin}/logo.png" alt="SABER College" width="48" style="display:block;width:48px;height:auto;">
              </td>
              <td style="padding-left:14px;">
                <div style="font:600 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.75);">SABER College</div>
                <div style="font:600 19px/1.3 Georgia,'Times New Roman',serif;color:#FFFFFF;">Enrollment Agreement</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="background:#FFFFFF;border:1px solid ${BORDER};border-top:none;border-radius:0 0 14px 14px;padding:28px 24px;">
          ${bodyHtml}
        </td></tr>

        <tr><td style="padding:18px 8px;text-align:center;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Trouble with this document? Contact
          <a href="mailto:${SUPPORT_EMAIL}" style="color:${MUTED};">${SUPPORT_EMAIL}</a>.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:${BLUE};border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:13px 26px;font:700 15px/1 Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;">${label}</a>
    </td></tr>
  </table>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};">${label}</td>
    <td style="padding:6px 0 6px 16px;font:600 13px/1.5 Arial,Helvetica,sans-serif;color:${INK};">${value}</td>
  </tr>`;
}

const H1 = `font:600 21px/1.3 Georgia,'Times New Roman',serif;color:${INK};margin:0 0 12px;`;
const P = `font:400 14px/1.65 Arial,Helvetica,sans-serif;color:${INK};margin:0 0 14px;`;
const SMALL = `font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};margin:16px 0 0;`;

export function signRequestEmail(input: {
  origin: string;
  studentName: string;
  programName: string;
  contractNumber: string;
  signUrl: string;
  expiresAt: string;
}): { subject: string; html: string } {
  const name = escapeHtml(input.studentName);

  return {
    subject: `Action needed: sign your SABER College enrollment agreement`,
    html: shell(
      input.origin,
      `<h1 style="${H1}">Hi ${name}, your enrollment agreement is ready to sign</h1>
       <p style="${P}">Review the agreement and add your signature online — it only takes a minute. Nothing is final until you sign.</p>
       <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;">
         ${detailRow("Program", escapeHtml(input.programName))}
         ${detailRow("Contract No.", escapeHtml(input.contractNumber))}
         ${detailRow("Link expires", formatDate(input.expiresAt))}
       </table>
       ${button(input.signUrl, "Review &amp; sign agreement")}
       <p style="${SMALL}">This link is unique to you — please don't forward it. If the button doesn't work, copy and paste this address into your browser:<br>
       <span style="color:${BLUE};word-break:break-all;">${escapeHtml(input.signUrl)}</span></p>`,
    ),
  };
}

export function studentSignedEmail(input: {
  origin: string;
  studentName: string;
  contractNumber: string;
  reviewUrl: string;
}): { subject: string; html: string } {
  const name = escapeHtml(input.studentName);

  return {
    subject: `${input.studentName} signed contract ${input.contractNumber} — ready to countersign`,
    html: shell(
      input.origin,
      `<h1 style="${H1}">${name} signed their enrollment agreement</h1>
       <p style="${P}">The agreement is now waiting on a countersignature from Financial Aid before it's fully executed.</p>
       <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;">
         ${detailRow("Student", name)}
         ${detailRow("Contract No.", escapeHtml(input.contractNumber))}
       </table>
       ${button(input.reviewUrl, "Review &amp; countersign")}`,
    ),
  };
}

export function fullyExecutedEmail(input: {
  origin: string;
  studentName: string;
  contractNumber: string;
}): { subject: string; html: string } {
  const name = escapeHtml(input.studentName);

  return {
    subject: `Your signed SABER College enrollment agreement (${input.contractNumber})`,
    html: shell(
      input.origin,
      `<h1 style="${H1}">Your enrollment agreement is complete</h1>
       <p style="${P}">Hi ${name}, SABER College has countersigned your agreement. A copy signed by both parties is attached to this email for your records.</p>
       <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;">
         ${detailRow("Contract No.", escapeHtml(input.contractNumber))}
         ${detailRow("Status", "Fully executed")}
       </table>
       <p style="${SMALL}">Keep this copy somewhere safe — it's your record of the agreement.</p>`,
    ),
  };
}
