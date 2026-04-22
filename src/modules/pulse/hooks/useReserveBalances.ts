import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants";

export interface LpPosition {
  name: string;
  value: number;
}

interface ReserveBalances {
  susdeValue: number;
  susdsValue: number;
  lpPositions: LpPosition[];
}

// Map treasury tokenRecord names to identify LP positions
const LP_TOKEN_MATCHERS = ["liquidity pool", " lp"];

function isLpToken(token: string): boolean {
  const lower = token.toLowerCase();
  return LP_TOKEN_MATCHERS.some((m) => lower.includes(m));
}

export function useReserveBalances() {
  return useQuery<ReserveBalances>({
    queryKey: ["reserveBalances"],
    queryFn: async () => {
      // Query yesterday's tokenRecords (today's may not be indexed yet)
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
      const params = JSON.stringify({
        startDate: yesterday,
        crossChainDataComplete: false,
        ignoreCache: false,
      });

      const response = await fetch(
        `${TREASURY_API_URL}/operations/paginated/tokenRecords?wg_variables=${encodeURIComponent(params)}`,
      );

      if (!response.ok) throw new Error("Failed to fetch reserve balances");

      const json = await response.json();
      const records: Array<{
        token: string;
        balance: string;
        value: string;
        date: string;
        category: string;
      }> = json.data ?? [];

      let susdeValue = 0;
      let susdsValue = 0;
      // Track latest LP values by token name (records ordered by date desc)
      const lpMap = new Map<string, number>();

      for (const rec of records) {
        const token = (rec.token || "").toLowerCase();
        const value = parseFloat(rec.value) || 0;

        if (token === "staked usde" && value > susdeValue) {
          susdeValue = value;
        }
        if (token === "savings usds" && value > susdsValue) {
          susdsValue = value;
        }
        // Capture LP positions (first occurrence = latest date)
        if (
          isLpToken(rec.token) &&
          rec.category === "Protocol-Owned Liquidity" &&
          !lpMap.has(rec.token)
        ) {
          lpMap.set(rec.token, value);
        }
      }

      const lpPositions: LpPosition[] = [];
      for (const [name, value] of lpMap) {
        if (value > 1000) {
          lpPositions.push({ name, value });
        }
      }

      return { susdeValue, susdsValue, lpPositions };
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}
