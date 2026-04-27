import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { RiArrowRightSLine } from "@remixicon/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useActivityFeed } from "@/lib/hooks/liveness/useActivityFeed";
import { ACTIVITY_COLUMNS } from "@/modules/pulse/utils/activity-config";
import { cn } from "@/lib/utils";

// ── Component ─────────────────────────────────────────────────────────────────

export function OverviewLastActions() {
  const { data: allItems, isLoading } = useActivityFeed();

  const top5 = useMemo(() => (allItems ?? []).slice(0, 5), [allItems]);

  const table = useReactTable({
    data: top5,
    columns: ACTIVITY_COLUMNS,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Separator />
        <table className="block w-full overflow-x-auto">
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
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
        </table>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-sm/5 font-semibold">Last Protocol Actions</p>
        <Button
          variant="secondary"
          size="sm"
          render={<Link to="/pulse/feed" />}
          onClick={() => {
            document.querySelector("main")?.scrollTo({ top: 0 });
          }}
        >
          View All
          <RiArrowRightSLine />
        </Button>
      </div>
      <Separator />

      {/* Table */}
      {table.getRowModel().rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-tertiary-t">No recent activity</p>
      ) : (
        <table className="block w-full overflow-x-auto">
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const cells = row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    cell.column.id === "description" && "w-full",
                    cell.column.id === "time" && "text-right",
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ));

              return <TableRow key={row.id}>{cells}</TableRow>;
            })}
          </TableBody>
        </table>
      )}
    </Card>
  );
}
