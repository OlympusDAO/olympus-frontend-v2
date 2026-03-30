import { useCallback } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { getContractAddress, ContractName } from "@/lib/contracts";
import CoolerV2MonoCoolerABI from "@/abis/CoolerV2MonoCooler";
import CoolerV2CompositesABI from "@/abis/CoolerV2Composites";
import { useTransactionToast, type TransactionToastConfig } from "@/lib/hooks/useTransactionToast";
import { useMonoCoolerPosition } from "./useMonoCoolerPosition";
import {
  getAuthorizationSignature,
  EMPTY_AUTH,
  EMPTY_SIGNATURE,
} from "./getAuthorizationSignature";

/** Subtract 1-hour interest buffer for borrow to account for accrual */
export function calculateBorrowAmount(amount: bigint, interestRateBps: number): bigint {
  if (amount === 0n) return 0n;
  const hourlyRate = interestRateBps / 10000 / 8760;
  const bufferWad = BigInt(Math.floor(hourlyRate * 1e18));
  const buffer = (amount * bufferWad) / (10n ** 18n);
  return amount - buffer;
}

/** Add 1-hour interest buffer for full repay to ensure complete repayment */
export function calculateRepayAmount(amount: bigint, interestRateBps: number, fullRepay: boolean): bigint {
  if (!fullRepay || amount === 0n) return amount;
  const hourlyRate = interestRateBps / 10000 / 8760;
  const bufferWad = BigInt(Math.floor(hourlyRate * 1e18));
  const buffer = (amount * bufferWad) / (10n ** 18n);
  return amount + buffer;
}

const BORROW_TOAST: TransactionToastConfig = {
  pending: { title: "Borrowing USDS...", description: "Please wait for confirmation." },
  success: { title: "Borrow successful!", description: "USDS has been sent to your wallet." },
  error: {
    title: "Borrow failed",
    description: "There was an error borrowing.",
    userRejected: { title: "Borrow cancelled", description: "You cancelled the transaction." },
  },
};

const REPAY_TOAST: TransactionToastConfig = {
  pending: { title: "Repaying loan...", description: "Please wait for confirmation." },
  success: { title: "Repayment successful!", description: "Your debt has been reduced." },
  error: {
    title: "Repayment failed",
    description: "There was an error repaying.",
    userRejected: { title: "Repayment cancelled", description: "You cancelled the transaction." },
  },
};

const COLLATERAL_TOAST: TransactionToastConfig = {
  pending: { title: "Processing collateral...", description: "Please wait for confirmation." },
  success: { title: "Collateral updated!", description: "Your position has been updated." },
  error: {
    title: "Transaction failed",
    description: "There was an error updating collateral.",
    userRejected: { title: "Transaction cancelled", description: "You cancelled the transaction." },
  },
};

