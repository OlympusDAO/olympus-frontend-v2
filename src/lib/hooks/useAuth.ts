import { useState, useEffect, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useGETAuthVerify, usePOSTAuthGetNonce, usePOSTAuthLogin } from "@/generated/olympusUnits";
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  setCurrentAddress,
} from "@/api/customHttpClient";

export function useAuth(options?: { enabled?: boolean }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [error, setError] = useState<Error | null>(null);
  const prevAddressRef = useRef<string | undefined>(undefined);

  // Keep the HTTP client in sync with the current address and clear stale tokens on wallet switch.
  useEffect(() => {
    setCurrentAddress(address ?? null);

    const prev = prevAddressRef.current;
    prevAddressRef.current = address;

    if (prev && prev !== address) {
      clearAuthToken(prev);
    }
  }, [address]);

  const token = address ? getAuthToken(address) : null;

  const { data: verifyData, isLoading: isVerifyLoading } = useGETAuthVerify({
    query: { enabled: (options?.enabled ?? true) && !!token && !!address, retry: false },
  });

  const isAuthenticated = !!(
    verifyData?.authenticated && verifyData.address?.toLowerCase() === address?.toLowerCase()
  );

  const getNonce = usePOSTAuthGetNonce();
  const login = usePOSTAuthLogin();

  async function signIn() {
    if (!address) return;
    setError(null);
    try {
      const nonceData = await getNonce.mutateAsync({
        data: { address },
      });

      const signature = await signMessageAsync({ message: nonceData.message });

      const loginData = await login.mutateAsync({
        data: { address, message: nonceData.message, signature },
      });

      setAuthToken(address, loginData.token);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  function signOut() {
    if (address) clearAuthToken(address);
    window.location.reload();
  }

  const isLoading = isVerifyLoading || getNonce.isPending || login.isPending;

  return {
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    error,
  };
}
