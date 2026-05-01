import { useEffect } from "react";
import posthog from "posthog-js";

export function useGlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason?.message?.includes("User rejected")) return;
      posthog.captureException(reason instanceof Error ? reason : new Error(String(reason)));
    };

    const handleError = (event: ErrorEvent) => {
      if (event.error) posthog.captureException(event.error);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);
}
