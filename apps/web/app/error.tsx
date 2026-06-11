"use client";

import { useEffect } from "react";
import { ErrorState } from "../components/error-state";
import { normalizeAppError } from "../lib/app-error";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const normalized = normalizeAppError(error);
  useEffect(() => {
    console.error("SomniacOS route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <ErrorState
      title="This page could not load"
      message={normalized.message}
      recovery={normalized.action}
      code={error.digest ?? normalized.code}
      onAction={reset}
    />
  );
}
