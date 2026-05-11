export const COURT_REPORTER_AGENT_ID = "court-reporter";

export type CourtReporterAgentConfig = {
  id: typeof COURT_REPORTER_AGENT_ID;
  name: string;
  description: string;
  safetyReminder: string;
};

export const courtReporterAgentConfig: CourtReporterAgentConfig = {
  id: COURT_REPORTER_AGENT_ID,
  name: "Court Reporter",
  description:
    "Draft-assistance agent for transcript-friendly intake, reusable sessions, review workflows, and downloadable output metadata.",
  safetyReminder:
    "Always present generated language as draft assistance for human review; never imply certification authority.",
};
