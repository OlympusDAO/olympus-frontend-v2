import { cn } from "@/lib/utils";
import { logoIcon as LogoSvg } from "@/icons";

export function OlympusLogo({ className }: { className?: string }) {
  return <LogoSvg aria-label="Olympus Logo" className={cn("text-primary-t", className)} />;
}
