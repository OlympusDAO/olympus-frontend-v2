import { FC } from "react";
import { RiCheckLine } from "@remixicon/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToS } from "./tos-provider";

export const ToSModal: FC = () => {
  const { hasAcceptedToS, acceptToS } = useToS();

  return (
    <Dialog open={!hasAcceptedToS} onOpenChange={() => {}}>
      <DialogContent
        className="w-full sm:max-w-2xl mx-auto p-0 gap-0 max-h-[90vh] overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <DialogTitle className="text-2xl">
              Terms of Service and Disclaimer
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4 overflow-y-auto max-h-[calc(90vh-240px)]">
          <div className="bg-surface-a3 rounded-xl border border-a5-b p-4 space-y-3">
            <div className="flex gap-3">
              <RiCheckLine className="h-5 w-5 text-green mt-0.5 flex-shrink-0" />
              <p className="text-secondary-t text-sm leading-relaxed">
                I am not a person or entity who resides in, is a citizen of, is
                incorporated in, or has a registered office in any Prohibited
                Localities including Cuba, Iran, North Korea, Syria or the United States.
                I am lawfully permitted to access this site and use its services
                under the laws of the jurisdiction in which I reside and am
                located.
              </p>
            </div>
          </div>

          <div className="bg-surface-a3 rounded-xl border border-a5-b p-4 space-y-3">
            <div className="flex gap-3">
              <RiCheckLine className="h-5 w-5 text-green mt-0.5 flex-shrink-0" />
              <p className="text-secondary-t text-sm leading-relaxed">
                The Site displays information publicly available on blockchain
                systems related to third party protocols, including Olympus, and
                may offer interaction methods for use with a third-party wallet
                application or device based on such information, but the Site
                Operator cannot guarantee the accuracy of such information, and
                I will only use the Site at my own risk and after conducting my
                own independent review and analysis.
              </p>
            </div>
          </div>

          <div className="bg-surface-a3 rounded-xl border border-a5-b p-4 space-y-3">
            <div className="flex gap-3">
              <RiCheckLine className="h-5 w-5 text-green mt-0.5 flex-shrink-0" />
              <p className="text-secondary-t text-sm leading-relaxed">
                Any actions I take on the Site are executed directly through my
                third-party wallet, not by the Site or Site Operator. I will not
                hold the Site Operator responsible for any losses or damages
                resulting from my use of the Site or third-party protocols.
              </p>
            </div>
          </div>

          <div className="bg-orange/10 rounded-xl border border-orange/20 p-4">
            <p className="text-secondary-t text-xs leading-relaxed">
              <span className="font-semibold text-orange">Important:</span> By
              clicking "Agree and Continue" below, you acknowledge that you have
              read, understood, and agree to be bound by these terms. If you do
              not agree, please do not use this site.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-a5-b">
          <Button onClick={acceptToS} className="w-full sm:w-auto" size="lg">
            Agree and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