export function useMonoCoolerDebt() {
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const { signTypedDataAsync } = useSignTypedData();
  const { position, queryKey: positionQueryKey } = useMonoCoolerPosition();

  const monoCoolerAddress = getContractAddress(ContractName.COOLER_V2_MONOCOOLER, chainId);
  const compositesAddress = getContractAddress(ContractName.COOLER_V2_COMPOSITES, chainId);

  // Read nonce for EIP-712 signatures
  const { data: authNonce } = useReadContract({
    address: monoCoolerAddress,
    abi: CoolerV2MonoCoolerABI,
    functionName: "authorizationNonces",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: positionQueryKey });
  }, [queryClient, positionQueryKey]);

  // --- Borrow ---
  const borrowWrite = useWriteContract();
  const borrowReceipt = useWaitForTransactionReceipt({ hash: borrowWrite.data, confirmations: 1 });
  useTransactionToast({
    hash: borrowWrite.data,
    isWritePending: borrowWrite.isPending,
    isConfirmed: borrowReceipt.isSuccess,
    writeError: borrowWrite.error,
    confirmError: borrowReceipt.error,
    config: BORROW_TOAST,
    onConfirmed: invalidateQueries,
  });

  const borrow = (amount: bigint) => {
    if (!monoCoolerAddress || !address || !position) return;
    const finalAmount = calculateBorrowAmount(amount, position.interestRateBps);
    borrowWrite.reset();
    borrowWrite.writeContract({
      address: monoCoolerAddress,
      abi: CoolerV2MonoCoolerABI,
      functionName: "borrow",
      args: [finalAmount, address, address],
    });
  };

  // --- Repay ---
  const repayWrite = useWriteContract();
  const repayReceipt = useWaitForTransactionReceipt({ hash: repayWrite.data, confirmations: 1 });
  useTransactionToast({
    hash: repayWrite.data,
    isWritePending: repayWrite.isPending,
    isConfirmed: repayReceipt.isSuccess,
    writeError: repayWrite.error,
    confirmError: repayReceipt.error,
    config: REPAY_TOAST,
    onConfirmed: invalidateQueries,
  });

  const repay = (amount: bigint, fullRepay = false) => {
    if (!monoCoolerAddress || !address || !position) return;
    const finalAmount = calculateRepayAmount(amount, position.interestRateBps, fullRepay);
    repayWrite.reset();
    repayWrite.writeContract({
      address: monoCoolerAddress,
      abi: CoolerV2MonoCoolerABI,
      functionName: "repay",
      args: [finalAmount, address],
    });
  };

  // --- Add Collateral ---
  const addCollateralWrite = useWriteContract();
  const addCollateralReceipt = useWaitForTransactionReceipt({ hash: addCollateralWrite.data, confirmations: 1 });
  useTransactionToast({
    hash: addCollateralWrite.data,
    isWritePending: addCollateralWrite.isPending,
    isConfirmed: addCollateralReceipt.isSuccess,
    writeError: addCollateralWrite.error,
    confirmError: addCollateralReceipt.error,
    config: COLLATERAL_TOAST,
    onConfirmed: invalidateQueries,
  });

  const addCollateral = (amount: bigint) => {
    if (!monoCoolerAddress || !address) return;
    addCollateralWrite.reset();
    addCollateralWrite.writeContract({
      address: monoCoolerAddress,
      abi: CoolerV2MonoCoolerABI,
      functionName: "addCollateral",
      args: [amount, address, []],
    });
  };

  // --- Withdraw Collateral ---
  const withdrawCollateralWrite = useWriteContract();
  const withdrawCollateralReceipt = useWaitForTransactionReceipt({ hash: withdrawCollateralWrite.data, confirmations: 1 });
  useTransactionToast({
    hash: withdrawCollateralWrite.data,
    isWritePending: withdrawCollateralWrite.isPending,
    isConfirmed: withdrawCollateralReceipt.isSuccess,
    writeError: withdrawCollateralWrite.error,
    confirmError: withdrawCollateralReceipt.error,
    config: COLLATERAL_TOAST,
    onConfirmed: invalidateQueries,
  });

  const withdrawCollateral = (amount: bigint) => {
    if (!monoCoolerAddress || !address) return;
    withdrawCollateralWrite.reset();
    withdrawCollateralWrite.writeContract({
      address: monoCoolerAddress,
      abi: CoolerV2MonoCoolerABI,
      functionName: "withdrawCollateral",
      args: [amount, address, address, []],
    });
  };

  // --- Composites: Add Collateral + Borrow ---
  const addCollateralAndBorrowWrite = useWriteContract();
  const addCollateralAndBorrowReceipt = useWaitForTransactionReceipt({ hash: addCollateralAndBorrowWrite.data, confirmations: 1 });
  useTransactionToast({
    hash: addCollateralAndBorrowWrite.data,
    isWritePending: addCollateralAndBorrowWrite.isPending,
    isConfirmed: addCollateralAndBorrowReceipt.isSuccess,
    writeError: addCollateralAndBorrowWrite.error,
    confirmError: addCollateralAndBorrowReceipt.error,
    config: BORROW_TOAST,
    onConfirmed: invalidateQueries,
  });

  const addCollateralAndBorrow = async (
    collateralAmt: bigint,
    borrowAmt: bigint,
    isAuthorized: boolean,
  ) => {
    if (!compositesAddress || !monoCoolerAddress || !address || !position) return;

    const finalBorrowAmt = calculateBorrowAmount(borrowAmt, position.interestRateBps);
    addCollateralAndBorrowWrite.reset();

    if (isAuthorized) {
      addCollateralAndBorrowWrite.writeContract({
        address: compositesAddress,
        abi: CoolerV2CompositesABI,
        functionName: "addCollateralAndBorrow",
        args: [EMPTY_AUTH, EMPTY_SIGNATURE, collateralAmt, finalBorrowAmt, []],
      });
      return;
    }

    // EOA: generate EIP-712 signature
    const nonce = authNonce ?? 0n;
    const { auth, signature } = await getAuthorizationSignature({
      userAddress: address,
      authorizedAddress: compositesAddress,
      verifyingContract: monoCoolerAddress,
      chainId,
      nonce: nonce as bigint,
      signTypedDataAsync,
    });

    addCollateralAndBorrowWrite.writeContract({
      address: compositesAddress,
      abi: CoolerV2CompositesABI,
      functionName: "addCollateralAndBorrow",
      args: [auth, signature, collateralAmt, finalBorrowAmt, []],
    });
  };

  // --- Composites: Repay + Remove Collateral ---
  const repayAndRemoveCollateralWrite = useWriteContract();
  const repayAndRemoveCollateralReceipt = useWaitForTransactionReceipt({ hash: repayAndRemoveCollateralWrite.data, confirmations: 1 });
  useTransactionToast({
    hash: repayAndRemoveCollateralWrite.data,
    isWritePending: repayAndRemoveCollateralWrite.isPending,
    isConfirmed: repayAndRemoveCollateralReceipt.isSuccess,
    writeError: repayAndRemoveCollateralWrite.error,
    confirmError: repayAndRemoveCollateralReceipt.error,
    config: REPAY_TOAST,
    onConfirmed: invalidateQueries,
  });

  const repayAndRemoveCollateral = async (
    repayAmt: bigint,
    collateralAmt: bigint,
    fullRepay: boolean,
    isAuthorized: boolean,
  ) => {
    if (!compositesAddress || !monoCoolerAddress || !address || !position) return;

    const finalRepayAmt = calculateRepayAmount(repayAmt, position.interestRateBps, fullRepay);
    repayAndRemoveCollateralWrite.reset();

    if (isAuthorized) {
      repayAndRemoveCollateralWrite.writeContract({
        address: compositesAddress,
        abi: CoolerV2CompositesABI,
        functionName: "repayAndRemoveCollateral",
        args: [EMPTY_AUTH, EMPTY_SIGNATURE, finalRepayAmt, collateralAmt, []],
      });
      return;
    }

    const nonce = authNonce ?? 0n;
    const { auth, signature } = await getAuthorizationSignature({
      userAddress: address,
      authorizedAddress: compositesAddress,
      verifyingContract: monoCoolerAddress,
      chainId,
      nonce: nonce as bigint,
      signTypedDataAsync,
    });

    repayAndRemoveCollateralWrite.writeContract({
      address: compositesAddress,
      abi: CoolerV2CompositesABI,
      functionName: "repayAndRemoveCollateral",
      args: [auth, signature, finalRepayAmt, collateralAmt, []],
    });
  };

  return {
    borrow,
    repay,
    addCollateral,
    withdrawCollateral,
    addCollateralAndBorrow,
    repayAndRemoveCollateral,
    isBorrowing: borrowWrite.isPending || borrowReceipt.isLoading,
    isRepaying: repayWrite.isPending || repayReceipt.isLoading,
    isAddingCollateral: addCollateralWrite.isPending || addCollateralReceipt.isLoading,
    isWithdrawingCollateral: withdrawCollateralWrite.isPending || withdrawCollateralReceipt.isLoading,
    isAddingCollateralAndBorrowing: addCollateralAndBorrowWrite.isPending || addCollateralAndBorrowReceipt.isLoading,
    isRepayingAndRemovingCollateral: repayAndRemoveCollateralWrite.isPending || repayAndRemoveCollateralReceipt.isLoading,
    borrowHash: borrowWrite.data,
    repayHash: repayWrite.data,
    addCollateralHash: addCollateralWrite.data,
    addCollateralAndBorrowHash: addCollateralAndBorrowWrite.data,
    repayAndRemoveCollateralHash: repayAndRemoveCollateralWrite.data,
    isBorrowSuccess: borrowReceipt.isSuccess,
    isRepaySuccess: repayReceipt.isSuccess,
    isAddCollateralSuccess: addCollateralReceipt.isSuccess,
    isAddCollateralAndBorrowSuccess: addCollateralAndBorrowReceipt.isSuccess,
    isRepayAndRemoveCollateralSuccess: repayAndRemoveCollateralReceipt.isSuccess,
  };
}
