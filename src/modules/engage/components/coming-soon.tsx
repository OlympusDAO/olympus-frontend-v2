import { useTheme } from "@/components/theme-provider";
import darkWebm from "@/assets/videos/engage-loader-dark.webm";
import lightWebm from "@/assets/videos/engage-loader-light.webm";

export function ComingSoon() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
      <div className="relative size-[320px]">
        <video
          key={resolvedTheme}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={isDark ? darkWebm : lightWebm} type="video/webm" />
        </video>
      </div>

      <p className="mt-4 text-[18px]/6 font-normal text-secondary-t text-center">
        The ascent begins soon...
      </p>
    </div>
  );
}
