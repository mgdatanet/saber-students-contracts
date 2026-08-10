import {
  computeContract,
  formatCurrency,
  formatDateOfBirth,
  formatGraduationDate,
  formatPaymentDate,
  formatPhone,
  formatSsn,
  type SemesterAidInput,
} from "@/lib/calc";
import { applyTokens, type ContractTextBlocks } from "@/lib/contractText";
import { DEFAULT_CONTRACT_THEME, type ContractTheme } from "@/lib/contractTheme";
import { LOGO_BASE64_PNG } from "./logoBase64";
import { ARIMO_BOLD_WOFF2, ARIMO_REGULAR_WOFF2 } from "./fontBase64";

// Fallback copy used only if a block is somehow missing from the database
// (e.g. right after a fresh install before the seed migration runs). The
// database (contract_text_blocks table, admin-editable) is the source of
// truth Financial Aid actually edits when the school's policies change.
const DEFAULT_TEXT_BLOCKS: ContractTextBlocks = {
  cancellation_refund_policy: `
    <tr><td>This Enrollment Agreement, in addition to the Institutional Catalog, constitutes a binding agreement between the student and the college upon acceptance. (Initial) __________.</td></tr>
    <tr><td><strong>Refund / Cancellation Policy</strong></td></tr>
    <tr><td>Our outlined refund policy is designed according to Fair Consumer Practices. Should student be terminated or cancelled for any reason, all refunds will be made according to following refund schedule.
    <ul>
      <li>Cancellation must be made in person or Certified mail.</li>
      <li>If tuition and fees are collected in advance of the start date of classes and the student does not begin classes or withdraws on the first day of classes, no more than $150 application and registration fees may be retained by the institution.
        <div class="small">The refund policy shall provide for cancellation of any obligation, other than a book and supply assessment for supplies, materials and kits which are not returnable because of use, within 3 working days from the student's signing an enrollment agreement or contract.</div>
      </li>
      <li>The refund policy for students attending SABER College, who incur a financial obligation shall be as follows: Students are charged by the semester based on the number of credits per course, the refund policy shall provide a formula for proration of refunds based upon the length of time the student remains enrolled, up to a minimum of 20%.
        <div class="small">
          For example:<br/>
          (A) Cancellation after attendance has begun, through 20% completion of the semester, will result in a Pro Rata refund computed on the number of hours completed to the total semester hours.<br/>
          (B) Cancellation after completing more than 20% of the semester will result in no refund.
        </div>
      </li>
      <li>Termination Date: The termination date for refund computation purposes is the last date of actual attendance by the student unless earlier written notice is received.</li>
    </ul>
    </td></tr>
    <tr><td><strong>Disclosures as per Rule 6E-1.0032(6)(i),FAC</strong>
      <ul>
        <li>Refund shall be made within 30 days of the date that the institution determines that the student has withdrawn.</li>
        <li>Nonrefundable fees shall not exceed $150.00</li>
        <li>SABER COLLEGE Statement: Only Students who were denied entry into the school will be kept for one year. If a student is enrolled in the school and then later dismissed, those records will be maintained indefinitely.</li>
      </ul>
    </td></tr>
    <tr><td>All prices for program are as printed herein. There are no carrying charges, interest charges, or service charges connected or charged with any of these programs. Contracts are not sold to a third party at any time. Cost of credit is included in the price cost for the goods and services.</td></tr>
    <tr><td>Program Cost: (See attached for semester Detail) Student will not need to submit more than one application or registration. Charges will be made automatically per semester.</td></tr>
    <tr><td>Non-Refundable Registration Fee per Semester: {{REGISTRATION_FEE_PER_SEM}} per semester.</td></tr>`,
  methods_of_payment_note: `
    <tr><td>( X ) Full Payment at time of signing enrollment agreement</td></tr>
    <tr><td>(   ) Registration and Application fee at the time of signing enrollment agreement with balance paid prior to program start date.</td></tr>
    <tr><td>(   ) Registration and Application fee at the time of signing enrollment agreement with balance paid prior to graduation.</td></tr>`,
  methods_of_payment_footnote:
    "NOTE: When school offers a payment plan with four or more payments, the federal boxes will be included in the contract. Enter N/A or LINE THROUGH, if not applicable.",
  termination_policy: `
    <p>A student may be dismissed, at the discretion of the School Director, prior to completion of the program. Reasons for termination include but are not limited to the following:</p>
    <ol>
      <li>Insufficient academic progress (not maintaining a passing grade)</li>
      <li>Failure to comply with rules outlined in catalog or pertinent program handbook (when applicable) and college policies</li>
      <li>Nonpayment of academic costs under terms agreed upon with SABER College administration</li>
    </ol>`,
  graduation_requirements:
    "I understand that in order to graduate from the program and to receive a diploma, I must successfully complete the required number of scheduled clock hours/credit hours as specified in the catalog and on the Student Enrollment Agreement, pass all written and practical examination with * {{MIN_GRADE_PCT}} % average and satisfy all financial obligations to the School.",
  employment_assistance:
    "<strong>Employment Assistance</strong><br/>Upon successful completion of the program, the school will assist each graduate with job placement; however, the school does not guarantee employment.",
  notice_and_agreement: `
    <p class="bold">NOTICE TO PROSPECTIVE STUDENTS: DO NOT SIGN THIS CONTRACT BEFORE YOU HAVE CAREFULLY REVIEWED IT.</p>
    <p>By my signature, I agree to the terms and conditions of this &ldquo;binding agreement&rdquo;, I also verify that I have read and have received a copy of this Agreement and the Institutional Catalog.</p>
    <p>The above-listed school and student are entering a &ldquo;binding agreement&rdquo; under which the student will pay tuition and fees as indicated. The parties are bound by the terms of this Agreement and also by the rules, regulations, and other terms set forth in the Institutional Catalog, a copy of which the student hereby attests to having received. The school will instruct the student in the curriculum listed above in accordance with Education Law and Commissioner's Regulations.</p>`,
};

