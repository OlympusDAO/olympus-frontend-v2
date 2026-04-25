import { useState, useEffect } from "react";
import { useChainId } from "wagmi";
import { EpochAlert } from "../components/epoch-alert";
import { EpochTabs } from "../components/epoch-tabs";
import { EpochInfoCard } from "../components/epoch-info-card";
import { EpochUsersTable } from "../components/epoch-users-table";
import { RewardsManagerAuthGate } from "../components/rewards-manager-auth-gate";
import { deriveEpochStatus } from "../lib/derive-epoch-status";
import {
  useGETEpochsEpochsList,
  useGETEpochsEpochRewards,
  useGETEpochsEpochRewardUsers,
  type EpochsEpoch,
  type LibChainId,
} from "@/generated/olympusUnits";

export function RewardsManagerPage() {
  return (
    <RewardsManagerAuthGate>
      <RewardsManagerContent />
    </RewardsManagerAuthGate>
  );
}

function RewardsManagerContent() {
  const chainId = useChainId() as LibChainId;
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: epochsData, isLoading: isEpochsLoading } = useGETEpochsEpochsList({
    chainId,
    sortOrder: "desc",
    limit: 50,
  });
  const epochs = epochsData?.epochs ?? [];

  useEffect(() => {
    if (epochs.length > 0 && selectedId === null) {
      setSelectedId(epochs[0]?.id ?? null);
    }
  }, [epochs, selectedId]);

  const { data: rewardsData } = useGETEpochsEpochRewards(selectedId ?? 0, {
    query: { enabled: !!selectedId },
  });
  const reward = rewardsData?.rewards[0] ?? null;

  const { data: usersData } = useGETEpochsEpochRewardUsers(
    selectedId ?? 0,
    reward?.rewardAssetId ?? 0,
    { limit: 100 },
    { query: { enabled: !!selectedId && !!reward } },
  );
  const users = usersData?.users ?? [];

  const selectedEpoch = epochs.find((e: EpochsEpoch) => e.id === selectedId);
  const notSubmittedEpoch = epochs.find(
    (e: EpochsEpoch) => deriveEpochStatus(e) === "not_submitted",
  );

  if (!isEpochsLoading && epochs.length === 0) {
    return (
      <p className="py-12 text-center text-sm/5 font-semibold text-secondary-t">No epochs found.</p>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {notSubmittedEpoch && <EpochAlert epoch={notSubmittedEpoch} onSwitchEpoch={setSelectedId} />}

      <EpochTabs epochs={epochs} selected={selectedId} onSelect={setSelectedId} />

      <div className="flex gap-4 items-start">
        <div className="w-87.5 shrink-0">
          <EpochInfoCard epoch={selectedEpoch} reward={reward} />
        </div>
        <div className="flex-1 min-w-0">
          <EpochUsersTable users={users} rewardAssetDecimals={usersData?.rewardAssetDecimals} />
        </div>
      </div>
    </section>
  );
}
