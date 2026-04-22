import { ColorModeWrapper } from "@/components/color-mode-wrapper";
import engageLoaderDark from "@/assets/videos/engage-loader-dark.mp4";
import engageLoaderLight from "@/assets/videos/engage-loader-light.mp4";

export function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
      <div className="relative size-[320px]">
        <ColorModeWrapper
          light={
            <video
              src={engageLoaderLight}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          }
          dark={
            <video
              src={engageLoaderDark}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          }
        />
      </div>

      <p className="mt-4 text-[18px]/6 font-normal text-secondary-t text-center">
        The ascent begins soon...
      </p>
    </div>
  );
}
