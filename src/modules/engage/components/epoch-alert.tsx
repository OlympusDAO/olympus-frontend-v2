import { Button } from "@/components/ui/button";
import type { MockEpoch } from "./rewards-manager-mock";
import { Alert, AlertTitle } from "@/components/ui/alert.tsx";
import { OctagonAlertIcon } from "lucide-react";

interface EpochAlertProps {
  epoch: MockEpoch;
  onSwitchEpoch: (id: number) => void;
}

export function EpochAlert({ epoch, onSwitchEpoch }: EpochAlertProps) {
  return (
    <Alert className="w-full" type="warning" variant="compact">
      <div className="col-start-2 flex items-center justify-between gap-x-3">
        <OctagonAlertIcon size={16} />
        <AlertTitle className="flex-1">Epoch 3 rewards are not released</AlertTitle>
        <Button variant="link" size="sm" onClick={() => onSwitchEpoch(epoch.id)}>
          Switch to Epoch {epoch.number}
        </Button>
      </div>
    </Alert>
  );
}
