import { ProtocolTreasuryRevenue } from "../components/protocol-treasury-revenue";
import { ProtocolFlywheel } from "../components/protocol-flywheel";
import { ProtocolYrf } from "../components/protocol-yrf";
import { ProtocolCoolerLoans } from "../components/protocol-cooler-loans";
import { ProtocolConvertibleDeposits } from "../components/protocol-convertible-deposits";

export function ProtocolPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ProtocolTreasuryRevenue />
      <ProtocolFlywheel />
      <ProtocolConvertibleDeposits />
      <ProtocolYrf />
      <ProtocolCoolerLoans />
    </div>
  );
}
