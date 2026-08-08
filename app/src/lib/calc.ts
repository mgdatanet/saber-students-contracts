/**
 * Calculation engine for the SABER College Student Enrollment Agreement.
 *
 * Pure functions only — no I/O. This is the single implementation of the math
 * that used to live scattered across Excel formulas (ESPECIFICACION.md section 4).
 * Both the live UI (recalculating as Financial Aid types) and the PDF generator
 * call into this module, so there is exactly one place these numbers can come
 * from — never a hand-typed cell (see ESPECIFICACION.md section 6.7).
 */

export interface SemesterAidInput {
  n: number; // 1..6
  credits: number;
  fees: number;
  pell: number;
  sub: number;
  unsub: number;
  plus: number;
  efc: number;
}

export interface SemesterComputed {
  n: number;
  credits: number;
  fees: number;
  costeSemestre: number;
  ayudaSemestre: number;
  saldo: number;
  financiado: "N/A" | number;
  totalPago: "N/A" | number;
  precioVenta: "N/A" | number;
  numPagos: 0 | 4;
  importePago: number;
}

export interface ContractTotals {
  creditsTotal: number;
  matricula: number;
  feesTotal: number;
  costeTotal: number;
  ayudaTotal: number;
  semesters: SemesterComputed[];
}

/** coste_semestre(s) = creditos(s) * R + fees(s) */
export function costeSemestre(credits: number, fees: number, ratePerCredit: number): number {
  return credits * ratePerCredit + fees;
}

/** ayuda_semestre(s) = pell(s) + sub(s) + unsub(s) + plus(s) */
export function ayudaSemestre(pell: number, sub: number, unsub: number, plus: number): number {
  return pell + sub + unsub + plus;
}

/** saldo(s) = coste_semestre(s) - ayuda_semestre(s) */
export function saldo(coste: number, ayuda: number): number {
  return coste - ayuda;
}

/**
 * financiado(s) = "N/A" if saldo(s) <= 0, else saldo(s).
 * A negative saldo means aid covers more than the cost: shown as N/A, never as
 * a negative number and never as a refund (ESPECIFICACION.md section 4).
 */
export function financiado(saldoValue: number): "N/A" | number {
  return saldoValue <= 0 ? "N/A" : saldoValue;
}

/** total_pago(s) = financiado(s) — identical, there is no interest */
export function totalPago(financiadoValue: "N/A" | number): "N/A" | number {
  return financiadoValue;
}

/** precio_venta(s) = financiado(s) — identical, there is no interest */
export function precioVenta(financiadoValue: "N/A" | number): "N/A" | number {
  return financiadoValue;
}

/** num_pagos(s) = 0 if saldo(s) <= 0, else 4 */
export function numPagos(saldoValue: number): 0 | 4 {
  return saldoValue <= 0 ? 0 : 4;
}