export interface ContractHtmlInput {
  student: {
    firstName: string;
    lastName: string;
    ssn: string | null;
    dateOfBirth: string | null;
    phone: string | null;
    mobile: string | null;
    address: string | null;
    contractDate: string | null;
  };
  program: {
    name: string;
    credentialName: string;
    degreeType: "associate" | "diploma";
  };
  klass: {
    schedule: "Day" | "Evening";
    methodOfDelivery: "Residential" | "Blended Hybrid" | "Full Distance";
    tuitionPerCredit: number;
    creditsTotal: number;
    weeksTotal: number;
    monthsTotal: number;
    minGradePct: number;
    testingFee: number;
    applicationFeePerSem: number;
    registrationFeePerSem: number;
    skillsLabFee: number;
    materialsSuppliesFee: number;
    booksSuppliesFee: number;
    blsFee: number;
    otherCostsFee: number;
    theoryLabHoursA: number | null;
    clinicalHoursA: number | null;
    theoryLabHoursB: number | null;
    clinicalHoursB: number | null;
  };
  semesters: SemesterAidInput[];
  semesterDates: { n: number; startDate: string; endDate: string }[];
  signerName: string;
  contractNumber: string;
  /** Admin-editable legal text (contract_text_blocks table). Falls back to DEFAULT_TEXT_BLOCKS for any missing key. */
  textBlocks?: ContractTextBlocks;
  /** Safe visual customization (colors, font, logo size). Legal layout/structure is not affected. */
  theme?: ContractTheme;
}

