import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FeatureTourWelcomeModalProps {
  open: boolean;
  onSkip: () => void;
  onStart: () => void;
}

export function FeatureTourWelcomeModal({ open, onSkip, onStart }: FeatureTourWelcomeModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onSkip();
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-sm gap-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Olympus, Redesigned</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-t leading-relaxed">
          New navigation. Convertible Deposits built in. Pulse — a real-time view of the protocol.
          And a new way to participate.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" onClick={onSkip}>
            Skip
          </Button>
          <Button variant="default" size="md" className="flex-1" onClick={onStart}>
            Take the Tour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
