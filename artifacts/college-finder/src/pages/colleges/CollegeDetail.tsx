import * as React from "react"
import { useParams, Link, useLocation } from "wouter"
import { 
  Building, GraduationCap, MapPin, ExternalLink, AlertTriangle, 
  UserCircle, Mail, Phone, Linkedin, TrendingUp, TrendingDown,
  ArrowRight, FileText, X
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts"

import { 
  useGetCollege, getGetCollegeQueryKey,
  useGetCollegeCourses, getGetCollegeCoursesQueryKey,
  useGetCollegeContacts, getGetCollegeContactsQueryKey,
  useGetCollegeStats, getGetCollegeStatsQueryKey,
  useGetCollegeCostAnalysis, getGetCollegeCostAnalysisQueryKey,
  useGenerateProposal,
  useCreateProposal,
} from "@workspace/api-client-react"
import type { Course } from "@workspace/api-client-react"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils"
import { estimateCourseCosts, isCommunityCollege } from "@/lib/courseCosts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function CollegeDetail() {
  const params = useParams()
  const id = params.id as string
  const [, setLocation] = useLocation()
  const [pitchCourse, setPitchCourse] = React.useState<Course | null>(null)

  const { data: college, isLoading: isLoadingCollege, isError: isCollegeError, error: collegeError } = useGetCollege(id, {
    query: { enabled: !!id, queryKey: getGetCollegeQueryKey(id) }
  })
  
  const { data: courses, isLoading: isLoadingCourses } = useGetCollegeCourses(id, {}, {
    query: { enabled: !!id, queryKey: getGetCollegeCoursesQueryKey(id, {}) }
  })
  
  const { data: contacts, isLoading: isLoadingContacts } = useGetCollegeContacts(id, {
    query: { enabled: !!id, queryKey: getGetCollegeContactsQueryKey(id) }
  })
  
  const { data: stats, isLoading: isLoadingStats } = useGetCollegeStats(id, {
    query: { enabled: !!id, queryKey: getGetCollegeStatsQueryKey(id) }
  })
  
  const { data: costAnalysis, isLoading: isLoadingCosts } = useGetCollegeCostAnalysis(id, {}, {
    query: { enabled: !!id, queryKey: getGetCollegeCostAnalysisQueryKey(id, {}) }
  })

  const generateProposal = useGenerateProposal()
  const saveProposal = useCreateProposal()

  const handleGenerateProposal = (singleCourse?: Course) => {
    if (!college) return
    const generateData = {
      collegeId: college.id,
      collegeName: college.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collegeCity: (college as any).city ?? "",
      collegeState: college.state,
      collegeType: college.type,
      enrollmentSize: college.enrollmentSize,
      dropoutRate: college.dropoutRate || undefined,
      courses: singleCourse ? [singleCourse] : courses,
      contacts: contacts,
      costAnalysis: costAnalysis,
      ...(singleCourse ? { pitchMode: true } : {}),
    }
    generateProposal.mutate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { data: generateData as any },
      {
        onSuccess: (generated) => {
          // Persist the proposal to DB, then navigate to its detail page
          saveProposal.mutate(
            {
              data: {
                collegeId: college.id,
                collegeName: college.name,
                collegeState: college.state,
                courses: generated.prioritizedCourses,
                contacts: contacts ?? [],
                aiVirtues: [],
                outreachLetter: generated.outreachLetter,
                costAnalysis: generated.costAnalysis,
              },
            },
            {
              onSuccess: (saved) => {
                setPitchCourse(null)
                setLocation(`/proposals/${saved.id}`)
              },
            }
          )
        },
      }
    )
  }

  if (isLoadingCollege) {
    return <div className="p-8"><Skeleton className="h-32 w-full" /></div>
  }

  if (isCollegeError) {
    // Distinguish a true 404 from a server/network error
    const is404 = (collegeError as { status?: number } | null)?.status === 404
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-lg font-semibold text-destructive">
          {is404 ? "College not found" : "Failed to load college — please try again"}
        </p>
        {!is404 && (
          <p className="text-sm text-muted-foreground">
            There was a problem reaching the server. Check your connection or reload the page.
          </p>
        )}
        <Link href="/colleges" className="text-sm text-primary underline">
          ← Back to college search
        </Link>
      </div>
    )
  }

  if (!college) {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-lg font-semibold">College not found</p>
        <Link href="/colleges" className="text-sm text-primary underline">
          ← Back to college search
        </Link>
      </div>
    )
  }

  const isCommunity = isCommunityCollege(college.type)

  const costComparisonData = costAnalysis ? [
    { name: 'Current Costs', value: costAnalysis.totalCostWithoutAI },
    { name: 'With AI Integration', value: costAnalysis.totalCostWithAI }
  ] : []

  const costBreakdownData = costAnalysis ? [
    { name: 'Course Delivery', value: costAnalysis.totalCurrentAnnualCost },
    { name: 'Attrition & Equity Gap', value: costAnalysis.attritionCost },
    { name: 'Benchmarking', value: costAnalysis.benchmarkingCost }
  ] : []

  // Pitch Dialog — costs for the selected course
  const pitchEstimate = pitchCourse
    ? estimateCourseCosts(
        pitchCourse.estimatedEnrollment ?? 0,
        (pitchCourse.failRate ?? 0) / 100,
        isCommunity
      )
    : null

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header Profile */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{college.name}</h1>
            {college.aiOpportunityScore && college.aiOpportunityScore >= 80 && (
              <Badge variant="success">High Priority</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground mt-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {college.city}, {college.state}
            </div>
            <div className="flex items-center gap-1.5">
              <Building className="h-4 w-4" />
              <span className="capitalize">{college.type.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              {formatNumber(college.enrollmentSize)} Students
            </div>
            {college.url && (
              <a href={college.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                <ExternalLink className="h-4 w-4" />
                Website
              </a>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0 bg-muted/30 p-4 rounded-xl border">
          <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Opp Score</div>
          <div className="text-4xl font-mono font-black text-primary">{college.aiOpportunityScore || 'N/A'}</div>
        </div>
      </div>

      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="courses">Target Courses</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="stats">Institution Stats</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>
        
        {/* COURSES TAB */}
        <TabsContent value="courses" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">High-Impact Candidate Courses</h2>
            <Badge variant="outline">{courses?.length || 0} courses identified</Badge>
          </div>
          
          <Card>
            {isLoadingCourses ? (
              <div className="p-6"><Skeleton className="h-64 w-full" /></div>
            ) : !courses || courses.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No courses data available</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Enrollment</TableHead>
                    <TableHead className="text-right">Fail Rate</TableHead>
                    <TableHead className="text-right">Current Cost</TableHead>
                    <TableHead className="text-right">AI Cost</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course, i) => {
                    const est = estimateCourseCosts(
                      course.estimatedEnrollment ?? 0,
                      (course.failRate ?? 0) / 100,
                      isCommunity
                    )
                    return (
                    <TableRow key={i} className={course.isHighPriority ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {course.name}
                          {course.isHighPriority && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{course.subject}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {course.estimatedEnrollment ? formatNumber(course.estimatedEnrollment) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {course.failRate ? (
                          <span className={course.failRate > 20 ? "text-destructive font-semibold" : ""}>
                            {formatPercent(course.failRate)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(est.directCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                        {formatCurrency(est.zhiAnnual)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
                          onClick={() => setPitchCourse(course)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Pitch
                        </Button>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* COST ANALYSIS TAB */}
        <TabsContent value="costs" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Burden vs. AI Integration</CardTitle>
                <CardDescription>Total annual financial impact</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoadingCosts ? <Skeleton className="h-full w-full" /> : costComparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(val) => `$${val/1000}k`} tickLine={false} axisLine={false} />
                      <Tooltip 
                        formatter={(val: number) => formatCurrency(val)} 
                        cursor={{fill: 'var(--muted)'}}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {costComparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--destructive))' : '#16a34a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">No cost data</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Cost Breakdown</CardTitle>
                <CardDescription>Where the money is going without AI</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoadingCosts ? <Skeleton className="h-full w-full" /> : costBreakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costBreakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {costBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">No cost data</div>}
              </CardContent>
            </Card>
          </div>

          <Card className="border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">Total Pipeline Opportunity</h3>
                <p className="text-emerald-600 dark:text-emerald-500 mt-1">Annual recurring savings for {college.name} if they adopt our AI solution.</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold uppercase tracking-wider text-emerald-600 mb-1">Estimated ROI</div>
                <div className="text-4xl font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {costAnalysis ? formatCurrency(costAnalysis.savingsAnnual) : <Skeleton className="h-10 w-32" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats" className="mt-6 space-y-6">
          {isLoadingStats ? (
            <Skeleton className="h-64 w-full" />
          ) : !stats ? (
            <div className="p-12 text-center text-muted-foreground border rounded-lg">No stats available</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Enrollment & Outcomes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Total Enrollment</div>
                      <div className="text-2xl font-mono font-bold">{stats.totalEnrollment ? formatNumber(stats.totalEnrollment) : 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Avg Time to Grad</div>
                      <div className="text-2xl font-mono font-bold">{stats.avgTimeToGraduate ? `${stats.avgTimeToGraduate} yrs` : 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        Dropout Rate
                        <TrendingUp className="h-3 w-3 text-destructive" />
                      </div>
                      <div className="text-2xl font-mono font-bold text-destructive">
                        {stats.dropoutRate != null ? formatPercent(stats.dropoutRate) : 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        Graduation Rate
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      </div>
                      <div className="text-2xl font-mono font-bold">
                        {stats.graduationRate != null ? formatPercent(stats.graduationRate) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Majors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.popularMajors && stats.popularMajors.length > 0 ? (
                      stats.popularMajors.map(major => (
                        <Badge key={major} variant="secondary" className="px-3 py-1 text-sm">{major}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No major data available</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* CONTACTS TAB */}
        <TabsContent value="contacts" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoadingContacts ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
              ))
            ) : !contacts || contacts.length === 0 ? (
              <div className="col-span-full p-12 text-center text-muted-foreground border rounded-lg">No contacts found</div>
            ) : (
              contacts.map((contact, i) => (
                <Card key={i} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <UserCircle className="h-10 w-10 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{contact.name}</div>
                        <div className="text-sm text-primary truncate">{contact.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{contact.department || contact.institution}</div>
                        
                        <div className="mt-4 space-y-2">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{contact.email}</span>
                            </a>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.name && (
                            <a
                              href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.name + ' ' + (contact.institution ?? ''))}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-sm text-[#0a66c2] hover:underline"
                            >
                              <Linkedin className="h-3 w-3" />
                              <span>Search LinkedIn</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* CTA FOOTER — full multi-course proposal */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 bg-background/80 backdrop-blur-md border-t flex items-center justify-between z-10 shadow-lg">
        <p className="text-xs text-muted-foreground hidden md:block">
          Full proposal targets all {courses?.length || 0} courses · use <strong>Pitch</strong> on a row for a single-course pitch
        </p>
        <Button 
          size="lg" 
          className="font-bold px-8 shadow-md"
          onClick={() => handleGenerateProposal()}
          disabled={generateProposal.isPending || !costAnalysis || !courses}
        >
          {generateProposal.isPending ? "Generating..." : "Generate Full Proposal"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* SINGLE-COURSE PITCH DIALOG */}
      <Dialog open={!!pitchCourse} onOpenChange={(open) => { if (!open) setPitchCourse(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg leading-snug">
              {pitchCourse?.name}
              <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                {college.name}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Single-course cost breakdown and pitch proposal
            </DialogDescription>
          </DialogHeader>

          {pitchEstimate && (
            <div className="space-y-6 pt-2">
              {/* Three-number story */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4 py-3 border-b">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Teaching this course now</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Instructor pay only</div>
                  </div>
                  <div className="text-xl font-mono font-bold text-destructive shrink-0">
                    ~{formatCurrency(pitchEstimate.directCost)}<span className="text-sm font-normal">/yr</span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 py-3 border-b">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">True cost once failures are counted</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Includes retakes + dropout revenue loss</div>
                  </div>
                  <div className="text-xl font-mono font-bold text-destructive shrink-0">
                    ~{formatCurrency(pitchEstimate.totalCost)}<span className="text-sm font-normal">/yr</span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3">
                  <div>
                    <div className="text-sm font-bold text-emerald-800 dark:text-emerald-400">With Zhi</div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">
                      + {formatCurrency(pitchEstimate.zhiSetup)} one-time setup
                    </div>
                  </div>
                  <div className="text-2xl font-mono font-black text-emerald-700 dark:text-emerald-400 shrink-0">
                    {formatCurrency(pitchEstimate.zhiAnnual)}<span className="text-sm font-normal">/yr</span>
                  </div>
                </div>
              </div>

              {/* Savings call-out */}
              <div className="text-center text-sm text-muted-foreground">
                Saves <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(pitchEstimate.totalCost - pitchEstimate.zhiAnnual)}
                </span> every year after setup
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPitchCourse(null)}
                >
                  <X className="h-4 w-4 mr-1" /> Close
                </Button>
                <Button
                  className="flex-1 font-bold"
                  onClick={() => handleGenerateProposal(pitchCourse!)}
                  disabled={generateProposal.isPending}
                >
                  {generateProposal.isPending ? "Generating…" : "Generate Pitch Proposal"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
