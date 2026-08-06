import * as React from "react"
import { Link } from "wouter"
import {
  Mail, Search, Calendar, X, ExternalLink, Inbox,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"

interface EmailHistoryEntry {
  proposalId: number
  collegeName: string
  sentAt: string
  to: string
  recipientName?: string
}

function useEmailHistory() {
  return useQuery<EmailHistoryEntry[]>({
    queryKey: ["/api/proposals/email-history"],
    queryFn: async () => {
      const res = await fetch("/api/proposals/email-history")
      if (!res.ok) throw new Error("Failed to load email history")
      return res.json()
    },
  })
}

export default function EmailHistory() {
  const { data: entries, isLoading } = useEmailHistory()

  const [emailFilter, setEmailFilter] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const filtered = React.useMemo(() => {
    if (!entries) return []
    let result = entries

    if (emailFilter.trim()) {
      const q = emailFilter.trim().toLowerCase()
      result = result.filter(
        (e) =>
          e.to.toLowerCase().includes(q) ||
          (e.recipientName ?? "").toLowerCase().includes(q) ||
          e.collegeName.toLowerCase().includes(q)
      )
    }

    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      result = result.filter((e) => new Date(e.sentAt) >= from)
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((e) => new Date(e.sentAt) <= to)
    }

    return result
  }, [entries, emailFilter, dateFrom, dateTo])

  const hasFilters = emailFilter || dateFrom || dateTo

  function clearFilters() {
    setEmailFilter("")
    setDateFrom("")
    setDateTo("")
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email History</h1>
        <p className="text-muted-foreground mt-2">
          All outreach sends across every proposal — search by address, name, or date range.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-5">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">
              Search by email, name, or college
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="provost@college.edu"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Date from */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">
              From
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                className="pl-9 w-40"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
          </div>

          {/* Date to */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">
              To
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                className="pl-9 w-40"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pb-0.5"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Active filter summary */}
        {hasFilters && !isLoading && (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {entries?.length ?? 0} sends
          </p>
        )}
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No emails sent yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Once you send a proposal to a college official, all sends will appear here.
            </p>
            <Link href="/proposals" className={buttonVariants({ variant: "outline", size: "sm" })}>
              View Proposals
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No results match your filters</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your search or date range.</p>
            <button
              type="button"
              onClick={clearFilters}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Sent</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Proposal</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry, i) => (
                <TableRow key={`${entry.proposalId}-${entry.sentAt}-${i}`} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {new Date(entry.sentAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      <span className="text-xs text-muted-foreground/60">
                        {new Date(entry.sentAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.recipientName ? (
                      <span className="font-medium">{entry.recipientName}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-sm">{entry.to}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {entry.collegeName}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/proposals/${entry.proposalId}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "font-semibold text-primary"
                      )}
                    >
                      View <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
