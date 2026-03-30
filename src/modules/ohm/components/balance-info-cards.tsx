import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink } from "lucide-react";

function BalanceOhmInfoContent() {
  return (
    <>
      <p className="text-secondary-t text-sm">
        OHM is the native token of the Olympus protocol. OHM is used in liquid markets. OHM is
        fully-backed by the Olympus treasury.
      </p>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        render={
          // biome-ignore lint/a11y/useAnchorContent: content provided by Button children via render prop
          <a
            href="https://swap.defillama.com/?chain=ethereum&to=0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5"
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        Get OHM <ExternalLink className="size-3.5" />
      </Button>
    </>
  );
}

function GohmInfoContent() {
  return (
    <>
      <p className="text-secondary-t text-sm">
        gOHM is Olympus protocol's governance token, acquired by wrapping OHM for voting and
        collateral. It can be unwrapped to OHM.
      </p>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        render={
          // biome-ignore lint/a11y/useAnchorContent: content provided by Button children via render prop
          <a href="https://docs.olympusdao.finance" target="_blank" rel="noopener noreferrer" />
        }
      >
        Learn More <ExternalLink className="size-3.5" />
      </Button>
    </>
  );
}

export function BalanceInfoCards({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="space-y-3">
        <Collapsible>
          <Card className="p-4">
            <CollapsibleTrigger className="flex w-full items-center justify-between cursor-pointer">
              <span className="font-medium text-primary-t">What is OHM?</span>
              <ChevronDown className="size-4 text-tertiary-t transition-transform [[data-panel-open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <BalanceOhmInfoContent />
            </CollapsibleContent>
          </Card>
        </Collapsible>
        <Collapsible>
          <Card className="p-4">
            <CollapsibleTrigger className="flex w-full items-center justify-between cursor-pointer">
              <span className="font-medium text-primary-t">What is gOHM?</span>
              <ChevronDown className="size-4 text-tertiary-t transition-transform [[data-panel-open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <GohmInfoContent />
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="p-5">
        <h3 className="mb-3 font-medium text-primary-t">What is OHM?</h3>
        <BalanceOhmInfoContent />
      </Card>
      <Card className="p-5">
        <h3 className="mb-3 font-medium text-primary-t">What is gOHM?</h3>
        <GohmInfoContent />
      </Card>
    </div>
  );
}
