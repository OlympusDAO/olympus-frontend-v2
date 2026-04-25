import { useState, useMemo } from "react";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActivityFeed } from "@/lib/hooks/liveness/useActivityFeed";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_COLUMNS,
  TYPE_CONFIG,
  type Protocol,
} from "@/modules/pulse/utils/activity-config";

type ProtocolFilter = "All" | Protocol;

const PROTOCOL_OPTIONS: { value: ProtocolFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "CD", label: "CD" },
  { value: "YRF", label: "YRF" },
  { value: "Cooler", label: "Cooler" },
];

export function FeedPage() {
  const [protocol, setProtocol] = useState<ProtocolFilter>("All");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: allItems, isLoading } = useActivityFeed({
    refetchInterval: autoRefresh ? 60_000 : false,
  });

  const filtered = useMemo(() => {
    return (allItems ?? []).filter(
      (item) => protocol === "All" || TYPE_CONFIG[item.type].protocol === protocol,
    );
  }, [allItems, protocol]);

  const table = useReactTable({
    data: filtered,
    columns: ACTIVITY_COLUMNS,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Segmented
          value={protocol}
          onValueChange={(v) => setProtocol(v as ProtocolFilter)}
          options={PROTOCOL_OPTIONS}
          size="sm"
        />
        <div className="flex items-center gap-x-2">
          <Label
            htmlFor="auto-refresh"
            className="text-xs leading-4 font-semibold text-primary-t cursor-pointer"
          >
            Auto-refresh
          </Label>
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
            size="md"
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card className="overflow-hidden">
          <Table>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-6 w-14 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="size-8 rounded-full" />
                  </TableCell>
                  <TableCell className="w-full">
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-14" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocol</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="w-full">Details</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-40 py-16 text-center align-middle text-sm/5 font-semibold text-secondary-t"
                  >
                    No activity
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.id === "description" && "w-full",
                          cell.column.id === "time" && "text-right",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
