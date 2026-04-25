import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// lottie-react pulls in lottie-web, which touches canvas at import time and
// crashes in jsdom. Stub it out — tests don't care about the animation.
vi.mock("lottie-react", () => ({
  default: () => null,
}));
