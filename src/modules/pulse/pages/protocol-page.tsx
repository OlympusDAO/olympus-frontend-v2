import { ProtocolTreasuryRevenue } from "../components/protocol-treasury-revenue";
import { ProtocolFlywheel } from "../components/protocol-flywheel";
import { ProtocolYrf } from "../components/protocol-yrf";
import { ProtocolEmissionManager } from "../components/protocol-emission-manager";
import { ProtocolCoolerLoans } from "../components/protocol-cooler-loans";
import { ProtocolConvertibleDeposits } from "../components/protocol-convertible-deposits";

export function ProtocolPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ProtocolTreasuryRevenue />
      <ProtocolFlywheel />
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
        <ProtocolYrf />
        <ProtocolEmissionManager />
      </div>
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
        <ProtocolCoolerLoans />
        <ProtocolConvertibleDeposits />
      </div>
    </div>
  );
}
