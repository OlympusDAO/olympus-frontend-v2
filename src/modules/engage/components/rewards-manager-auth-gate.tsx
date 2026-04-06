import type { ReactNode } from "react";
import { useAccount, useChainId } from "wagmi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import { useGETAdminMultisigMembers } from "@/generated/olympusUnits";
import type { LibChainId } from "@/generated/olympusUnits";

interface RewardsManagerAuthGateProps {
  children: ReactNode;
}

export function RewardsManagerAuthGate({ children }: RewardsManagerAuthGateProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId() as LibChainId;
  const { isAuthenticated, isLoading: isAuthLoading, signIn, error } = useAuth();

  const { data: membersData, isLoading: isMembersLoading } = useGETAdminMultisigMembers(
    { chainId },
    { query: { enabled: isAuthenticated } },
  );

  if (!isConnected) {
    return (
      <GateCard
        title="Connect your wallet"
        description="Connect your wallet to access the Rewards Manager."
      />
    );
  }

  if (isAuthLoading) {
    return <GateSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <GateCard
        title="Sign in required"
        description="Sign in with your wallet to verify your identity."
        action={
          <Button variant="default" size="md" onClick={() => void signIn()}>
            Sign In
          </Button>
        }
        error={error?.message}
      />
    );
  }

  if (isMembersLoading) {
    return <GateSpinner />;
  }

  const owners = membersData?.owners ?? [];
  const isOwner =
    !!address && owners.some((o: string) => o.toLowerCase() === address.toLowerCase());

  if (!isOwner) {
    return (
      <GateCard
        title="Not authorized"
        description="Your address is not a member of the multisig."
      />
    );
  }

  return <>{children}</>;
}

function GateSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="size-8 rounded-full border-2 border-surface-a10 border-t-primary-t animate-spin" />
    </div>
  );
}

function GateCard({
  title,
  description,
  action,
  error,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  error?: string;
}) {
  return (
    <div className="flex items-center justify-center py-24">
      <Card className="p-8 flex flex-col items-center gap-4 max-w-sm w-full text-center">
        <span className="text-[18px]/[24px] font-semibold text-primary-t">{title}</span>
        <p className="text-[15px]/[20px] text-secondary-t">{description}</p>
        {error && <p className="text-[13px]/[18px] text-red">{error}</p>}
        {action}
      </Card>
    </div>
  );
}
