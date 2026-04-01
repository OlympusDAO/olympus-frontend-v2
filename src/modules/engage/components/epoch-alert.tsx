import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert.tsx";
import { OctagonAlertIcon } from "lucide-react";
import type { EpochsEpoch } from "@/generated/olympusUnits";

interface EpochAlertProps {
  epoch: EpochsEpoch;
  onSwitchEpoch: (id: number) => void;
}

export function EpochAlert({ epoch, onSwitchEpoch }: EpochAlertProps) {
  return (
    <Alert className="w-full" type="warning" variant="compact">
      <div className="col-start-2 flex items-center justify-between gap-x-3">
        <OctagonAlertIcon size={16} />
        <AlertTitle className="flex-1">
          Epoch {epoch.epochNumber} rewards are not released
        </AlertTitle>
        <Button variant="link" size="sm" onClick={() => onSwitchEpoch(epoch.id)}>
          Switch to Epoch {epoch.epochNumber}
        </Button>
      </div>
    </Alert>
  );
}
