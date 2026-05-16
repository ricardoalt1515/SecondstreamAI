import type { MyUIMessage } from "@/types/ui-message";

const FIELD_BRIEF_TRIGGER_PHRASES = [
  "give me the brief",
  "what's the brief",
  "whats the brief",
  "field brief please",
  "what should i do here",
  "build me a brief",
] as const;

type TriggerMessage = Pick<MyUIMessage, "role" | "parts">;

type ArtifactTriggerInput = {
  messages: TriggerMessage[];
};

const textFromMessage = (message: TriggerMessage): string =>
  message.parts
    .filter((part): part is Extract<MyUIMessage["parts"][number], { type: "text" }> =>
      Boolean(part && part.type === "text"),
    )
    .map((part) => part.text)
    .join("\n")
    .toLowerCase();

const hasFilePart = (message: TriggerMessage): boolean =>
  message.parts.some((part) => part?.type === "file");

const lastUserMessage = (messages: TriggerMessage[]): TriggerMessage | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") {
      return messages[index];
    }
  }
  return null;
};

export type ArtifactTriggerState = {
  hasAttachment: boolean;
  triggerPhraseMatched: boolean;
  shouldGenerateFieldBrief: boolean;
};

export const getArtifactTriggerState = ({
  messages,
}: ArtifactTriggerInput): ArtifactTriggerState => {
  const userMessage = lastUserMessage(messages);
  if (!userMessage) {
    return { hasAttachment: false, shouldGenerateFieldBrief: false, triggerPhraseMatched: false };
  }

  const text = textFromMessage(userMessage);
  const hasAttachment = hasFilePart(userMessage);
  const triggerPhraseMatched = FIELD_BRIEF_TRIGGER_PHRASES.some((phrase) => text.includes(phrase));

  return {
    hasAttachment,
    triggerPhraseMatched,
    shouldGenerateFieldBrief: hasAttachment || triggerPhraseMatched,
  };
};

export const buildArtifactTriggerReminder = (input: ArtifactTriggerInput): string => {
  const state = getArtifactTriggerState(input);
  const stateLine = `{ hasAttachment: ${state.hasAttachment}, triggerPhraseMatched: ${state.triggerPhraseMatched} }`;

  if (state.shouldGenerateFieldBrief) {
    return `<system-reminder source="server" artifactTriggerState="${stateLine}">This is an opportunity-advancing turn. Emit ALL FOUR tool calls in your SAME assistant response: generateFieldBrief, generatePlaybook, generateAnalyticalRead, generateProposalShell. The runtime runs them in parallel. Do NOT call them in sequence across multiple steps.</system-reminder>`;
  }

  return `<system-reminder source="server" artifactTriggerState="${stateLine}">This is a fast-path conversational turn. Do not call artifact generation tools unless the user explicitly requested a specific artefact (Field Brief, Playbook, Analytical Read, or Proposal Shell).</system-reminder>`;
};
