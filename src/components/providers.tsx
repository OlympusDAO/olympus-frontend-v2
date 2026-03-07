import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { hashFn } from "@wagmi/core/query";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "@/lib/wagmi-config";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { DevMockProvider } from "@/lib/mock/provider";
import { DevToolbar } from "@/components/dev-toolbar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: hashFn,
      retry: (failureCount, error) => {
        if (failureCount < 3 && error instanceof Error) {
          return !error.message.includes("User rejected");
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Syncs the RainbowKit modal theme with the app's dark/light mode.
 */
function ThemedRainbowKit({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const resolvedDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const themeFactory = resolvedDark ? darkTheme : lightTheme;
  const rkTheme = themeFactory({
    borderRadius: "medium",
    fontStack: "system",
    accentColor: "#FFFFFF",
    accentColorForeground: "#1A1A1A",
  });

  return <RainbowKitProvider theme={rkTheme}>{children}</RainbowKitProvider>;
}

function DevProvider({ children }: { children: React.ReactNode }) {
  if (import.meta.env.DEV) {
    return (
      <DevMockProvider>
        {children}
        <DevToolbar />
      </DevMockProvider>
    );
  }
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="olympus-theme">
          <ThemedRainbowKit>
            <DevProvider>{children}</DevProvider>
          </ThemedRainbowKit>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
