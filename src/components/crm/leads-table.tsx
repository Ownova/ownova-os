"use client";

import * as React from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import type { Client } from "@/types";

const stageVariant: Record<Client["stage"], "default" | "success" | "warning" | "secondary" | "destructive"> = {
  lead: "secondary",
  contacted: "default",
  meeting: "default",
  proposal_sent: "warning",
  negotiation: "warning",
  won: "success",
  lost: "destructive",
};

const columnHelper = createColumnHelper<Client>();

const columns = [
  columnHelper.accessor("name", {
    header: "Contact",
    cell: (info) => {
      const c = info.row.original;
      return (
        <Link href={`/crm/${c.id}`} className="flex items-center gap-2.5 hover:opacity-80">
          <Avatar>
            <AvatarFallback>{initials(c.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none text-primary">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.company}</p>
          </div>
        </Link>
      );
    },
  }),
  columnHelper.accessor("stage", {
    header: "Stage",
    cell: (info) => <Badge variant={stageVariant[info.getValue()]}>{info.getValue().replace("_", " ")}</Badge>,
  }),
  columnHelper.accessor("value", {
    header: "Value",
    cell: (info) => formatCurrency(info.getValue()),
  }),
  columnHelper.accessor("owner", { header: "Owner" }),
  columnHelper.accessor("lastActivity", {
    header: "Last Activity",
    cell: (info) => formatDate(info.getValue()),
  }),
];

export function LeadsTable({ clients }: { clients: Client[] }) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const table = useReactTable({
    data: clients,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const c = row.original;
      const haystack = `${c.name} ${c.company} ${c.email} ${c.tags.join(" ")}`.toLowerCase();
      return haystack.includes(String(filterValue).toLowerCase());
    },
  });

  return (
    <div className="space-y-3">
      <div className="relative w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients, companies, tags..."
          className="pl-9"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>
      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && <ArrowUpDown className="h-3 w-3" />}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
