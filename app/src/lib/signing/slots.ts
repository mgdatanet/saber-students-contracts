/**
 * The signature and initial boxes in the contract, named once and shared by
 * the renderer that draws them and the signing page that fills them.
 * Deliberately free of server imports so client components can use it too.
 */
export const INITIAL_SLOT_IDS = ["i1", "i2", "i3", "i4"] as const;

export const STUDENT_SLOT_IDS = [...INITIAL_SLOT_IDS, "student-signature"] as const;

export const SCHOOL_SLOT_IDS = ["school-signature"] as const;

export type SlotId =
  | (typeof INITIAL_SLOT_IDS)[number]
  | "student-signature"
  | "school-signature"
  | "d-student"
  | "d-school";
