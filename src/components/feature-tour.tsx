import { useEffect, useRef, useState } from "react";
import { driver, type DriveStep } from "driver.js";
import { useFeatureTour } from "@/lib/hooks/useFeatureTour";
import { FeatureTourWelcomeModal } from "@/components/feature-tour-welcome-modal";

function buildSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="sidebar-nav"]',
      popover: {
        title: "Everything starts here",
        description: `
          <ul>
            <li><strong>Pulse</strong> — Live revenue, treasury health, buyback and emission activity, and every on-chain action</li>
            <li><strong>OHM</strong> — Balances, swapping (previously Stake), bridging across chains</li>
            <li><strong>Cooler</strong> — Borrow USDS against your gOHM at 0.5% APR, no liquidation risk</li>
            <li><strong>CDs</strong> — Convertible Deposits — now built into the app</li>
            <li><strong>DAO</strong> — Vote on proposals, delegate, view on-chain governance</li>
            <li><strong>Engage</strong> — CD participants accumulate iOHM, convertible to OHM below market</li>
          </ul>
        `,
        side: "right",
        align: "center",
        nextBtnText: "Next →",
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
        nextBtnText: "Next →",
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
        nextBtnText: "Next →",
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
        doneBtnText: "Got It",
      },
    },
  ];
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
    const driverInstance = driver({
      animate: true,
      overlayOpacity: 0.5,
      popoverClass: "olympus-tour-popover",
      showButtons: ["next", "close"],
      showProgress: true,
      progressText: "{{current}} / {{total}}",
      steps: buildSteps(),
      onCloseClick: (_el, _step, opts) => {
        saveStepRef.current(opts.state.activeIndex ?? 0);
        driverInstance.destroy();
      },
      onDestroyStarted: () => {
        if (!driverInstance.hasNextStep()) {
          completeTourRef.current();
        }
        driverInstance.destroy();
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
