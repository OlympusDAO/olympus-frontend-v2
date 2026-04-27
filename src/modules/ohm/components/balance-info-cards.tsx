import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { RiArrowRightUpLine } from "@remixicon/react";

type InfoCardContent = {
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
};

const INFO_CARDS: InfoCardContent[] = [
  {
    title: "What is OHM?",
    body: "OHM is the native token of the Olympus protocol. OHM is used in liquid markets. OHM is fully-backed by the Olympus treasury.",
    href: "https://swap.defillama.com/?chain=ethereum&to=0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5",
    ctaLabel: "Get OHM",
  },
  {
    title: "What is gOHM?",
    body: "gOHM is Olympus protocol's governance token, acquired by wrapping OHM for voting and collateral. It can be unwrapped to OHM.",
    href: "https://docs.olympusdao.finance",
    ctaLabel: "Learn More",
  },
];

function InfoCardBody({ body, href, ctaLabel }: Omit<InfoCardContent, "title">) {
  return (
    <>
      <p className="text-secondary-t text-sm/5 mb-6">{body}</p>
      <Button
        variant="secondary"
        className="mt-auto w-full"
        render={<a href={href} target="_blank" rel="noopener noreferrer" />}
      >
        {ctaLabel} <RiArrowRightUpLine size={16} />
      </Button>
    </>
  );
}

export function BalanceInfoCards({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="space-y-3">
        {INFO_CARDS.map(({ title, ...rest }) => (
          <Collapsible key={title}>
            <Card className="p-4">
              <CollapsibleTrigger className="flex w-full items-center justify-between cursor-pointer">
                <span className="font-medium text-primary-t">{title}</span>
                <ChevronDown className="size-4 text-tertiary-t transition-transform [[data-panel-open]_&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <InfoCardBody {...rest} />
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {INFO_CARDS.map(({ title, ...rest }) => (
        <Card key={title} className="p-6 flex flex-col">
          <h3 className="mb-2 text-sm/5 font-semibold">{title}</h3>
          <InfoCardBody {...rest} />
        </Card>
      ))}
    </div>
  );
}
