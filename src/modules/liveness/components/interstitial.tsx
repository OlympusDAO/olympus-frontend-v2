import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface InterstitialItem {
  icon: React.ReactNode;
  headline: string;
  description: string;
}

interface InterstitialProps {
  items: InterstitialItem[];
}

export function Interstitial({ items }: InterstitialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "grid gap-4 transition-all duration-700",
        items.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      {items.map((item) => (
        <div
          key={item.headline}
          className="flex items-start gap-4 rounded-2xl border border-a5-b bg-surface-a3 px-6 py-5"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-a5 text-secondary-t">
            {item.icon}
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">{item.headline}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary-t">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
