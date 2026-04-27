import { ChevronRightIcon } from "lucide-react";
import { Card } from "@/components/ui/card.tsx";
import { buttonVariants } from "@/components/ui/button.tsx";
import { Icon } from "@/components/icon.tsx";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";

import engageDepositDark from "@/assets/engage-deposit.webp";
import engageDepositLight from "@/assets/engage-deposit-light.webp";
import engageBorrowDark from "@/assets/engage-borrow.webp";
import engageBorrowLight from "@/assets/engage-borrow-light.webp";
import engageConvertDark from "@/assets/engage-convert.webp";
import engageConvertLight from "@/assets/engage-convert-light.webp";

interface ActionItem {
  srcDark: string;
  srcLight: string;
  title: string;
  description: string;
  rate: string;
  href: string;
}

const ACTIONS: ActionItem[] = [
  {
    srcDark: engageDepositDark,
    srcLight: engageDepositLight,
    title: "Deposit into CDs or Create a Limit Order",
    description:
      "Deposit USDS to open a CD position or set up a limit order and accumulate Drachmas based on size and time in the position.",
    rate: "0.01 per deposited $ per day",
    href: "/#/cds/deposit",
  },
  {
    srcDark: engageBorrowDark,
    srcLight: engageBorrowLight,
    title: "Borrow with CD Position",
    description:
      "Unlock underlying liquidity by borrowing against your CD position and get a bonus to the Drachma rate.",
    rate: "25% bonus to the deposit rate",
    href: "/#/cds/borrow",
  },
  {
    srcDark: engageConvertDark,
    srcLight: engageConvertLight,
    title: "Convert CD Position",
    description:
      "Convert a CD position and receive a Drachma bonus equal to 1/3 of the Drachmas amount accumulated by that position.",
    rate: "1/3 of position's accumulated Drachmas",
    href: "/#/cds/deposit",
  },
];

export function EngageActions() {
  return (
    <div className="flex flex-col gap-4">
      {ACTIONS.map((action) => (
        <Card key={action.title} className="p-6 flex items-center gap-6">
          <ColorModeImage
            srcDark={action.srcDark}
            srcLight={action.srcLight}
            alt={action.title}
            className="size-25 rounded-2xl shrink-0 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[18px]/[24px] font-semibold mb-1">{action.title}</p>
            <p className="text-[15px]/[20px] text-secondary-t mb-2">{action.description}</p>
            <div className="flex items-center gap-x-1.5">
              <Icon name="drachmaTokenIcon" className="size-4 shrink-0" />
              <p className="text-[15px]/[20px] font-semibold">{action.rate}</p>
            </div>
          </div>
          <a href={action.href} className={buttonVariants({ size: "md" })}>
            Get Drachmas
            <ChevronRightIcon />
          </a>
        </Card>
      ))}
    </div>
  );
}
