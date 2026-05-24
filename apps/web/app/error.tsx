"use client";

import { useEffect } from "react";
import { ErrorState } from "../components/error-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("SomniacOS route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <ErrorState
      title="The economy loop faulted"
      message="A page-level fault was caught before it could corrupt the interface. Retry the render or return to the command center."
      onAction={reset}
    />
  );
}
