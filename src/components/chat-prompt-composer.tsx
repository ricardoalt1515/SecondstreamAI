import type { ChatStatus } from "ai";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachmentPreview,
  PromptInputAttachmentRemove,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_REQUEST,
  SUPPORTED_ATTACHMENT_MIME_PATTERNS,
} from "@/config/models";
import { useDraftInput } from "@/hooks/use-draft-input";

type ChatPromptComposerProps = {
  className: string;
  errorMessage?: string | null;
  onInteract?: () => void;
  onSubmitMessage: (message: PromptInputMessage) => void;
  placeholder: string;
  status: ChatStatus;
  textareaClassName: string;
};

type PromptInputErrorCode = "max_files" | "max_file_size" | "accept" | "read_failed";

export const getAttachmentValidationMessage = (code: PromptInputErrorCode): string => {
  switch (code) {
    case "max_file_size":
      return "Each file must be 4MB or smaller.";
    case "max_files":
      return `You can attach up to ${MAX_ATTACHMENTS_PER_REQUEST} files per message.`;
    case "accept":
      return "Unsupported file type. Use PNG, JPEG, GIF, WebP, PDF, plain text, Markdown, CSV, or HTML.";
    case "read_failed":
      return "We couldn't read one or more files. Remove them and try again.";
    default:
      return "We couldn't attach that file.";
  }
};

function PromptComposerStateWatcher({
  onComposerChange,
}: {
  onComposerChange: () => void;
}): React.JSX.Element | null {
  const attachments = usePromptInputAttachments();
  const { textInput } = usePromptInputController();
  const attachmentCount = attachments.files.length;
  const draftValue = textInput.value;

  useEffect(() => {
    void attachmentCount;
    void draftValue;
    onComposerChange();
  }, [attachmentCount, draftValue, onComposerChange]);

  return null;
}

function PromptInputAttachmentsHeader(): React.JSX.Element | null {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <PromptInputHeader>
      <PromptInputAttachments>
        {(attachment): React.JSX.Element => (
          <PromptInputAttachment data={attachment} key={attachment.id}>
            <PromptInputAttachmentPreview />
            <PromptInputAttachmentRemove />
          </PromptInputAttachment>
        )}
      </PromptInputAttachments>
    </PromptInputHeader>
  );
}

function PdfInstructionHint(): React.JSX.Element | null {
  const attachments = usePromptInputAttachments();
  const { textInput } = usePromptInputController();

  const hasPdfAttachment = attachments.files.some((file) => file.mediaType === "application/pdf");

  if (!hasPdfAttachment || textInput.value.trim().length > 0) {
    return null;
  }

  return (
    <output className="block px-3 pb-1 text-muted-foreground text-xs">
      Add a short instruction.
    </output>
  );
}

function PromptSubmitButton({ status }: { status: ChatStatus }): React.JSX.Element {
  const attachments = usePromptInputAttachments();
  const { textInput } = usePromptInputController();

  const hasPdfAttachment = attachments.files.some((file) => file.mediaType === "application/pdf");

  const requiresInstruction = hasPdfAttachment && textInput.value.trim().length === 0;

  return <PromptInputSubmit disabled={requiresInstruction} status={status} />;
}

/**
 * Syncs the PromptInputProvider's internal text state to localStorage (debounced).
 * Must be rendered inside <PromptInputProvider>.
 * Does NOT cause parent re-renders — writes are fire-and-forget into storage.
 */
function DraftSync({ onTextChange }: { onTextChange: (v: string) => void }) {
  const { textInput } = usePromptInputController();
  const prevValueRef = useRef(textInput.value);

  useEffect(() => {
    // Only sync when value actually changed (skip initial mount value).
    if (textInput.value !== prevValueRef.current) {
      prevValueRef.current = textInput.value;
      onTextChange(textInput.value);
    }
  }, [textInput.value, onTextChange]);

  return null;
}

export function ChatPromptComposer({
  className,
  errorMessage,
  onInteract,
  onSubmitMessage,
  placeholder,
  status,
  textareaClassName,
}: ChatPromptComposerProps): React.JSX.Element {
  const draft = useDraftInput();
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const selectedModelId = draft.modelId;

  const handleSubmit = useCallback(
    (message: PromptInputMessage): void => {
      setAttachmentError(null);
      onSubmitMessage({
        ...message,
        modelId: selectedModelId,
        webSearchEnabled: false,
      });
      draft.clear();
    },
    [onSubmitMessage, selectedModelId, draft.clear],
  );

  const textareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    // Defer so React's controlled value reconciliation finishes first.
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
    });
  }, []);

  return (
    <PromptInputProvider initialInput={draft.initialText}>
      <DraftSync onTextChange={draft.setText} />
      <PromptComposerStateWatcher
        onComposerChange={() => {
          setAttachmentError(null);
          onInteract?.();
        }}
      />
      <PromptInput
        accept={SUPPORTED_ATTACHMENT_MIME_PATTERNS.join(",")}
        className={className}
        maxFileSize={MAX_ATTACHMENT_BYTES}
        maxFiles={MAX_ATTACHMENTS_PER_REQUEST}
        multiple
        onError={({ code }) => {
          setAttachmentError(getAttachmentValidationMessage(code));
        }}
        onSubmit={handleSubmit}
      >
        <PromptInputAttachmentsHeader />

        {attachmentError ? (
          <div className="px-3 pb-1 text-destructive text-xs" role="alert">
            {attachmentError}
          </div>
        ) : null}

        {!attachmentError && errorMessage ? (
          <div className="px-3 pb-1 text-destructive text-xs" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <PdfInstructionHint />

        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            className={textareaClassName}
            placeholder={placeholder}
          />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent className="min-w-48 w-auto">
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>

          <PromptSubmitButton status={status} />
        </PromptInputFooter>
      </PromptInput>
    </PromptInputProvider>
  );
}
