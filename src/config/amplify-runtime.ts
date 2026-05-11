import outputs from "../../amplify_outputs.json";

type AmplifyOutputs = {
  auth?: unknown;
  data?: unknown;
  storage?: unknown;
  version?: string;
};

const REQUIRED_OUTPUT_SECTIONS = ["auth", "data", "storage"] as const;

export const getMissingAmplifyOutputSections = (candidate: AmplifyOutputs = outputs): string[] =>
  REQUIRED_OUTPUT_SECTIONS.filter((section) => candidate[section] === undefined);

export const assertAmplifyOutputsConfigured = (candidate: AmplifyOutputs = outputs): void => {
  const missing = getMissingAmplifyOutputSections(candidate);

  if (missing.length === 0) {
    return;
  }

  throw new Error(
    [
      "Amplify outputs are not configured for Auth, Data, and Storage.",
      "Use Node LTS, then run `npx ampx sandbox` or deploy the Amplify backend.",
      "Copy the generated amplify_outputs.json into the project root before release verification.",
      `Missing sections: ${missing.join(", ")}.`,
    ].join(" "),
  );
};

if (import.meta.main) {
  assertAmplifyOutputsConfigured();
  console.info("Amplify outputs include Auth, Data, and Storage sections.");
}
