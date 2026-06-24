import { erc4626Abi } from "viem";
import { useChainId, useReadContract } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts.ts";

/**
 * Computes the exact USDS amount required to FULLY repay a CD loan in a single
 * transaction, accounting for ERC4626 (sUSDS) rounding.
 *
 * Why this is needed:
 * The DepositRedemptionVault credits principal repayment as
 *   `previewRedeem(deposit(amount))` — both legs round DOWN.
 * So paying exactly `principal` credits a few wei less and leaves dust principal,
 * which blocks `finishRedemption()` (it reverts while `principal > 0`). The
 * historical symptom was users needing 2-3 dust transactions to fully clear a loan.
 *
 * The minimal asset amount guaranteeing `previewRedeem(deposit(x)) >= principal` is
 *   `previewMint(previewWithdraw(principal))`
 * (previewWithdraw rounds shares UP, previewMint rounds assets UP). Verified against
 * live sUSDS: this overpays by ~1 wei, well within the contract's 0.1% slippage cap.
 *
 * Interest is repaid 1:1 (transferred directly, no vault conversion), so the full
 * repayment amount is `previewMint(previewWithdraw(principal)) + interest`.
 *
 * Returns `fullRepayAmount === undefined` while the reads are in flight or inputs are
 * missing — callers should fall back to the user-entered amount in that case.
 */
export function useFullRepayAmount(principal?: bigint, interest?: bigint) {
  const chainId = useChainId();
  const susdsAddress = getContractAddress(ContractName.SUSDS, chainId);

  const principalEnabled = !!susdsAddress && principal !== undefined && principal > 0n;

  // Shares whose redemption yields at least `principal` assets (rounds UP).
  const { data: shares } = useReadContract({
    address: susdsAddress,
    abi: erc4626Abi,
    functionName: "previewWithdraw",
    args: principal !== undefined ? [principal] : undefined,
    query: { enabled: principalEnabled },
  });

  // Assets required to mint `shares` (rounds UP). Depositing this guarantees the
  // round-trip credits >= principal.
  const { data: previewMintResult } = useReadContract({
    address: susdsAddress,
    abi: erc4626Abi,
    functionName: "previewMint",
    args: shares !== undefined ? [shares] : undefined,
    query: { enabled: !!susdsAddress && shares !== undefined },
  });

  // A loan with zero principal needs no vault conversion (interest-only remainder).
  const principalToPay = principal === 0n ? 0n : previewMintResult;

  const fullRepayAmount =
    principalToPay !== undefined && interest !== undefined ? principalToPay + interest : undefined;

  return { fullRepayAmount, principalToPay };
}
