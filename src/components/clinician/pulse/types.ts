// Presentation-side lookup: the analytics models speak in patientId only
// (they're name-agnostic by design). The dashboard page resolves each
// patientId to a display name and the caseload link that opens that
// patient, and passes this map into the pulse widgets so rankings and the
// status overview can render names and link through to the patient page.
export type PatientRef = { name: string; caseloadLinkId: string };
export type PatientRefMap = Record<string, PatientRef>;
