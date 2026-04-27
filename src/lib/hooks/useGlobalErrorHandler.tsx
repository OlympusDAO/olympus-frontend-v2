import { useEffect } from "react";

export function useGlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);

      if (event.reason?.message?.includes("User rejected")) {
        return;
      }

      // toast({
      //   type: "error",
      //   title: "Something went wrong",
      //   description: "An unexpected error occurred. Please try again.",
      // });
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);

      // toast({
      //   type: "error",
      //   title: "Application Error",
      //   description: "An unexpected error occurred. Please refresh the page if the problem persists.",
      // });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);
}
