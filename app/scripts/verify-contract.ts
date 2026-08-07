import { writeFileSync } from "node:fs";
import { renderContractHtml } from "../src/lib/pdf/contractHtml";
import { renderHtmlToPdf } from "../src/lib/pdf/renderPdf";
import type { SemesterAidInput } from "../src/lib/calc";

const ana: SemesterAidInput[] = [
  { n: 1, credits: 13, fees: 217, pell: 3698, sub: 1732, unsub: 2969, plus: 0, efc: -1500 },
  { n: 2, credits: 13, fees: 217, pell: 3698, sub: 1732, unsub: 2969, plus: 0, efc: -1500 },
  { n: 3, credits: 13, fees: 603, pell: 3697, sub: 2227, unsub: 2969, plus: 0, efc: -1500 },
  { n: 4, credits: 14, fees: 603, pell: 3697, sub: 2227, unsub: 2969, plus: 0, efc: -1500 },
  { n: 5, credits: 13, fees: 603, pell: 0, sub: 2721, unsub: 3464, plus: 0, efc: 0 },
  { n: 6, credits: 14, fees: 603, pell: 0, sub: 2721, unsub: 3464, plus: 0, efc: 0 },
];

const semesterDates = [
  { n: 1, startDate: "2026-07-13", endDate: "2026-11-01" },
  { n: 2, startDate: "2026-11-09", endDate: "2027-03-07" },
  { n: 3, startDate: "2027-03-15", endDate: "2027-06-27" },
  { n: 4, startDate: "2027-07-05", endDate: "2027-10-24" },
  { n: 5, startDate: "2027-11-01", endDate: "2028-02-27" },
  { n: 6, startDate: "2028-03-06", endDate: "2028-07-02" },
];

const html = renderContractHtml({
  student: {
    firstName: "Ana",
    lastName: "Muguerza Horta",
    ssn: "307-83-0409",
    dateOfBirth: "2002-08-12",
    phone: null,
    mobile: "786-651-4796",
    address: "3545 NE 167 St apt#207, Miami FL 33160",
    contractDate: "2026-07-13",
  },
  program: {
    name: "Professional Nursing",
    credentialName: "Associate in Science",
    degreeType: "associate",
  },
  klass: {
    schedule: "Evening",
    methodOfDelivery: "Residential",
    tuitionPerCredit: 582,
    creditsTotal: 80,
    weeksTotal: 96,
    monthsTotal: 24,
    minGradePct: 77,
    testingFee: 50,
    applicationFeePerSem: 50,
    registrationFeePerSem: 100,
    skillsLabFee: 500,
    materialsSuppliesFee: 300,
    booksSuppliesFee: 1546.23,
    blsFee: 300,
    otherCostsFee: 300,
    theoryLabHoursA: 885,
    clinicalHoursA: 630,
    theoryLabHoursB: 210,
    clinicalHoursB: 0,
  },
  semesters: ana,
  semesterDates,
  signerName: "Dayanis Camps",
  contractNumber: "SC-2026-VERIFY",
});

writeFileSync("scripts/out-ana.html", html);

async function main() {
  const pdf = await renderHtmlToPdf(html);
  writeFileSync("scripts/out-ana.pdf", pdf);
  console.log("Wrote scripts/out-ana.html and scripts/out-ana.pdf");
}

main();
