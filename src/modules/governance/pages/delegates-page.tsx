import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useAccount } from "wagmi";
import { useDelegates } from "@/modules/governance/hooks/useDelegates";
import { DelegationCards } from "@/modules/governance/components/delegation-cards";
import { DelegateRow } from "@/modules/governance/components/delegate-row";
import { DelegateVotingModal } from "@/modules/governance/components/delegate-voting-modal";
import { CoolerDelegationModal } from "@/modules/governance/components/cooler-delegation-modal";
import { RiSearch2Line, RiExchangeFundsLine } from "@remixicon/react";

/**
 * Delegates listing page at /dao/delegate.
 * Shows delegation cards, a searchable table of delegates, and delegation modals.
 */
export function DelegatesPage() {
  useAccount();
  const navigate = useNavigate();
  const { data: delegates, isLoading } = useDelegates();
  const [searchQuery, setSearchQuery] = useState("");
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [coolerModalOpen, setCoolerModalOpen] = useState(false);

  const filteredDelegates = useMemo(() => {
    if (!delegates) return [];
    if (!searchQuery.trim()) return delegates;

    const query = searchQuery.toLowerCase();
    return delegates.filter((delegate) => delegate.address.toLowerCase().includes(query));
  }, [delegates, searchQuery]);

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
      <div className="relative w-full">
        <RiSearch2Line className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-tertiary-t pointer-events-none" />
        <Input
          placeholder="Search by address"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Delegates Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Delegate Address</TableHead>
            <TableHead>Delegations</TableHead>
            <TableHead>Voting Power</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-40 py-16 text-center align-middle text-sm/5 font-semibold text-secondary-t"
              >
                Loading delegates...
              </TableCell>
            </TableRow>
          ) : filteredDelegates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-40 align-middle">
                <div className="flex flex-col items-center justify-center gap-4 py-12 min-h-[200px]">
                  <RiExchangeFundsLine className="size-10 text-a10-b" />
                  <p className="text-sm/5 font-semibold text-secondary-t">No delegates found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredDelegates.map((delegate) => (
              <DelegateRow
                key={delegate.id}
                delegate={delegate}
                onDelegate={() => setDelegateModalOpen(true)}
                onClick={() => navigate(`/dao/delegate/${delegate.id}`)}
              />
            ))
          )}
        </TableBody>
      </Table>

      {delegateModalOpen && (
        <DelegateVotingModal open={delegateModalOpen} onClose={() => setDelegateModalOpen(false)} />
      )}

      {coolerModalOpen && (
        <CoolerDelegationModal open={coolerModalOpen} onClose={() => setCoolerModalOpen(false)} />
      )}
    </div>
  );
}
