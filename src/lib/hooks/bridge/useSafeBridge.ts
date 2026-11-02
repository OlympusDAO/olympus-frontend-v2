import { useEffect, useRef, useState } from "react";
import { useAccount, useConfig, useSendCalls, useWriteContract } from "wagmi";
import { getCapabilities, getPublicClient } from "wagmi/actions";
import { erc20Abi, isHash, parseUnits, type Address, type Hex } from "viem";
import CCIPCrossChainBridgeAbi from "@/abis/CCIPCrossChainBridge";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import { CCIP_CHAIN_SELECTORS } from "@/modules/ohm/utils/constants";
import { getSafeFee } from "./safeFee";
import { addTrackedTransfer } from "./trackedTransfers";

const OHM_DECIMALS = 9;

type Capabilities = {
  atomic?: { status?: string };
  atomicBatch?: { supported?: boolean };
};

/** viem normalizes to `atomic`, while the Safe App provider reports the older `atomicBatch`. */
function supportsBatching(capabilities: Capabilities | undefined): boolean {
  const status = capabilities?.atomic?.status;
  return status === "supported" || status === "ready" || !!capabilities?.atomicBatch?.supported;
}

/**
 * Proposes a bridge from a Safe. Signers act later, so nothing here waits for a receipt: both
 * `writeContract` and `sendCalls` return the Safe transaction hash, and history follows it from
 * there. Batches approve and send when the wallet can, so signers do one round rather than two.
 */
export function useSafeBridge() {
  const config = useConfig();
  const { address } = useAccount();
  const { sendCallsAsync } = useSendCalls();
  const { writeContractAsync } = useWriteContract();

  const [safeTxHash, setSafeTxHash] = useState<Hex>();
  const [isProposed, setIsProposed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addressRef = useRef(address);
  addressRef.current = address;
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const propose = async ({
    sourceChainId,
    destinationChainId,
    recipientAddress,
    amount,
    needsApproval,
  }: {
    sourceChainId: number;
    destinationChainId: number;
    recipientAddress: Address;
    amount: string;
    needsApproval: boolean;
  }) => {
    const bridge = getContractAddress(ContractName.CCIP_BRIDGE, sourceChainId);
    const ohm = getTokenAddress(TokenName.OHM, sourceChainId);
    const selector = CCIP_CHAIN_SELECTORS[destinationChainId];
    const client = getPublicClient(config, { chainId: sourceChainId });
    if (!address || !bridge || !ohm || selector === undefined || !client) return;

    setError(null);
    setIsPending(true);

    try {
      const amountBase = parseUnits(amount, OHM_DECIMALS);
      const sendArgs = [selector, recipientAddress, amountBase] as const;
      const quote = await client.readContract({
        address: bridge,
        abi: CCIPCrossChainBridgeAbi,
        functionName: "getFeeEVM",
        args: sendArgs,
      });
      if (!isMountedRef.current || addressRef.current !== address) return;

      const { value } = getSafeFee(quote, destinationChainId);
      const approve = {
        abi: erc20Abi,
        functionName: "approve",
        args: [bridge, amountBase],
      } as const;
      const send = {
        abi: CCIPCrossChainBridgeAbi,
        functionName: "sendToEVM",
        args: sendArgs,
        value,
      } as const;

      let hash: string;
      const canBatch =
        needsApproval &&
        supportsBatching(
          (await getCapabilities(config, { account: address, chainId: sourceChainId }).catch(
            () => undefined,
          )) as Capabilities | undefined,
        );
      if (canBatch) {
        const { id } = await sendCallsAsync({
          account: address,
          chainId: sourceChainId,
          calls: [
            { to: ohm, ...approve },
            { to: bridge, ...send },
          ],
        });
        hash = id;
      } else {
        if (needsApproval) {
          await writeContractAsync({
            account: address,
            address: ohm,
            chainId: sourceChainId,
            ...approve,
          });
        }
        hash = await writeContractAsync({
          account: address,
          address: bridge,
          chainId: sourceChainId,
          ...send,
        });
      }

      setIsProposed(true);
      if (isHash(hash)) {
        setSafeTxHash(hash);
        addTrackedTransfer({
          srcChainId: sourceChainId,
          dstChainId: destinationChainId,
          amount,
          safeTxHash: hash,
          timestamp: new Date().toISOString(),
          address,
        });
      }
    } catch (caught) {
      setError(caught as Error);
    } finally {
      setIsPending(false);
    }
  };

  return { propose, safeTxHash, isProposed, isPending, error };
}
