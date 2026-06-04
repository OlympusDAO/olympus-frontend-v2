import { useQuery } from "@tanstack/react-query";
import { treasurySubgraphClient } from "@/lib/treasury-subgraph-client";
import { parseEnvioNumber } from "@/lib/utils/envio";

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
    queryKey: ["supplyHistory", "treasury-subgraph"],
    queryFn: async () => {
      const start = new Date(Date.now() - 90 * 86_400_000).toISOString().split("T")[0];
      const rows = (
        await treasurySubgraphClient.getDailyMetrics({ start, autoPaginate: true })
      ).filter((r) => r.crossChainComplete);
      const records = rows
        .map((r) => ({
          date: r.date,
          ohmTotalSupply: parseEnvioNumber(r.ohmTotalSupply),
        }))
        .sort((a, b) => Date.parse(`${a.date}T00:00:00Z`) - Date.parse(`${b.date}T00:00:00Z`));

      // Group by ISO week (Monday-Sunday)
      const weekMap = new Map<string, { dates: string[]; supplies: number[] }>();

      for (const rec of records) {
        const monday = getMonday(new Date(`${rec.date}T00:00:00Z`));
        const key = monday.toISOString().split("T")[0];
        let week = weekMap.get(key);
        if (!week) {
          week = { dates: [], supplies: [] };
          weekMap.set(key, week);
        }
        week.dates.push(rec.date);
        week.supplies.push(rec.ohmTotalSupply);
      }

      const weeks: WeeklySupplyChange[] = [];
      for (const [weekStart, { supplies }] of weekMap) {
        if (supplies.length < 2) continue;
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
