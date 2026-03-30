import { Card } from "@/components/ui/card";
import { useContractParameters } from "@/modules/governance/hooks/useContractParameters";
import { ExternalLink } from "lucide-react";

function getEtherscanUrl(address: string): string {
  return `https://etherscan.io/address/${address}`;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Contract parameters page at /dao/contract-parameters.
 * Displays governance parameters and contract addresses side by side.
 */
export function ContractParametersPage() {
  const { data: parameters, isLoading } = useContractParameters();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card className="p-12">
          <div className="flex items-center justify-center text-secondary-t">
            Loading parameters...
          </div>
        </Card>
      </div>
    );
  }

  if (!parameters) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card className="p-12">
          <div className="flex items-center justify-center text-secondary-t">
            Unable to load governance parameters.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-2xl font-bold">Contract Parameters</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Parameters Card */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Parameters</h2>
          <div className="space-y-0">
            <ParameterRow
              label="Proposal Threshold"
              value={`${(parameters.proposalThresholdPercent * 100).toFixed(2)}% (${Number(parameters.proposalThreshold).toFixed(2)} gOHM)`}
            />
            <ParameterRow
              label="Quorum"
              value={`${parameters.proposalQuorumPercent.toFixed(2)}% (${Number(parameters.proposalQuorum).toFixed(2)} gOHM)`}
            />
            <ParameterRow
              label="Approval Threshold"
              value={`${parameters.proposalApprovalThreshold.toFixed(2)}%`}
            />
            <ParameterRow label="Voting Delay" value={parameters.votingDelay} />
            <ParameterRow label="Voting Period" value={parameters.votingPeriod} />
            <ParameterRow label="Execution Delay" value={parameters.executionDelay} />
            <ParameterRow
              label="Activation Grace Period"
              value={parameters.activationGracePeriod}
              isLast
            />
          </div>
        </Card>

        {/* Contract Addresses Card */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Contract Addresses</h2>
          <div className="space-y-0">
            <ContractAddressRow
              label="Governance Contract"
              address={parameters.governanceContract}
            />
            <ContractAddressRow label="Timelock Contract" address={parameters.timelockContract} />
            <ContractAddressRow label="gOHM Contract" address={parameters.gohmContract} isLast />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ParameterRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 ${isLast ? "" : "border-b border-a5-b"}`}
    >
      <span className="text-sm text-secondary-t">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ContractAddressRow({
  label,
  address,
  isLast = false,
}: {
  label: string;
  address: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 ${isLast ? "" : "border-b border-a5-b"}`}
    >
      <span className="text-sm text-secondary-t">{label}</span>
      <a
        href={getEtherscanUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-blue-400 transition-colors"
      >
        <span className="font-mono">{truncateAddress(address)}</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
