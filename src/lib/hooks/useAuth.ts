import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useGETAuthVerify, usePOSTAuthGetNonce, usePOSTAuthLogin } from "@/generated/olympusUnits";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/api/customHttpClient";

export function useAuth() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [error, setError] = useState<Error | null>(null);

  const token = getAuthToken();

  const { data: verifyData, isLoading: isVerifyLoading } = useGETAuthVerify({
    query: { enabled: !!token && !!address, retry: false },
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

      setAuthToken(loginData.token);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  function signOut() {
    clearAuthToken();
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
