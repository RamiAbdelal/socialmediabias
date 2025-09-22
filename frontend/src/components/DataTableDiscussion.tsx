"use client";
import * as React from "react";
import { ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable, flexRender } from "@tanstack/react-table";
import type { DiscussionRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * DataTableDiscussion – lightweight shadcn-style table for discussion samples.
 * Features: sorting (title, bias, alignment, engagement), pagination. Keep bundle small.
 */
export function DataTableDiscussion({ data }: { data: DiscussionRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "engagement", desc: true }]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const columns = React.useMemo<ColumnDef<DiscussionRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Post Title",
  enableSorting: true,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <a
              href={`https://reddit.com${r.permalink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {r.title}
            </a>
          );
        },
      },
      {
        accessorKey: "bias",
        header: "MBFC Bias",
  enableSorting: true,
        cell: ({ row }) => <span className="text-xs text-foreground/70">{row.original.bias ?? "—"}</span>,
      },
      {
        accessorKey: "alignment",
        header: "Alignment",
  enableSorting: true,
        cell: ({ row }) => (
          <span className="text-xs capitalize text-foreground/80">
            {row.original.alignment ?? "unclear"}
            {row.original.refinedLabel ? ` / ${row.original.refinedLabel}` : ""}
          </span>
        ),
      },
      {
        accessorKey: "engagement",
        header: "Engagement",
        enableSorting: true,
        cell: ({ row }) => <span className="text-xs text-foreground/80">{row.original.engagement.toFixed(1)}</span>,
      },
      {
        id: "comments",
        header: "Comments (sample)",
        enableSorting: false,
        cell: ({ row }) => (
          <ul className="space-y-1 list-disc ml-4 text-xs text-foreground/80">
            {row.original.sampleComments.slice(0, 3).map((c, i) => (
              <li key={i} className="truncate max-w-xs" title={c}>
                {c}
              </li>
            ))}
          </ul>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/60 bg-background/40">
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
                    <div
                      className={header.column.getCanSort() ? "cursor-pointer select-none" : undefined}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() ? (
                          header.column.getIsSorted() === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 opacity-80" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5 opacity-80" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                          )
                        ) : null}
                      </span>
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between px-4 py-2 text-xs">
        <div className="hidden md:flex items-center gap-2">
          <span>Rows per page</span>
          <select
            className="bg-background/60 border border-border/60 rounded px-2 py-1"
            value={table.getState().pagination.pageSize}
            onChange={(e) => setPagination((p) => ({ ...p, pageSize: Number(e.target.value) }))}
          >
            {[10, 20, 30, 40, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="subtle" size="sm" className="h-7 px-2">
                Columns
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wide">Customize columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(checked) => col.toggleVisibility(checked === true)}
                  className="text-xs"
                >
                  {String(col.columnDef.header ?? col.id)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="subtle" className="hidden h-7 w-7 p-0 md:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>«</Button>
          <Button variant="subtle" className="h-7 w-7 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>‹</Button>
          <div className="px-2">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</div>
          <Button variant="subtle" className="h-7 w-7 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>›</Button>
          <Button variant="subtle" className="hidden h-7 w-7 p-0 md:flex" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>»</Button>
        </div>
      </div>
    </div>
  );
}
