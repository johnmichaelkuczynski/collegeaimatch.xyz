import * as React from "react"
import { Link } from "wouter"
import { School, BookOpen, ChevronRight, FileText, Building2, TrendingUp, Search } from "lucide-react"

import { useGetDashboardSummary } from "@workspace/api-client-react"
import { formatCurrency, formatNumber, cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-2">
          Track your outreach pipeline and discover new AI integration opportunities.
        </p>
      </div>

      {/* Start Workflows */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover-elevate transition-colors border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              Start from a College
            </CardTitle>
            <CardDescription>
              Find high-opportunity institutions based on enrollment, dropout rates, and financials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/colleges" className={cn(buttonVariants(), "w-full sm:w-auto")}>
              Search Colleges
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-colors border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              Start from a Subject
            </CardTitle>
            <CardDescription>
              Identify which colleges are struggling with specific courses and need AI intervention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/subjects" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto border-accent/30 hover:bg-accent hover:text-accent-foreground")}>
              Search Subjects
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Proposals Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {formatNumber(summary?.totalProposals || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Colleges Researched</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {formatNumber(summary?.totalCollegesResearched || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Avg Savings / College</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold font-mono text-accent">
                {formatCurrency(summary?.avgSavingsPerCollege || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {formatCurrency(summary?.totalPotentialSavings || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top States */}
        <Card>
          <CardHeader>
            <CardTitle>Top Opportunity States</CardTitle>
            <CardDescription>Based on high dropout rates and tuition costs</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {summary?.topOpportunityStates.map((state, i) => (
                  <div key={state.state} className="flex items-center">
                    <div className="w-8 font-mono text-sm text-muted-foreground">{i + 1}.</div>
                    <div className="flex-1 font-medium">{state.state}</div>
                    <div className="font-mono text-sm">{formatNumber(state.count)} colleges</div>
                    <div className="w-24 ml-4 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${Math.max(10, (state.count / Math.max(...summary.topOpportunityStates.map(s => s.count))) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!summary?.topOpportunityStates || summary.topOpportunityStates.length === 0) && (
                  <div className="text-center py-4 text-sm text-muted-foreground">No data available</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Proposals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Proposals</CardTitle>
            <CardDescription>Your latest generated outreach documents</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {summary?.recentProposals.map((proposal) => (
                  <div key={proposal.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <Link href={`/proposals/${proposal.id}`}>
                        <div className="font-medium hover:underline cursor-pointer">
                          {proposal.collegeName}
                        </div>
                      </Link>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{proposal.collegeState}</span>
                        <span>•</span>
                        <span>{proposal.courseCount} courses</span>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {new Date(proposal.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
                {(!summary?.recentProposals || summary.recentProposals.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No proposals generated yet.</p>
                    <Link href="/colleges" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Find a College
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
