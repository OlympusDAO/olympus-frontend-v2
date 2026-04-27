import { useSignMessage } from "wagmi";
import {
  usePOSTAdminPrepareEpochTransactionApi,
  usePOSTAdminSubmitEpochTransactionApi,
  AdminProposalStatus,
} from "@/generated/olympusUnits";

export function useSubmitProposal(epochRewardsId: number) {
  const prepare = usePOSTAdminPrepareEpochTransactionApi();
  const { signMessageAsync } = useSignMessage();
  const submit = usePOSTAdminSubmitEpochTransactionApi();

  async function execute() {
    const { safeTxHash, safeStatus, safeUrl } = await prepare.mutateAsync({ epochRewardsId });

    if (safeStatus === AdminProposalStatus.ALREADY_EXECUTED) {
      return { safeUrl: undefined as string | undefined };
    }

    // Sign raw bytes without extra hashing; adjust v byte for Safe eth_sign compatibility
    const raw = await signMessageAsync({ message: { raw: safeTxHash as `0x${string}` } });
    const v = parseInt(raw.slice(-2), 16);
    const senderSignature = raw.slice(0, -2) + (v + 4).toString(16).padStart(2, "0");

    const result = await submit.mutateAsync({
      epochRewardsId,
      data: { safeTxHash, senderSignature },
    });

    return { safeUrl: result.safeUrl ?? safeUrl };
  }

  return {
    execute,
    isPending: prepare.isPending || submit.isPending,
  };
}