function esc(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function checkbox(checked: boolean): string {
  return checked ? "( X )" : "(   )";
}

export function renderContractHtml(input: ContractHtmlInput): string {
  const { student, program, klass, semesters, semesterDates, signerName, contractNumber } = input;
  const blocks: ContractTextBlocks = { ...DEFAULT_TEXT_BLOCKS, ...input.textBlocks };
  const theme: ContractTheme = { ...DEFAULT_CONTRACT_THEME, ...input.theme };
  const totals = computeContract(semesters, klass.tuitionPerCredit);
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ");

  const cancellationRefundPolicy = applyTokens(blocks.cancellation_refund_policy, {
    REGISTRATION_FEE_PER_SEM: formatCurrency(klass.registrationFeePerSem),
  });
  const graduationRequirements = applyTokens(blocks.graduation_requirements, {
    MIN_GRADE_PCT: String(klass.minGradePct),
  });

  // Total Program Cost = coste_total = matricula + fees_totales (ESPECIFICACION.md
  // section 4). The individual fee line items above (testing, application,
  // registration, skills lab, materials, books, BLS, other) are printed for
  // disclosure only — they are already folded into the per-semester "Fees"
  // figure Financial Aid enters, so they must NOT be added again here.
  const totalProgramCost = totals.costeTotal;

  const lastSemesterWithCredits = semesters
    .slice()
    .reverse()
    .find((s) => s.credits > 0);
  const graduationSemesterDates = lastSemesterWithCredits
    ? semesterDates.find((d) => d.n === lastSemesterWithCredits.n)
    : semesterDates[semesterDates.length - 1];
  const anticipatedGraduationDate = graduationSemesterDates
    ? formatGraduationDate(graduationSemesterDates.endDate)
    : "";
  const startDate = semesterDates[0] ? formatPaymentDate(semesterDates[0].startDate) : "";

  const semesterRows = totals.semesters
    .map((s, i) => {
      const dueDate = semesterDates[i] ? formatPaymentDate(semesterDates[i].startDate) : "";
      return { ordinal: ORDINALS[i], s, dueDate };
    })
    .filter((r) => r.s);

  // When the theme is left on the default Arial stack, put the embedded
  // Arimo (metric-compatible with Arial) first. This is the fix for pages
  // rendering "misaligned" only in production: serverless Chromium
  // (@sparticuz/chromium on Vercel, Linux) has no Arial installed, so it was
  // silently substituting a font with different character widths, reflowing
  // text and shifting page breaks versus what renders locally on Windows.
  // Embedding the font removes the dependency on whatever fonts the host
  // happens to have. Custom font choices (Georgia, Verdana, etc.) are left
  // as-is — those are a deliberate admin choice, not the default path.
  const isDefaultFont = theme.fontFamily === DEFAULT_CONTRACT_THEME.fontFamily;
  const bodyFontFamily = isDefaultFont ? `'Arimo', ${theme.fontFamily}` : theme.fontFamily;

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'Arimo';
    font-style: normal;
    font-weight: 400;
    src: url(${ARIMO_REGULAR_WOFF2}) format('woff2');
  }
  @font-face {
    font-family: 'Arimo';
    font-style: normal;
    font-weight: 700;
    src: url(${ARIMO_BOLD_WOFF2}) format('woff2');
  }
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  body { font-family: ${bodyFontFamily}; font-size: ${theme.baseFontSizePt}pt; color: #111; margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  /* Every page's content sits inside one thin outer frame, matching the
     original document's "printed form" look (per the visual spec supplied
     for this contract: 1pt black border enclosing all content on each page). */
  .page-frame { border: 1pt solid #000; padding: 10px; min-height: 10in; }
  /* Page 1 only: stretch the Information table to occupy the leftover
     vertical space instead of clumping at the top of the page (client
     feedback: the form read as "compressed"). */
  .page-frame-fill { display: flex; flex-direction: column; height: 10in; }
  .page-frame-fill .info-table { flex: 1 1 auto; }
  .page-frame-fill .footer-note { margin-top: auto; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid ${theme.borderColor}; padding: 4px 6px; vertical-align: top; }
  .no-border td, .no-border th { border: none; }
  h1 { font-size: 13pt; margin: 0 0 4px; }
  h2 { font-size: 10pt; background: #ddd; padding: 3px 6px; margin: 10px 0 0; }
  .header { display: flex; border: 1px solid ${theme.borderColor}; align-items: stretch; }
  .header .logo { width: 30%; padding: 8px; display: flex; align-items: center; justify-content: center; }
  .header .logo img { max-width: 100%; max-height: ${theme.logoMaxHeightPx}px; object-fit: contain; }
  .header .titlebox { width: 70%; text-align: center; display: flex; flex-direction: column; }
  .header .titlebox .address-block { padding: 10px 10px 4px; color: #000066; font-size: 1.2em; font-weight: bold; line-height: 1.4; }
  .header .titlebox h1 { background: ${theme.primaryColor}; color: ${theme.sectionTitleTextColor}; margin: auto 0 0; padding: 6px; }
  .small { font-size: 8pt; color: #444; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .section-title { background: ${theme.primaryColor}; color: ${theme.sectionTitleTextColor}; text-align: center; font-weight: bold; padding: 3px; margin: 0 0 6px; }
  .footer-note { text-align: center; font-size: 8pt; margin-top: 8px; }
  .page-footer { text-align: center; font-size: 8pt; font-weight: bold; margin-top: 10px; }
  /* Page 1 "Information" grid: roomier cells so the form visibly fills the
     page instead of clumping at the top (client feedback: felt "compressed"). */
  .info-table { table-layout: fixed; height: 100%; }
  .info-table td { padding: 16px 12px; font-size: 1.15em; line-height: 1.5; vertical-align: middle; }
  .info-table td.top { vertical-align: top; }
  .method-row { display: flex; justify-content: space-between; align-items: center; }
  ul, ol { margin: 4px 0; padding-left: 18px; }
  /* The original document mixes sans-serif labels/tables with serif body
     copy for the dense legal paragraphs — this class marks those blocks. */
  .legal-text { font-family: 'Times New Roman', Times, serif; }
</style>
</head>
<body>

<!-- PAGE 1: Information -->
<div class="page">
 <div class="page-frame page-frame-fill">
  <div class="header">
    <div class="logo"><img src="${LOGO_BASE64_PNG}" alt="SABER College" /></div>
    <div class="titlebox">
      <div class="address-block">
        <div>3990 W. FLAGLER STREET</div>
        <div>Miami, Florida 33134</div>
        <div>Telephone (305) 443-9170</div>
      </div>
      <h1>Student Enrollment Agreement</h1>
    </div>
  </div>
  <div class="section-title">Information</div>
  <table class="info-table">
    <tr><td colspan="4" class="legal-text top">This Agreement is by and between SABER College, 3990 W. Flagler Street, Miami, Florida 33134, (The &ldquo;College&rdquo;) and (the &ldquo;Student&rdquo;) listed below:</td></tr>
    <tr><td colspan="2" class="bold">STUDENT NAME: ${esc(fullName)}</td><td colspan="2" class="bold">SS #: ${esc(formatSsn(student.ssn))}</td></tr>
    <tr>
      <td colspan="2">Date of Birth: ${esc(student.dateOfBirth ? formatDateOfBirth(student.dateOfBirth) : "")}</td>
      <td>Telephone: ${esc(formatPhone(student.phone))}</td>
      <td>Cell phone: ${esc(formatPhone(student.mobile))}</td>
    </tr>
    <tr><td colspan="4">Current Address: ${esc(student.address)}</td></tr>
    <tr>
      <td colspan="2">Program Title: ${esc(program.name)}</td>
      <td colspan="2" rowspan="2">Total Semester Credit Hours: ${klass.creditsTotal}<br/>Total Weeks: ${klass.weeksTotal}</td>
    </tr>
    <tr>
      <td colspan="2">Credential Awarded upon completion: ${esc(program.credentialName)}</td>
    </tr>
    <tr>
      <td colspan="4">Class Schedule: ${checkbox(klass.schedule === "Evening")} Evening Classes &nbsp; ${checkbox(klass.schedule === "Day")} Day Classes</td>
    </tr>
    <tr>
      <td colspan="4" class="bold">
        <div class="method-row">
          <span>Method of Delivery: ${esc(klass.methodOfDelivery === "Full Distance" ? "Full Distance (Online)" : klass.methodOfDelivery)}</span>
          <span>INITIALS _________</span>
        </div>
      </td>
    </tr>
    <tr><td colspan="4" class="center">Conditions as they appear in all pages are part of this document.</td></tr>
  </table>
  <div class="footer-note">Contract # ${esc(contractNumber)}</div>
 </div>
</div>

<!-- PAGE 2: Cancellation and Refund Policy -->
<div class="page">
 <div class="page-frame">
  <div class="section-title">Cancellation and Refund Policy</div>
  <table class="no-border legal-text">
    ${cancellationRefundPolicy}
  </table>
  <div class="footer-note">Conditions as they appear in all pages are part of this document.</div>
 </div>
</div>

<!-- PAGE 3: Costs and TILA -->
<div class="page">
 <div class="page-frame">
  <table class="no-border">
    <tr><td class="right">INITIALS: ________________</td></tr>
  </table>
  <table>
    <tr>
      <td>Non-Refundable Testing Fee: ${formatCurrency(klass.testingFee)}</td>
      <td>Non-Refundable Application Fee: ${formatCurrency(klass.applicationFeePerSem)} per semester</td>
    </tr>
    <tr>
      <td>Tuition: ${formatCurrency(totals.matricula)}</td>
      <td>Non-Refundable Registration Fee: ${formatCurrency(klass.registrationFeePerSem)}</td>
    </tr>
    <tr>
      <td>Skills Lab Fees: ${formatCurrency(klass.skillsLabFee)}</td>
      <td>Materials and Supplies: ${formatCurrency(klass.materialsSuppliesFee)}</td>
    </tr>
    <tr>
      <td colspan="2">Books &amp; Supplies (${program.degreeType === "associate" ? "A.S. Program" : "Diploma Program"}): ${formatCurrency(klass.booksSuppliesFee)}</td>
    </tr>
    <tr>
      <td colspan="2">BLS Training &amp; Certificate: ${formatCurrency(klass.blsFee)}</td>
    </tr>
    <tr><td colspan="2">Other Costs: ${formatCurrency(klass.otherCostsFee)}</td></tr>
    <tr><td colspan="2" class="bold">Total Program Cost: ${formatCurrency(totalProgramCost)}</td></tr>
  </table>

  <div class="section-title">METHODS OF PAYMENT</div>
  <table class="no-border legal-text">
    ${blocks.methods_of_payment_note}
  </table>
  <p class="small legal-text">${blocks.methods_of_payment_footnote}</p>

  <table>
    <tr>
      <th>Annual Percentage Rate</th>
      <th>Finance Charge</th>
      <th>Amount Financed<br/><span class="small">The dollar amount of the credit provided to you or on your behalf</span></th>
      <th>Total Payment<br/><span class="small">The amount you will have paid after you have made all payments as scheduled</span></th>
      <th>Total Sales Price<br/><span class="small">The total cost of your purchase on credit including your down payment</span></th>
    </tr>
    <tr>
      <td rowspan="6" class="center">0%</td>
      <td rowspan="6" class="center">$0</td>
      <td>
        ${semesterRows.map((r) => `${r.ordinal} ${formatCurrency(r.s.financiado)}`).join("<br/>")}
      </td>
      <td>
        ${semesterRows.map((r) => `${r.ordinal} ${formatCurrency(r.s.totalPago)}`).join("<br/>")}
      </td>
      <td>
        ${semesterRows.map((r) => `${r.ordinal} ${formatCurrency(r.s.precioVenta)}`).join("<br/>")}
      </td>
    </tr>
  </table>

  <p class="bold">Your Payment Schedule will be:</p>
  <table>
    <tr><th>Number of Payments</th><th>Amount of Each Payment</th><th>When Payments are Due</th></tr>
    ${semesterRows
      .map(
        (r) =>
          `<tr><td class="center">${r.s.numPagos}</td><td class="center">${formatCurrency(
            r.s.importePago
          )}</td><td class="center">${r.dueDate}</td></tr>`
      )
      .join("")}
  </table>

  <p class="small legal-text">All prices for the program are printed herein. Contracts will not be sold to a third party at any time. In cases when no payment plan is established, there will be no carrying charges, interest charges, or service charges connected or charged with the program.</p>
  <p>NAME: ${esc(fullName)} &nbsp;&nbsp;&nbsp;&nbsp; INITIALS: ________________</p>

  <div class="section-title">Termination Policy</div>
  <div class="legal-text">${blocks.termination_policy}</div>
  <div class="footer-note">Conditions as they appear in all pages are part of this document.</div>
 </div>
</div>

<!-- PAGE 4: Signatures -->
<div class="page">
 <div class="page-frame">
  <p class="legal-text">This document and the Catalog are a binding contract between the institution and applicant and no further modification or representation except as herein expressed by both parties will be recognized.</p>

  <div class="section-title">GRADUATION REQUIREMENTS</div>
  <p class="legal-text">${graduationRequirements}</p>

  <p>${blocks.employment_assistance}</p>

  <table class="no-border">
    <tr>
      <td>${checkbox(klass.methodOfDelivery === "Residential")} Residential</td>
      <td>${checkbox(klass.methodOfDelivery === "Blended Hybrid")} Blended Hybrid</td>
      <td>${checkbox(klass.methodOfDelivery === "Full Distance")} Full Distance (Online)</td>
    </tr>
  </table>

  <table class="no-border">
    <tr><td>Start Date:</td><td>${startDate}</td></tr>
    <tr><td>Anticipated Graduation Date:</td><td>${anticipatedGraduationDate}</td></tr>
    <tr>
      <td>Hours and days available:</td>
      <td>
        Theory/Lab: ${klass.theoryLabHoursA ?? 0} hrs/day &nbsp;&nbsp; Clinical: ${klass.clinicalHoursA ?? 0} hrs/day<br/>
        Theory/Lab: ${klass.theoryLabHoursB ?? 0} hrs/day &nbsp;&nbsp; Clinical: ${klass.clinicalHoursB ?? 0} hrs/day
      </td>
    </tr>
    <tr><td>Program Completion Time:</td><td>Months ${klass.monthsTotal} &nbsp;&nbsp; Weeks ${klass.weeksTotal}</td></tr>
  </table>

  <div class="legal-text">${blocks.notice_and_agreement}</div>

  <p>Upon satisfactory completion of the program the student will be awarded a:<br/>
  ASSOCIATE DEGREE ${checkbox(program.degreeType === "associate")} &nbsp;&nbsp;&nbsp;&nbsp; DIPLOMA ${checkbox(program.degreeType === "diploma")}</p>

  <table class="no-border">
    <tr><td style="width:60%">Student Signature: ________________________________</td><td>Date: ${esc(student.contractDate ? formatPaymentDate(student.contractDate) : "")}</td></tr>
    <tr><td>Parent Signature (if student is a minor)</td><td>Date:</td></tr>
    <tr><td>Accepted by: ${esc(signerName)}</td><td>Date: ${esc(student.contractDate ? formatPaymentDate(student.contractDate) : "")}</td></tr>
    <tr><td>School Official / Title</td><td></td></tr>
  </table>
  <div class="page-footer">Conditions as they appear in all pages are part of this document.</div>
 </div>
</div>

</body>
</html>`;
}

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];
