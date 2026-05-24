"use client";

import { useEffect } from "react";
import { ErrorState } from "../../components/error-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("SomniacOS app shell error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <ErrorState
      title="Command center recovered from a fault"
      message="A dApp function failed to render. Retry this module, or return to the command center while the rest of the economy remains isolated."
      onAction={reset}
    />
  );
}
