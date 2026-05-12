import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// lottie-react pulls in lottie-web, which touches canvas at import time and
// crashes in jsdom. Stub it out — tests don't care about the animation.
vi.mock("lottie-react", () => ({
  default: () => null,
}));

// jsdom doesn't implement matchMedia; provide a permissive stub so components
// that probe viewport breakpoints (e.g. useIsMobile) render in tests.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});
