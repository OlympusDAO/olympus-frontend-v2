import { useEffect, useRef, useState } from "react";
import { driver, type DriveStep } from "driver.js";
import { useFeatureTour } from "@/lib/hooks/useFeatureTour";
import { FeatureTourWelcomeModal } from "@/components/feature-tour-welcome-modal";
import { badgeVariants } from "@/components/ui/badge.tsx";

const NEW_BADGE = `<span class="${badgeVariants({ variant: "filled", color: "green", size: "sm" })}" style="vertical-align:middle;margin:0 3px;font-size:8px;padding:1px 5px">NEW</span>`;

function buildSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="sidebar-nav"]',
      popover: {
        title: "Everything starts here",
        description: `
          <ul>
            <li><strong>Pulse</strong>${NEW_BADGE}. Live revenue, treasury health, buyback and emission activity, and every on-chain action.</li>
            <li><strong>OHM.</strong> Balances, wrapping (previously Stake), bridging across chains.</li>
            <li><strong>Cooler.</strong> Borrow USDS against your gOHM at 0.5% APR, no liquidation risk.</li>
            <li><strong>CDs.</strong> Convertible Deposits — now built into the app.</li>
            <li><strong>DAO.</strong> Vote on proposals, delegate, view contract parameters (previously Govern).</li>
            <li><strong>Engage</strong>${NEW_BADGE}. CD participants accumulate iOHM, convertible to OHM below market.</li>
          </ul>
        `,
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-home"]',
      popover: {
        title: "Pulse – the protocol, live",
        description: `
          <p style="margin-bottom:8px">What the protocol is doing, what backs it, and every action it takes.</p>
          <ul>
            <li><strong>Overview</strong> — Live revenue, treasury health, buyback and emission activity</li>
            <li><strong>Treasury</strong> — What backs every OHM — assets, liabilities, and protocol-owned liquidity</li>
            <li><strong>Protocol</strong> — Where revenue comes from and how it flows through buybacks and emissions</li>
            <li><strong>Feed</strong> — Every on-chain action as it happens</li>
          </ul>
        `,
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-cds"]',
      popover: {
        title: "Convertible Deposits – now built in",
        description:
          "CDs are now fully integrated into the main app. Same positions, same mechanics — deposit, borrow, and track activity all from the sidebar.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-engage"]',
      popover: {
        title: "Engage – Coming Soon",
        description:
          "Convertible Deposit participants receive iOHM — the right to purchase OHM at a discount to market. The more you participate, the more you accumulate.",
        side: "right",
        align: "center",
      },
    },
  ];
}

function injectFooter(
  popover: { wrapper: HTMLElement },
  stepIndex: number,
  totalSteps: number,
  onSkip: () => void,
  onNext: () => void,
  isLast: boolean,
) {
  // Guard: prevent re-entrant calls (driver.js MutationObserver loop)
  if (popover.wrapper.querySelector(".olympus-tour-footer")) return;

  const footer = document.createElement("div");
  footer.className = "olympus-tour-footer";

  const dots = document.createElement("div");
  dots.className = "olympus-tour-dots";
  dots.innerHTML = Array.from({ length: totalSteps })
    .map((_, i) => `<span class="olympus-tour-dot${i === stepIndex ? " active" : ""}"></span>`)
    .join("");

  const buttons = document.createElement("div");
  buttons.className = "olympus-tour-buttons";

  const skipBtn = document.createElement("button");
  skipBtn.className = "olympus-tour-btn olympus-tour-btn-skip";
  skipBtn.textContent = "Skip";
  skipBtn.addEventListener("click", onSkip);

  const nextBtn = document.createElement("button");
  nextBtn.className = "olympus-tour-btn olympus-tour-btn-next";
  nextBtn.textContent = isLast ? "Got It" : "Next";
  nextBtn.addEventListener("click", onNext);

  buttons.appendChild(skipBtn);
  buttons.appendChild(nextBtn);
  footer.appendChild(dots);
  footer.appendChild(buttons);
  popover.wrapper.appendChild(footer);
}

export function FeatureTour() {
  const { shouldShowModal, startTour, skipTour, completeTour, saveStep } = useFeatureTour();
  const [modalOpen, setModalOpen] = useState(shouldShowModal);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  // Refs for callbacks used inside useEffect — prevents stale closures with [] deps
  const completeTourRef = useRef(completeTour);
  const saveStepRef = useRef(saveStep);
  completeTourRef.current = completeTour;
  saveStepRef.current = saveStep;

  useEffect(() => {
    const steps = buildSteps();

    const driverInstance = driver({
      animate: true,
      overlayOpacity: 0.5,
      popoverClass: "olympus-tour-popover",
      showButtons: [],
      allowClose: false,
      steps,
      onPopoverRender: (popover, opts) => {
        const index = opts.state.activeIndex ?? 0;
        const isLast = index === steps.length - 1;

        injectFooter(
          popover,
          index,
          steps.length,
          () => {
            saveStepRef.current(index);
            driverInstance.destroy();
          },
          () => {
            if (isLast) {
              completeTourRef.current();
              driverInstance.destroy();
            } else {
              driverInstance.moveNext();
            }
          },
          isLast,
        );
      },
    });

    driverRef.current = driverInstance;

    return () => {
      driverInstance.destroy();
      driverRef.current = null;
    };
  }, []);

  return (
    <FeatureTourWelcomeModal
      open={modalOpen}
      onSkip={() => {
        setModalOpen(false);
        skipTour();
      }}
      onStart={() => {
        setModalOpen(false);
        startTour();
        setTimeout(() => driverRef.current?.drive(), 150);
      }}
    />
  );
}
