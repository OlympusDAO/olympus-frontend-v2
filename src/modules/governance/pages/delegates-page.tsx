import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccount } from "wagmi";
import { useDelegates } from "@/modules/governance/hooks/useDelegates";
import { useContractParameters } from "@/modules/governance/hooks/useContractParameters";
import { DelegationCards } from "@/modules/governance/components/delegation-cards";
import { DelegateRow } from "@/modules/governance/components/delegate-row";
import { DelegateVotingModal } from "@/modules/governance/components/delegate-voting-modal";
import { CoolerDelegationModal } from "@/modules/governance/components/cooler-delegation-modal";
import { Search, Users } from "lucide-react";

/**
 * Delegates listing page at /dao/delegate.
 * Shows delegation cards, a searchable table of delegates, and delegation modals.
 */
export function DelegatesPage() {
  useAccount();
  const navigate = useNavigate();
  const { data: delegates, isLoading } = useDelegates();
  const { data: parameters } = useContractParameters();
  const [searchQuery, setSearchQuery] = useState("");
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [coolerModalOpen, setCoolerModalOpen] = useState(false);

  const filteredDelegates = useMemo(() => {
    if (!delegates) return [];
    if (!searchQuery.trim()) return delegates;

    const query = searchQuery.toLowerCase();
    return delegates.filter((delegate) => delegate.address.toLowerCase().includes(query));
  }, [delegates, searchQuery]);

  const quorum = parameters?.proposalQuorum ? Number(parameters.proposalQuorum) : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <DelegationCards
        onDelegate={() => setDelegateModalOpen(true)}
        onManageCooler={() => setCoolerModalOpen(true)}
        onRevoke={() => {
          // Revoke = delegate to self
          setDelegateModalOpen(true);
        }}
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-t" />
        <Input
          placeholder="Search by address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Delegates Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-a5-b text-left text-sm text-secondary-t">
                <th className="px-4 py-3 font-medium">Delegate Address</th>
                <th className="px-4 py-3 font-medium">Delegations</th>
                <th className="px-4 py-3 font-medium">Voting Power</th>
                <th className="px-4 py-3 font-medium">Accounts %</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-secondary-t">
                    Loading delegates...
                  </td>
                </tr>
              ) : filteredDelegates.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12 text-secondary-t">
                      <Users className="h-10 w-10 mb-3 opacity-40" />
                      <p className="text-sm">No delegates found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDelegates.map((delegate) => (
                  <DelegateRow
                    key={delegate.id}
                    delegate={delegate}
                    quorum={quorum}
                    onDelegate={() => setDelegateModalOpen(true)}
                    onClick={() => navigate(`/dao/delegate/${delegate.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {delegateModalOpen && (
        <DelegateVotingModal open={delegateModalOpen} onClose={() => setDelegateModalOpen(false)} />
      )}

      {coolerModalOpen && (
        <CoolerDelegationModal open={coolerModalOpen} onClose={() => setCoolerModalOpen(false)} />
      )}
    </div>
  );
}
