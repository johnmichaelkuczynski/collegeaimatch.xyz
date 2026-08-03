import * as React from "react"
import { useParams, Link } from "wouter"
import { ArrowLeft, Download, Send, Copy, FileText, CheckCircle2, TrendingUp, AlertCircle, Building, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts"
import { pdf } from "@react-pdf/renderer"

import { useGetProposal, getGetProposalQueryKey } from "@workspace/api-client-react"
import { formatCurrency, formatNumber, formatPercent, cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProposalPDF } from "./ProposalPDF"

export default function ProposalDetail() {
  const params = useParams()
  const id = Number(params.id)
  const [pdfLoading, setPdfLoading] = React.useState(false)

  const { data: proposal, isLoading } = useGetProposal(id, {
    query: { enabled: !isNaN(id), queryKey: getGetProposalQueryKey(id) }
  })

  async function handleDownloadPdf() {
    if (!proposal) return
    setPdfLoading(true)
    try {
      const blob = await pdf(<ProposalPDF proposal={proposal} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Proposal-${proposal.collegeName.replace(/\s+/g, "-")}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  if (isLoading) {
    return <div className="p-8 max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-6">
        <Skeleton className="h-[600px] flex-1" />
        <Skeleton className="h-[600px] w-80" />
      </div>
    </div>
  }

  if (!proposal) {
    return <div className="p-8 text-center">Proposal not found</div>
  }

  const { costAnalysis, courses, contacts } = proposal

  const waterfallData = costAnalysis ? [
    { name: 'Current Total', value: costAnalysis.totalCostWithoutAI, fill: 'hsl(var(--destructive))' },
    { name: 'AI Integration', value: -costAnalysis.totalAiInstallCost, fill: 'hsl(var(--muted-foreground))' },
    { name: 'AI Annual', value: -costAnalysis.totalAiAnnualCost, fill: 'hsl(var(--muted-foreground))' },
    { name: 'New Total', value: costAnalysis.totalCostWithAI, fill: 'hsl(var(--primary))' },
    { name: 'Annual Savings', value: costAnalysis.savingsAnnual, fill: 'hsl(var(--accent))' }
  ] : []

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/proposals" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Proposal: {proposal.collegeName}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" /> {proposal.collegeState} • Generated {new Date(proposal.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Copy className="mr-2 h-4 w-4" /> Copy Link</Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
              : <><Download className="mr-2 h-4 w-4" /> Download PDF</>}
          </Button>
          <Button><Send className="mr-2 h-4 w-4" /> Send Email</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Letter & Pitch */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Executive Outreach Letter
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-bold">
              {/* Render the outreach letter. In a real app this might be markdown or formatted text. */}
              <div className="whitespace-pre-wrap font-serif text-[15px] text-slate-800 dark:text-slate-200">
                {proposal.outreachLetter}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Value Props Emphasized</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {proposal.aiVirtues?.map(virtue => (
                  <Badge key={virtue} variant="secondary" className="px-3 py-1 text-sm bg-primary/10 text-primary hover:bg-primary/20">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {virtue}
                  </Badge>
                ))}
                {(!proposal.aiVirtues || proposal.aiVirtues.length === 0) && (
                  <span className="text-muted-foreground text-sm">No specific virtues tagged.</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Data & Contacts */}
        <div className="space-y-6">
          <Card className="bg-slate-50 dark:bg-slate-900 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">ROI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground uppercase font-semibold">Total Opportunity</div>
                  <div className="text-3xl font-black font-mono text-emerald-600">
                    {formatCurrency(costAnalysis?.savingsAnnual || 0)} <span className="text-base font-sans font-normal text-muted-foreground">/ yr</span>
                  </div>
                </div>
                
                <div className="h-48 mt-4 -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waterfallData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} style={{ fontSize: '10px' }} />
                      <RechartsTooltip formatter={(val: number) => formatCurrency(Math.abs(val))} />
                      <Bar dataKey="value" radius={4} barSize={16}>
                        {waterfallData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Target Courses
                <Badge>{courses?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {courses?.slice(0, 5).map((course, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                  <div className="font-medium truncate pr-2" title={course.name}>{course.name}</div>
                  <div className="font-mono text-emerald-600 shrink-0">
                    {course.aiAnnualCost ? formatCurrency(course.aiAnnualCost) : '-'}
                  </div>
                </div>
              ))}
              {courses && courses.length > 5 && (
                <div className="text-xs text-center text-muted-foreground pt-2">
                  + {courses.length - 5} more courses included in analysis
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Key Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              {contacts?.slice(0, 4).map((contact, i) => (
                <div key={i} className="flex flex-col space-y-1 bg-background border rounded-md p-3">
                  <div className="font-semibold text-sm">{contact.name}</div>
                  <div className="text-xs text-primary">{contact.title}</div>
                  <div className="text-xs text-muted-foreground">{contact.email || "No email available"}</div>
                </div>
              ))}
              {(!contacts || contacts.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4">No contact data appended.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
