import Lottie from "lottie-react";
import spinnerAnimation from "@/assets/animations/spinner.json";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <Lottie
      animationData={spinnerAnimation}
      loop
      autoplay
      className={cn("size-5 shrink-0 dark:invert", className)}
    />
  );
}
