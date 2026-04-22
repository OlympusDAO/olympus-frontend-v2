import { useTheme } from "@/components/theme-provider";
import engageLoaderDark from "@/assets/videos/engage-loader-dark.mp4";
import engageLoaderLight from "@/assets/videos/engage-loader-light.mp4";

export function ComingSoon() {
  const { resolvedTheme } = useTheme();
  const videoSrc = resolvedTheme === "dark" ? engageLoaderDark : engageLoaderLight;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
      <div className="relative size-[320px]">
        <video
          key={resolvedTheme}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      <p className="mt-4 text-[18px]/6 font-normal text-secondary-t text-center">
        The ascent begins soon...
      </p>
    </div>
  );
}
