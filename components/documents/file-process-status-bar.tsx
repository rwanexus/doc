import { useEffect, useState } from "react";

import useSWR from "swr";
import useSWRImmutable from "swr/immutable";

import { Progress } from "@/components/ui/progress";

import { cn, fetcher } from "@/lib/utils";
import { useDocumentProgressStatus } from "@/lib/utils/use-progress-status";

const QUEUED_MESSAGES = [
  "Converting document...",
  "Optimizing for viewing...",
  "Preparing preview...",
  "Almost ready...",
];

type LocalProgressResponse = {
  localMode?: boolean;
  status?: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress?: number;
  message?: string | null;
  error?: string | null;
  publicAccessToken?: string | null;
  selfHosted?: boolean;
};

export default function FileProcessStatusBar({
  documentVersionId,
  className,
  mutateDocument,
  onProcessingChange,
}: {
  documentVersionId: string;
  className?: string;
  mutateDocument: () => void;
  onProcessingChange?: (processing: boolean) => void;
}) {
  const [messageIndex, setMessageIndex] = useState(0);
  
  // Fetch initial status
  const { data: initialData, mutate: mutateProgress } = useSWR<LocalProgressResponse>(
    `/api/progress-token?documentVersionId=${documentVersionId}`,
    fetcher,
    {
      refreshInterval: (data) => {
        // Poll every 2 seconds if in local mode and not completed
        if (data?.localMode && data?.status !== "COMPLETED" && data?.status !== "FAILED") {
          return 2000;
        }
        return 0; // Stop polling
      },
    }
  );

  // For Trigger.dev mode (if publicAccessToken is available)
  const { status: triggerStatus, error: triggerError } =
    useDocumentProgressStatus(documentVersionId, initialData?.publicAccessToken ?? undefined);

  // Handle local mode status updates
  useEffect(() => {
    if (initialData?.localMode) {
      const isProcessing = initialData.status === "QUEUED" || initialData.status === "PROCESSING";
      onProcessingChange?.(isProcessing);
      
      if (initialData.status === "COMPLETED") {
        mutateDocument();
      }
    }
  }, [initialData?.localMode, initialData?.status, mutateDocument, onProcessingChange]);

  // Handle Trigger.dev mode status updates
  useEffect(() => {
    if (!initialData?.localMode && initialData?.publicAccessToken) {
      onProcessingChange?.(
        triggerStatus.state === "QUEUED" || triggerStatus.state === "EXECUTING"
      );
    }
  }, [initialData?.localMode, initialData?.publicAccessToken, triggerStatus.state, onProcessingChange]);

  // Cycle through messages when queued
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isQueued = initialData?.localMode 
      ? initialData?.status === "QUEUED"
      : triggerStatus.state === "QUEUED";

    if (isQueued) {
      interval = setInterval(() => {
        setMessageIndex((current) => (current + 1) % QUEUED_MESSAGES.length);
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [initialData?.localMode, initialData?.status, triggerStatus.state]);

  // Local mode rendering
  if (initialData?.localMode) {
    const { status, progress, message, error } = initialData;

    if (status === "COMPLETED") {
      return null;
    }

    if (status === "FAILED" || error) {
      return (
        <Progress
          value={0}
          text={error || message || "Error processing document"}
          error={true}
          className={cn("w-full rounded-none text-[8px] font-semibold", className)}
        />
      );
    }

    if (status === "QUEUED") {
      return (
        <Progress
          value={0}
          text={QUEUED_MESSAGES[messageIndex]}
          className={cn("w-full rounded-none text-[8px] font-semibold", className)}
        />
      );
    }

    if (status === "PROCESSING") {
      return (
        <Progress
          value={progress || 0}
          text={message || "Processing document..."}
          className={cn("w-full rounded-none text-[8px] font-semibold", className)}
        />
      );
    }

    // Default: assume completed if no status
    mutateDocument();
    return null;
  }

  // Trigger.dev mode (legacy) - self-hosted fallback
  if (initialData?.selfHosted || (initialData && initialData.publicAccessToken === null)) {
    onProcessingChange?.(false);
    setTimeout(() => mutateDocument(), 1000);
    return null;
  }

  // Trigger.dev mode rendering
  if (triggerStatus.state === "QUEUED" && !triggerError) {
    return (
      <Progress
        value={0}
        text={QUEUED_MESSAGES[messageIndex]}
        className={cn("w-full rounded-none text-[8px] font-semibold", className)}
      />
    );
  }

  if (
    triggerError ||
    ["FAILED", "CRASHED", "CANCELED", "SYSTEM_FAILURE"].includes(triggerStatus.state)
  ) {
    return (
      <Progress
        value={0}
        text={triggerError?.message || triggerStatus.text || "Error processing document"}
        error={true}
        className={cn("w-full rounded-none text-[8px] font-semibold", className)}
      />
    );
  }

  if (triggerStatus.state === "COMPLETED") {
    mutateDocument();
    return null;
  }

  return (
    <Progress
      value={triggerStatus.progress || 0}
      text={triggerStatus.text || "Processing document..."}
      className={cn("w-full rounded-none text-[8px] font-semibold", className)}
    />
  );
}
