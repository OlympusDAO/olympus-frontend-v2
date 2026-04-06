import { useRef, useEffect } from "react";
import Lottie from "lottie-react";
import type { LottieRefCurrentProps } from "lottie-react";
import { cn } from "@/lib/utils";

export function LottieIcon({
  animationData,
  isHovered,
  isActive,
}: {
  animationData: unknown;
  isHovered: boolean;
  isActive: boolean;
}) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (!lottieRef.current) return;

    if (isHovered) {
      lottieRef.current.goToAndPlay(0);
    } else {
      lottieRef.current.goToAndStop(0);
    }
  }, [isHovered]);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={false}
      autoplay={false}
      className={cn(
        "size-6 transition-[filter,opacity] dark:invert",
        isActive || isHovered ? "opacity-100" : "opacity-60",
      )}
    />
  );
}
