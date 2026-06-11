"use client";

import { useEffect } from "react";
import "./globals.css";
import { ErrorState } from "../components/error-state";
import { normalizeAppError } from "../lib/app-error";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const normalized = normalizeAppError(error);
  useEffect(() => {
    console.error("SomniacOS global error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorState
          title="SomniacOS could not load"
          message={normalized.message}
          recovery={normalized.action}
          code={error.digest ?? normalized.code}
          onAction={reset}
        />
      </body>
    </html>
  );
}