/** importe_pago(s) = 0 if saldo(s) <= 0, else saldo(s) / 4 */
export function importePago(saldoValue: number): number {
  return saldoValue <= 0 ? 0 : round2(saldoValue / 4);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Computes every derived figure for one semester. */
export function computeSemester(input: SemesterAidInput, ratePerCredit: number): SemesterComputed {
  const coste = costeSemestre(input.credits, input.fees, ratePerCredit);
  const ayuda = ayudaSemestre(input.pell, input.sub, input.unsub, input.plus);
  const bal = saldo(coste, ayuda);
  const fin = financiado(bal);
  return {
    n: input.n,
    credits: input.credits,
    fees: input.fees,
    costeSemestre: coste,
    ayudaSemestre: ayuda,
    saldo: bal,
    financiado: fin,
    totalPago: totalPago(fin),
    precioVenta: precioVenta(fin),
    numPagos: numPagos(bal),
    importePago: importePago(bal),
  };
}

/** Computes the full 6-semester contract, including institution-level totals. */
export function computeContract(semesters: SemesterAidInput[], ratePerCredit: number): ContractTotals {
  const computed = semesters
    .slice()
    .sort((a, b) => a.n - b.n)
    .map((s) => computeSemester(s, ratePerCredit));

  const creditsTotal = computed.reduce((sum, s) => sum + s.credits, 0);
  const feesTotal = computed.reduce((sum, s) => sum + s.fees, 0);
  const matricula = creditsTotal * ratePerCredit;
  const costeTotal = matricula + feesTotal;
  const ayudaTotal = computed.reduce((sum, s) => sum + s.ayudaSemestre, 0);

  return { creditsTotal, matricula, feesTotal, costeTotal, ayudaTotal, semesters: computed };
}

// ---------------------------------------------------------------------------
// Validation (F7) — messages reused verbatim (English, per U7) from
// ESPECIFICACION.md section 12's "Warning" column, so the UI and the hard
// block on "Generate contract" share one source of truth.
// ---------------------------------------------------------------------------

export interface StudentIdentity {
  firstName?: string | null;
  lastName?: string | null;
  ssn?: string | null;
  dateOfBirth?: string | null;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  readyToIssue: boolean;
}

const AID_FIELD_LABELS: Record<"credits" | "fees" | "pell" | "sub" | "unsub" | "plus", string> = {
  credits: "Credits",
  fees: "Fees",
  pell: "Pell",
  sub: "Sub",
  unsub: "Unsub",
  plus: "PLUS",
};

export function validateStudent(
  identity: StudentIdentity,
  semesters: SemesterAidInput[],
  expectedCredits: number,
  classHasSixSemesterDates: boolean,
  ratePerCredit: number = 0
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasName = Boolean(identity.firstName?.trim() && identity.lastName?.trim());

  if (!classHasSixSemesterDates) {
    errors.push("Class must have 6 semesters with dates");
  }

  const totals = computeContract(semesters, 0); // rate not needed for these checks
  const creditsTotal = totals.creditsTotal;

  if (!hasName && creditsTotal > 0) {
    errors.push("Data with no student name");
  }

  if (hasName) {
    if (!identity.ssn?.trim() || !identity.dateOfBirth?.trim()) {
      errors.push("Missing student details");
    }
    if (creditsTotal === 0) {
      errors.push("Missing credits");
    } else if (creditsTotal !== expectedCredits) {
      errors.push(`Credits total ${creditsTotal}, must total ${expectedCredits}`);
    }
  }

  for (const s of semesters) {
    if (creditsTotal > 0 && s.credits > 0 && s.pell === 0 && s.sub === 0 && s.unsub === 0 && s.plus === 0) {
      warnings.push("No aid entered");
      break;
    }
  }

  for (const s of semesters) {
    (Object.keys(AID_FIELD_LABELS) as (keyof typeof AID_FIELD_LABELS)[]).forEach((field) => {
      if (s[field] < 0) {
        errors.push(`Semester ${s.n}: ${AID_FIELD_LABELS[field]} cannot be negative`);
      }
    });
  }

  const ratedTotals = computeContract(semesters, ratePerCredit);
  if (ratedTotals.ayudaTotal > ratedTotals.costeTotal && ratedTotals.costeTotal > 0) {
    warnings.push("Total aid exceeds total cost");
  }

  return { errors, warnings, readyToIssue: errors.length === 0 && hasName && creditsTotal > 0 };
}

// ---------------------------------------------------------------------------
// Presentation formatting (section 5 of the spec)
// ---------------------------------------------------------------------------

export function formatCurrency(value: "N/A" | number): string {
  if (value === "N/A") return "N/A";
  const formatted = Math.abs(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(${formatted})` : formatted; // negatives in parentheses, per U8
}

export function formatPaymentDate(isoDate: string): string {
  // "July 13, 2026" — full month name
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatGraduationDate(isoDate: string): string {
  // "Jul 02, 2028" — abbreviated month
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatDateOfBirth(isoDate: string): string {
  // "8/12/02" — M/D/YY, no leading zeros
  const d = new Date(isoDate + "T00:00:00");
  const yy = d.getFullYear() % 100;
  return `${d.getMonth() + 1}/${d.getDate()}/${yy.toString().padStart(2, "0")}`;
}
