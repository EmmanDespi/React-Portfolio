// ============================================================
// SAMPLE DATA (all fictional). Used only to seed local storage.
// SERVERLESS: delete this file once the backend returns real data.
// ============================================================
import type { HealthDb } from "../types";
import { daysAgo } from "../utils";

export const seedDb: HealthDb = {
  patients: [
    { id: "pt-101", name: "Sarah Connor", birthDate: "1984-05-13", location: "The resistance headquarters", bloodType: "O+", allergies: ["Penicillin"], policyNum: 102321309123, policyLevel: "Gold", hmoId: "hmo-1", hmoVerified: true },
    { id: "pt-102", name: "John Connor", birthDate: "2010-02-28", location: "The resistance headquarters", bloodType: "A+", allergies: [], policyNum: 102321309124, policyLevel: "Gold", hmoId: "hmo-1", hmoVerified: true },
    { id: "pt-103", name: "Kyle Reese", birthDate: "1984-11-02", location: "Tech-Com outpost", bloodType: "B+", allergies: ["Latex"], policyNum: 554400118822, policyLevel: "Silver", hmoId: "hmo-2", hmoVerified: true },
  ],
  staff: [
    { id: "dr-1", name: "Dr. Miles Dyson", role: "doctor", department: "Internal Medicine", specialty: "Internist", license: "PRC-0412233", active: true },
    { id: "dr-2", name: "Dr. Silberman", role: "doctor", department: "Psychiatry", specialty: "Psychiatrist", license: "PRC-0398812", active: true },
    { id: "nr-1", name: "Nurse Jordan Reyes", role: "nurse", department: "Internal Medicine", specialty: "Staff nurse", license: "PRC-N-77120", active: true },
    { id: "nr-2", name: "Nurse Ana Cruz", role: "nurse", department: "Laboratory", specialty: "Lab nurse", license: "PRC-N-77455", active: true },
    { id: "adm-1", name: "Hospital Admin", role: "admin", department: "Administration", specialty: "Administrator", license: "ADM-001", active: true },
  ],
  hmos: [
    { id: "hmo-1", name: "MediCare Plus", coveredProcedures: ["Complete Blood Count", "Chest X-ray", "ECG", "Consultation"] },
    { id: "hmo-2", name: "LifeGuard HMO", coveredProcedures: ["Complete Blood Count", "Consultation"] },
  ],
  vitals: [
    { id: "v-1", patientId: "pt-101", takenBy: "nr-1", at: daysAgo(2), bp: "118/76", hr: 72, tempC: 36.6, spo2: 98 },
    { id: "v-2", patientId: "pt-101", takenBy: "nr-1", at: daysAgo(40), bp: "124/80", hr: 78, tempC: 36.8, spo2: 97 },
    { id: "v-3", patientId: "pt-103", takenBy: "nr-2", at: daysAgo(1), bp: "130/85", hr: 84, tempC: 37.2, spo2: 96 },
  ],
  conditions: [
    { id: "c-1", patientId: "pt-101", name: "Seasonal allergic rhinitis", since: daysAgo(900), status: "active" },
    { id: "c-2", patientId: "pt-101", name: "Acute bronchitis", since: daysAgo(120), status: "resolved" },
    { id: "c-3", patientId: "pt-103", name: "Mild hypertension", since: daysAgo(60), status: "active" },
  ],
  medications: [
    { id: "m-1", patientId: "pt-101", name: "Cetirizine", dose: "10 mg", frequency: "Once daily", prescribedBy: "dr-1", startedAt: daysAgo(30), active: true },
    { id: "m-2", patientId: "pt-101", name: "Azithromycin", dose: "500 mg", frequency: "Once daily, 3 days", prescribedBy: "dr-1", startedAt: daysAgo(120), active: false },
    { id: "m-3", patientId: "pt-103", name: "Amlodipine", dose: "5 mg", frequency: "Once daily", prescribedBy: "dr-1", startedAt: daysAgo(55), active: true },
  ],
  consultations: [
    { id: "co-1", patientId: "pt-101", doctorId: "dr-1", at: daysAgo(30), complaint: "Sneezing and itchy eyes for two weeks", diagnosis: "Seasonal allergic rhinitis", notes: "Start antihistamine. Avoid dust exposure. Return if symptoms persist." },
    { id: "co-2", patientId: "pt-103", doctorId: "dr-1", at: daysAgo(60), complaint: "Headaches, elevated BP at checkup", diagnosis: "Mild hypertension", notes: "Lifestyle changes and low-dose amlodipine. Recheck in 4 weeks." },
  ],
  labRequests: [
    { id: "lr-1", patientId: "pt-101", requestedBy: "dr-1", test: "Complete Blood Count", at: daysAgo(3), status: "resulted" },
    { id: "lr-2", patientId: "pt-103", requestedBy: "dr-1", test: "Lipid Profile", at: daysAgo(1), status: "requested" },
    { id: "lr-3", patientId: "pt-102", requestedBy: "dr-2", test: "Complete Blood Count", at: daysAgo(1), status: "collected" },
  ],
  labResults: [
    {
      id: "res-1", requestId: "lr-1", patientId: "pt-101", test: "Complete Blood Count", enteredBy: "nr-2", at: daysAgo(2),
      values: [
        { name: "Hemoglobin", value: 13.4, unit: "g/dL", low: 12, high: 16, flag: "normal" },
        { name: "WBC", value: 11.8, unit: "x10^9/L", low: 4, high: 11, flag: "high" },
        { name: "Platelets", value: 250, unit: "x10^9/L", low: 150, high: 400, flag: "normal" },
      ],
    },
  ],
  certificates: [
    { id: "ce-1", patientId: "pt-101", type: "Medical certificate", reason: "Bronchitis, rest advised", status: "issued", requestedAt: daysAgo(125), issuedBy: "dr-1", issuedAt: daysAgo(124), note: "Fit to return to work after 3 days of rest." },
    { id: "ce-2", patientId: "pt-101", type: "Fit to work", reason: "Annual employment requirement", status: "requested", requestedAt: daysAgo(1) },
  ],
  authorizations: [
    { id: "au-1", patientId: "pt-101", hmoId: "hmo-1", requestedBy: "nr-1", procedure: "Complete Blood Count", status: "approved", verifiedAt: daysAgo(3), respondedAt: daysAgo(3), coveredAmount: 850, remarks: "Fully covered under Gold plan." },
    { id: "au-2", patientId: "pt-103", hmoId: "hmo-2", requestedBy: "nr-1", procedure: "Lipid Profile", status: "verified", verifiedAt: daysAgo(1) },
  ],
  audit: [],
};
