"use client";

import { useEffect } from "react";
import "./globals.css";
import { ErrorState } from "../components/error-state";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("SomniacOS global error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorState
          title="Critical runtime fault"
          message="SomniacOS caught a global rendering failure. The error has been isolated; retry to restore the autonomous economy interface."
          onAction={reset}
        />
      </body>
    </html>
  );
}
