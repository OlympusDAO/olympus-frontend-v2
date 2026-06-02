import { useEffect } from "react";
import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import posthog from "posthog-js";
import { ErrorScreen } from "@/components/error-screen";

/**
 * React Router `errorElement` — React Router intercepts errors thrown inside
 * route components before they bubble to React error boundaries, so we need a
 * dedicated route-aware fallback that uses `useRouteError`.
 *
 * Wire onto the root route in `routes.tsx`.
 */
export function RouteErrorElement() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Normalize whatever React Router gave us into an Error for display + reporting.
  const errorObj: Error = (() => {
    if (error instanceof Error) return error;
    if (isRouteErrorResponse(error)) {
      return new Error(`${error.status} ${error.statusText}: ${error.data ?? "Route error"}`);
    }
    return new Error(typeof error === "string" ? error : "Unknown route error");
  })();

  useEffect(() => {
    console.error("Error caught by route error element:", errorObj);
    posthog.captureException(errorObj, { source: "route-error-element" });
  }, [errorObj]);

  return <ErrorScreen error={errorObj} onReset={() => navigate("/pulse/overview")} />;
}
