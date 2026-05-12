export const COURT_REPORTER_AGENT_ID = "court-reporter";

export type CourtReporterAgentConfig = {
  id: typeof COURT_REPORTER_AGENT_ID;
  name: string;
  description: string;
  safetyReminder: string;
};

export const courtReporterAgentConfig: CourtReporterAgentConfig = {
  id: COURT_REPORTER_AGENT_ID,
  name: "Water Sector",
  description:
    "Draft-assistance agent for water-sector intake, reusable sessions, review workflows, and downloadable output metadata.",
  safetyReminder:
    "Always present generated analysis as draft support for qualified human review; never imply regulatory, engineering, legal, or operational certification authority.",
};
