import * as React from "react"
import { Link } from "wouter"
import { FileText, Plus, ExternalLink, Calendar, Building, DollarSign } from "lucide-react"

import { useListProposals } from "@workspace/api-client-react"
import { cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ProposalsList() {
  const { data: proposals, isLoading } = useListProposals()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outreach Proposals</h1>
          <p className="text-muted-foreground mt-2">
            Generated pitches and cost analyses ready for sending.
          </p>
        </div>
        <Link href="/colleges" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New Proposal
        </Link>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !proposals || proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No proposals generated yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Start from a college or subject search to identify targets and generate data-backed outreach proposals.
            </p>
            <Link href="/colleges" className={buttonVariants()}>Find a Target College</Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institution</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Courses Targeted</TableHead>
                <TableHead>Generated On</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {proposal.collegeName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{proposal.collegeState}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {proposal.courseCount || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(proposal.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/proposals/${proposal.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "font-semibold text-primary")}>
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
