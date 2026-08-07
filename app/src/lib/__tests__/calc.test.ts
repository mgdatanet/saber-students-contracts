import { describe, expect, it } from "vitest";
import { computeContract, formatCurrency, validateStudent, type SemesterAidInput } from "../calc";

const RATE = 582;

// Fixture data verbatim from ESPECIFICACION.md section 9, hand-verified against
// the real Excel workbook and Contracts 2026.pdf.

const ana: SemesterAidInput[] = [
  { n: 1, credits: 13, fees: 217, pell: 3698, sub: 1732, unsub: 2969, plus: 0, efc: -1500 },
  { n: 2, credits: 13, fees: 217, pell: 3698, sub: 1732, unsub: 2969, plus: 0, efc: -1500 },
  { n: 3, credits: 13, fees: 603, pell: 3697, sub: 2227, unsub: 2969, plus: 0, efc: -1500 },
  { n: 4, credits: 14, fees: 603, pell: 3697, sub: 2227, unsub: 2969, plus: 0, efc: -1500 },
  { n: 5, credits: 13, fees: 603, pell: 0, sub: 2721, unsub: 3464, plus: 0, efc: 0 },
  { n: 6, credits: 14, fees: 603, pell: 0, sub: 2721, unsub: 3464, plus: 0, efc: 0 },
];

const karelia: SemesterAidInput[] = [
  { n: 1, credits: 13, fees: 217, pell: 1543, sub: 1732, unsub: 2969, plus: 0, efc: 4311 },
  { n: 2, credits: 13, fees: 217, pell: 1543, sub: 1732, unsub: 2969, plus: 0, efc: 4311 },
  { n: 3, credits: 13, fees: 603, pell: 1543, sub: 2227, unsub: 2969, plus: 0, efc: 4311 },
  { n: 4, credits: 14, fees: 603, pell: 3697, sub: 2227, unsub: 2969, plus: 0, efc: -1500 },
  { n: 5, credits: 13, fees: 603, pell: 0, sub: 2721, unsub: 3464, plus: 0, efc: 0 },
  { n: 6, credits: 14, fees: 603, pell: 0, sub: 2721, unsub: 3464, plus: 0, efc: 0 },
];

const julio: SemesterAidInput[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  n,
  credits: 0,
  fees: 0,
  pell: 0,
  sub: 0,
  unsub: 0,
  plus: 0,
  efc: 0,
}));

describe("computeContract — Ana Muguerza Horta (aid covers almost everything)", () => {
  const result = computeContract(ana, RATE);

  it("totals match the spec exactly", () => {
    expect(result.creditsTotal).toBe(80);
    expect(result.matricula).toBe(46560);
    expect(result.costeTotal).toBe(49406);
    expect(result.ayudaTotal).toBe(46954);
  });

  it("financiado/num_pagos/importe_pago match per semester", () => {
    const expectedFinanciado = ["N/A", "N/A", "N/A", "N/A", 1984, 2566];
    const expectedNumPagos = [0, 0, 0, 0, 4, 4];
    const expectedImportePago = [0, 0, 0, 0, 496.0, 641.5];

    result.semesters.forEach((s, i) => {
      expect(s.financiado).toBe(expectedFinanciado[i]);
      expect(s.numPagos).toBe(expectedNumPagos[i]);
      expect(s.importePago).toBe(expectedImportePago[i]);
    });
  });

  it("is ready to issue", () => {
    const v = validateStudent(
      { firstName: "Ana", lastName: "Muguerza Horta", ssn: "307-83-0409", dateOfBirth: "2002-08-12" },
      ana,
      80,
      true
    );
    expect(v.errors).toEqual([]);
    expect(v.readyToIssue).toBe(true);
  });
});

describe("computeContract — Karelia Montero Guerra (mixed: semester 4 is N/A in the middle)", () => {
  const result = computeContract(karelia, RATE);

  it("totals match the spec exactly", () => {
    expect(result.creditsTotal).toBe(80);
    expect(result.matricula).toBe(46560);
    expect(result.costeTotal).toBe(49406);
    expect(result.ayudaTotal).toBe(40490);
  });

  it("financiado/num_pagos/importe_pago match per semester, including a mid-sequence N/A", () => {
    const expectedFinanciado = [1539, 1539, 1430, "N/A", 1984, 2566];
    const expectedNumPagos = [4, 4, 4, 0, 4, 4];
    const expectedImportePago = [384.75, 384.75, 357.5, 0, 496.0, 641.5];

    result.semesters.forEach((s, i) => {
      expect(s.financiado).toBe(expectedFinanciado[i]);
      expect(s.numPagos).toBe(expectedNumPagos[i]);
      expect(s.importePago).toBe(expectedImportePago[i]);
    });
  });

  it("is ready to issue", () => {
    const v = validateStudent(
      { firstName: "Karelia", lastName: "Montero Guerra", ssn: "382-45-0476", dateOfBirth: "1996-02-07" },
      karelia,
      80,
      true
    );
    expect(v.errors).toEqual([]);
    expect(v.readyToIssue).toBe(true);
  });
});

describe("computeContract — Julio Bakeiro (freshly enrolled, all semesters at zero)", () => {
  const result = computeContract(julio, RATE);

  it("totals are all zero", () => {
    expect(result.creditsTotal).toBe(0);
    expect(result.costeTotal).toBe(0);
    expect(result.ayudaTotal).toBe(0);
  });

  it("MUST fail validation and block issuing a contract", () => {
    const v = validateStudent(
      { firstName: "Julio", lastName: "Bakeiro", ssn: "987-23-4567", dateOfBirth: "1984-12-01" },
      julio,
      80,
      true
    );
    expect(v.errors).toContain("Missing credits");
    expect(v.readyToIssue).toBe(false);
  });
});

describe("edge cases from ESPECIFICACION.md section 6", () => {
  it("a negative saldo never renders as a negative number or a refund (6.NB)", () => {
    const result = computeContract(ana, RATE);
    result.semesters.slice(0, 4).forEach((s) => {
      expect(s.saldo).toBeLessThan(0);
      expect(s.financiado).toBe("N/A");
    });
  });

  it("negative EFC is allowed and does not trigger a negative-amount validation error (6.7 / glossary)", () => {
    const v = validateStudent(
      { firstName: "Ana", lastName: "Muguerza Horta", ssn: "307-83-0409", dateOfBirth: "2002-08-12" },
      ana,
      80,
      true
    );
    expect(v.errors.some((e) => e.includes("EFC"))).toBe(false);
  });

  it("negative amounts on real financial fields (not EFC) are blocked", () => {
    const bad: SemesterAidInput[] = ana.map((s, i) => (i === 0 ? { ...s, fees: -50 } : s));
    const v = validateStudent(
      { firstName: "Ana", lastName: "Muguerza Horta", ssn: "307-83-0409", dateOfBirth: "2002-08-12" },
      bad,
      80,
      true
    );
    expect(v.errors).toContain("Semester 1: Fees cannot be negative");
  });

  it("formatCurrency renders negatives in parentheses (U8) and N/A as-is", () => {
    expect(formatCurrency(1984)).toBe("$1,984.00");
    expect(formatCurrency(-616)).toBe("($616.00)");
    expect(formatCurrency("N/A")).toBe("N/A");
  });
});
