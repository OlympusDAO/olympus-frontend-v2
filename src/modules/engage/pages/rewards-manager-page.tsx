import { useState } from "react";
import { MOCK_EPOCHS } from "../components/rewards-manager-mock";
import { EpochAlert } from "../components/epoch-alert";
import { EpochTabs } from "../components/epoch-tabs";
import { EpochInfoCard } from "../components/epoch-info-card";
import { EpochUsersTable } from "../components/epoch-users-table";

const notSubmittedEpoch = MOCK_EPOCHS.find((e) => e.status === "not_submitted");

export function RewardsManagerPage() {
  const [selectedId, setSelectedId] = useState(MOCK_EPOCHS[MOCK_EPOCHS.length - 1]!.id);
  const epoch = MOCK_EPOCHS.find((e) => e.id === selectedId)!;

  return (
    <section className="flex flex-col gap-4">
      {notSubmittedEpoch && <EpochAlert epoch={notSubmittedEpoch} onSwitchEpoch={setSelectedId} />}

      <EpochTabs epochs={MOCK_EPOCHS} selected={selectedId} onSelect={setSelectedId} />

      <div className="flex gap-4 items-start">
        <div className="w-87.5 shrink-0">
          <EpochInfoCard epoch={epoch} />
        </div>
        <div className="flex-1 min-w-0">
          <EpochUsersTable users={epoch.users} />
        </div>
      </div>
    </section>
  );
}
