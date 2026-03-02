import { useQuery } from "@tanstack/react-query";
import { TREASURY_API_URL } from "@/lib/constants";

export interface WeeklySupplyChange {
  weekLabel: string; // e.g. "Jan 6"
  weekStart: string; // ISO date
  startSupply: number;
  endSupply: number;
  change: number; // negative = net burned
}

export interface SupplyHistory {
  weeks: WeeklySupplyChange[];
  currentSupply: number;
  weeklyAvgChange: number;
  annualizedChangeRate: number; // as percentage (negative = deflationary)
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function useSupplyHistory() {
  return useQuery<SupplyHistory>({
    queryKey: ["supplyHistory"],
    queryFn: async () => {
      // Fetch ~90 days of daily metrics
      const startDate = new Date(Date.now() - 90 * 86_400_000).toISOString().split("T")[0];
      const params = JSON.stringify({
        startDate,
        crossChainDataComplete: true,
        ignoreCache: false,
      });

      const response = await fetch(
        `${TREASURY_API_URL}/operations/paginated/metrics?wg_variables=${encodeURIComponent(params)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch supply history");

      const json = await response.json();
      const records: Array<{
        date: string;
        ohmTotalSupply: number;
      }> = json.data ?? [];

      // Sort by date ascending
      records.sort((a, b) => a.date.localeCompare(b.date));

      // Group by ISO week (Monday-Sunday)
      const weekMap = new Map<string, { dates: string[]; supplies: number[] }>();

      for (const rec of records) {
        const monday = getMonday(new Date(`${rec.date}T00:00:00Z`));
        const key = monday.toISOString().split("T")[0];
        if (!weekMap.has(key)) {
          weekMap.set(key, { dates: [], supplies: [] });
        }
        const week = weekMap.get(key)!;
        week.dates.push(rec.date);
        week.supplies.push(rec.ohmTotalSupply || 0);
      }

      // Convert to weekly changes
      const weeks: WeeklySupplyChange[] = [];
      for (const [weekStart, { supplies }] of weekMap) {
        if (supplies.length < 2) continue; // Need at least 2 days
        const startSupply = supplies[0];
        const endSupply = supplies[supplies.length - 1];
        const change = endSupply - startSupply;
        const d = new Date(`${weekStart}T00:00:00Z`);
        const weekLabel = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
        weeks.push({ weekLabel, weekStart, startSupply, endSupply, change });
      }

      // Sort by date and drop the current incomplete week if it just started
      weeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

      const currentSupply = records.length ? records[records.length - 1].ohmTotalSupply : 0;

      // Use completed weeks for average (exclude the most recent incomplete one)
      const completedWeeks = weeks.length > 1 ? weeks.slice(0, -1) : weeks;
      const weeklyAvgChange =
        completedWeeks.length > 0
          ? completedWeeks.reduce((sum, w) => sum + w.change, 0) / completedWeeks.length
          : 0;

      const annualizedChangeRate =
        currentSupply > 0 ? (weeklyAvgChange / currentSupply) * 52 * 100 : 0;

      return { weeks, currentSupply, weeklyAvgChange, annualizedChangeRate };
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
}
