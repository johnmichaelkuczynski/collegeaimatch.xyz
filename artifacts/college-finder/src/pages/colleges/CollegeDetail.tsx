import * as React from "react"
import { useParams, Link, useLocation } from "wouter"
import { 
  Building, GraduationCap, MapPin, ExternalLink, AlertTriangle, 
  UserCircle, Mail, Phone, Linkedin, TrendingUp, TrendingDown,
  ArrowRight, FileText, X, Loader2, Pencil, PlusCircle, Search, BookOpen
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// ── Zhi Systems product virtues — shown as selectable chips in the CTA bar ──
// key: stable identifier used in state; label: short chip text; full: full name
// passed to the AI prompt so the letter leads with the chosen strengths.
const ZHI_VIRTUES_LIST: { key: string; label: string; full: string }[] = [
  { key: "tutors",       label: "24/7 Tutors",         full: "24/7 Built-In Tutors" },
  { key: "cheatproof",   label: "Cheat-Proof",          full: "Cheat-Proof by Design" },
  { key: "industry",     label: "Industry-Aligned",     full: "Industry-Aligned Progress" },
  { key: "adaptive",     label: "Adaptive Lectures",    full: "Fixed Assessments, Adaptive Lectures" },
  { key: "mastery",      label: "Verified Mastery",     full: "Verified Mastery" },
  { key: "maintenance",  label: "5-Yr Maintenance",     full: "5-Year Free Maintenance Guarantee" },
];

// ── Full Zhi Systems course catalog ─────────────────────────────────────────
// Organised by primary delivery format.  Reps use this to manually add a
// course to any college's list when they know the college needs it even though
// the AI didn't flag it.
const ZHI_CATALOG: { name: string; format: "8-week" | "4-week"; subject: string }[] = [
  // ── 8-week full courses ──
  { name: "AI 101",                                 format: "8-week", subject: "Artificial Intelligence" },
  { name: "Analytic Philosophy",                    format: "8-week", subject: "Philosophy" },
  { name: "Business Ethics",                        format: "8-week", subject: "Ethics / Business" },
  { name: "Conceptual Mathematics",                 format: "8-week", subject: "Mathematics" },
  { name: "Conceptual Physics",                     format: "8-week", subject: "Physics" },
  { name: "Constructive Critical Reasoning",        format: "8-week", subject: "Philosophy / Logic" },
  { name: "Critical Thinking",                      format: "8-week", subject: "Philosophy" },
  { name: "Developmental (Remedial) Mathematics",   format: "8-week", subject: "Mathematics" },
  { name: "Ethics",                                 format: "8-week", subject: "Philosophy" },
  { name: "Evolutionary Psychology",                format: "8-week", subject: "Psychology" },
  { name: "Finance",                                format: "8-week", subject: "Business / Finance" },
  { name: "Formal Logic",                           format: "8-week", subject: "Philosophy / Logic" },
  { name: "Know Thyself",                           format: "8-week", subject: "Psychology / Philosophy" },
  { name: "Math Notation",                          format: "8-week", subject: "Mathematics" },
  { name: "Philosophy 101",                         format: "8-week", subject: "Philosophy" },
  { name: "Portfolio Analysis",                     format: "8-week", subject: "Finance" },
  { name: "Public Speaking",                        format: "8-week", subject: "Communication" },
  { name: "Quantitative Reasoning",                 format: "8-week", subject: "Mathematics" },
  { name: "Voice-Powered Know Thyself",             format: "8-week", subject: "Psychology / Philosophy" },
  // ── 4-week micro courses ──
  { name: "AI",                                     format: "4-week", subject: "Artificial Intelligence" },
  { name: "AI Logic",                               format: "4-week", subject: "AI / Logic" },
  { name: "AI Math",                                format: "4-week", subject: "AI / Mathematics" },
  { name: "Cognitive Science",                      format: "4-week", subject: "Cognitive Science" },
  { name: "Computer Systems",                       format: "4-week", subject: "Computer Science" },
  { name: "Constructive Critical Reasoning",        format: "4-week", subject: "Philosophy / Logic" },
  { name: "Criminal Psychology",                    format: "4-week", subject: "Psychology" },
  { name: "Data Structures and Algorithms",         format: "4-week", subject: "Computer Science" },
  { name: "Databases and SQL",                      format: "4-week", subject: "Computer Science" },
  { name: "Developmental Psychology",               format: "4-week", subject: "Psychology" },
  { name: "Diagonalization and Incompleteness",     format: "4-week", subject: "Mathematics / Logic" },
  { name: "Discrete Math",                          format: "4-week", subject: "Mathematics" },
  { name: "Evolutionary Psychology",                format: "4-week", subject: "Psychology" },
  { name: "Financial and Managerial Analytics",     format: "4-week", subject: "Business / Analytics" },
  { name: "Finite Math",                            format: "4-week", subject: "Mathematics" },
  { name: "Infinite Series",                        format: "4-week", subject: "Mathematics" },
  { name: "Introduction to Programming (Python / CS 1)", format: "4-week", subject: "Computer Science" },
  { name: "IQ Booster",                             format: "4-week", subject: "Cognitive Training" },
  { name: "Lambda Calculus",                        format: "4-week", subject: "Computer Science / Logic" },
  { name: "Machine Learning",                       format: "4-week", subject: "Computer Science / AI" },
  { name: "Marketing Analytics",                    format: "4-week", subject: "Business / Analytics" },
  { name: "Operations & Supply Chain Analytics",    format: "4-week", subject: "Business / Analytics" },
  { name: "Personal Finance",                       format: "4-week", subject: "Finance" },
  { name: "Predictive Analytics",                   format: "4-week", subject: "Business / Analytics" },
  { name: "Psychodynamic Therapy",                  format: "4-week", subject: "Psychology / Therapy" },
  { name: "Psychodynamic Therapy of BPD",           format: "4-week", subject: "Psychology / Therapy" },
  { name: "Psychodynamic Therapy of OCD",           format: "4-week", subject: "Psychology / Therapy" },
  { name: "Restaurant & Hospitality Analytics",     format: "4-week", subject: "Business / Analytics" },
  { name: "Revenue Management & Pricing Analytics", format: "4-week", subject: "Business / Analytics" },
  { name: "Spatial IQ Booster",                     format: "4-week", subject: "Cognitive Training" },
  { name: "Voice Powered Know Thyself",             format: "4-week", subject: "Psychology / Philosophy" },
  { name: "Workforce Analytics",                    format: "4-week", subject: "Business / Analytics" },
];

export default function CollegeDetail() {
  const params = useParams()
  const id = params.id as string
  const [, setLocation] = useLocation()
  const [pitchCourse, setPitchCourse] = React.useState<Course | null>(null)
  const [tone, setTone] = React.useState('formal')
  const [baseTone, setBaseTone] = React.useState('formal')
  const [scratchOpen, setScratchOpen] = React.useState(false)
  const [scratchLetter, setScratchLetter] = React.useState('')
  const [scratchSaving, setScratchSaving] = React.useState(false)
  const [selectedCourseIdxs, setSelectedCourseIdxs] = React.useState<Set<number>>(new Set())
  const [selectionChartOpen, setSelectionChartOpen] = React.useState(false)
  // Virtue selection — keys from ZHI_VIRTUES_LIST; empty means "use all five" (default)
  const [selectedVirtueKeys, setSelectedVirtueKeys] = React.useState<Set<string>>(new Set())

  const toggleVirtue = (key: string) => {
    setSelectedVirtueKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else if (next.size < 3) {
        next.add(key)
      }
      return next
    })
  }

  // Derive the aiVirtues strings to send — empty array means "all five" on the server
  const activeAiVirtues = selectedVirtueKeys.size > 0
    ? ZHI_VIRTUES_LIST.filter(v => selectedVirtueKeys.has(v.key)).map(v => v.full)
    : []

  // Manually added courses (from the Zhi catalog, added by the rep)
  const [manualCourses, setManualCourses] = React.useState<Course[]>([])
  const [addCourseOpen, setAddCourseOpen] = React.useState(false)
  const [addCourseNames, setAddCourseNames] = React.useState<Set<string>>(new Set())
  const [addCourseSearch, setAddCourseSearch] = React.useState('')

  const { data: college, isLoading: isLoadingCollege, isError: isCollegeError, error: collegeError } = useGetCollege(id, {
    query: { enabled: !!id, queryKey: getGetCollegeQueryKey(id) }
  })
  
  const { data: courses, isLoading: isLoadingCourses } = useGetCollegeCourses(id, {}, {
    query: { enabled: !!id, queryKey: getGetCollegeCoursesQueryKey(id, {}) }
  })

  // All courses: AI-generated + manually added by rep (must come after courses hook)
  const allCourses = React.useMemo<Course[]>(
    () => [...(courses ?? []), ...manualCourses],
    [courses, manualCourses]
  )
  
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

  const handleAddCourse = () => {
    if (addCourseNames.size === 0) return
    const newCourses: Course[] = []
    addCourseNames.forEach(name => {
      const entry = ZHI_CATALOG.find(c => c.name === name)
      if (!entry) return
      newCourses.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: `manual-${Date.now()}-${name}` as any,
        name: entry.name,
        subject: entry.subject,
        description: `${entry.format} Zhi Systems course — added manually`,
        estimatedEnrollment: 0,
        sections: 1,
        failRate: 0,
        estimatedAnnualCost: 0,
        aiInstallCost: 85_000,
        aiAnnualCost: 18_000,
        isHighPriority: true,
      })
    })
    setManualCourses(prev => [...prev, ...newCourses])
    setAddCourseNames(new Set())
    setAddCourseSearch('')
    setAddCourseOpen(false)
  }

  const handleGenerateProposal = (singleCourse?: Course, toneOverride?: string, editAfter?: boolean, coursesOverride?: Course[]) => {
    if (!college) return
    const activeTone = toneOverride ?? (tone !== 'manual' ? tone : 'formal')
    const activeCourses = coursesOverride ?? (singleCourse ? [singleCourse] : allCourses)
    const isSubset = !!coursesOverride && !singleCourse
    const generateData = {
      collegeId: college.id,
      collegeName: college.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collegeCity: (college as any).city ?? "",
      collegeState: college.state,
      collegeType: college.type,
      enrollmentSize: college.enrollmentSize,
      dropoutRate: college.dropoutRate || undefined,
      courses: activeCourses,
      contacts: contacts,
      costAnalysis: costAnalysis,
      tone: activeTone,
      aiVirtues: activeAiVirtues,
      ...(singleCourse ? { pitchMode: true } : {}),
      ...(isSubset ? { subset: true } : {}),
    }
    generateProposal.mutate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { data: generateData as any },
      {
        onSuccess: (generated) => {
          saveProposal.mutate(
            {
              data: {
                collegeId: college.id,
                collegeName: college.name,
                collegeState: college.state,
                courses: generated.prioritizedCourses,
                contacts: contacts ?? [],
                aiVirtues: activeAiVirtues,
                outreachLetter: generated.outreachLetter,
                costAnalysis: generated.costAnalysis,
              },
            },
            {
              onSuccess: (saved) => {
                setPitchCourse(null)
                setLocation(editAfter ? `/proposals/${saved.id}?edit=true` : `/proposals/${saved.id}`)
              },
            }
          )
        },
      }
    )
  }

  const handleSaveScratch = () => {
    if (!college || !scratchLetter.trim() || !costAnalysis) return
    setScratchSaving(true)
    saveProposal.mutate(
      {
        data: {
          collegeId: college.id,
          collegeName: college.name,
          collegeState: college.state,
          courses: allCourses,
          contacts: contacts ?? [],
          aiVirtues: activeAiVirtues,
          outreachLetter: scratchLetter,
          costAnalysis: costAnalysis,
        },
      },
      {
        onSuccess: (saved) => {
          setScratchOpen(false)
          setScratchSaving(false)
          setLocation(`/proposals/${saved.id}`)
        },
        onError: () => setScratchSaving(false),
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
            <div className="flex items-center gap-2">
              <Badge variant="outline">{allCourses.length} courses identified</Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => { setAddCourseOpen(true); setAddCourseSearch('') }}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add Course
              </Button>
            </div>
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
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={allCourses.length > 0 && selectedCourseIdxs.size === allCourses.length}
                        data-state={selectedCourseIdxs.size > 0 && selectedCourseIdxs.size < allCourses.length ? "indeterminate" : undefined}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedCourseIdxs(new Set(allCourses.map((_, i) => i)))
                          else setSelectedCourseIdxs(new Set())
                        }}
                        aria-label="Select all courses"
                      />
                    </TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Enrollment</TableHead>
                    <TableHead className="text-right">Fail Rate</TableHead>
                    <TableHead className="text-right">Current Cost</TableHead>
                    <TableHead className="text-right">AI Cost</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCourses.map((course, i) => {
                    const isManual = manualCourses.includes(course)
                    const est = estimateCourseCosts(
                      course.estimatedEnrollment ?? 0,
                      (course.failRate ?? 0) / 100,
                      isCommunity
                    )
                    return (
                    <TableRow
                      key={i}
                      className={`cursor-pointer ${course.isHighPriority && !isManual ? "bg-primary/5" : ""} ${isManual ? "bg-violet-50/60 dark:bg-violet-950/20" : ""} ${selectedCourseIdxs.has(i) ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                      onClick={() => setSelectedCourseIdxs(prev => {
                        const next = new Set(prev)
                        if (next.has(i)) next.delete(i)
                        else next.add(i)
                        return next
                      })}
                    >
                      <TableCell className="w-10 pl-4" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedCourseIdxs.has(i)}
                          onCheckedChange={() => setSelectedCourseIdxs(prev => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            return next
                          })}
                          aria-label={`Select ${course.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {course.name}
                          {isManual
                            ? <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-violet-400 text-violet-600 dark:text-violet-400">Manual</Badge>
                            : course.isHighPriority && <AlertTriangle className="h-3 w-3 text-amber-500" />
                          }
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
                        {isManual ? <span className="text-muted-foreground text-xs italic">—</span> : formatCurrency(est.directCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                        {formatCurrency(est.zhiAnnual)}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {isManual ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => setManualCourses(prev => prev.filter(c => c !== course))}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
                            onClick={() => setPitchCourse(course)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Pitch
                          </Button>
                        )}
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

      {/* CTA FOOTER — virtue selector + tone + proposal generation */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/95 backdrop-blur-md border-t z-10 shadow-lg">
        {/* Virtue emphasis row */}
        <div className="flex items-center gap-2 px-4 pt-2.5 pb-1 border-b border-border/50 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Lead with:</span>
          {ZHI_VIRTUES_LIST.map(v => {
            const isSelected = selectedVirtueKeys.has(v.key)
            const isDisabled = !isSelected && selectedVirtueKeys.size >= 3
            return (
              <button
                key={v.key}
                onClick={() => toggleVirtue(v.key)}
                disabled={isDisabled}
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : isDisabled
                    ? "bg-muted text-muted-foreground border-border opacity-40 cursor-not-allowed"
                    : "bg-background text-foreground border-border hover:bg-muted cursor-pointer",
                ].join(" ")}
                title={isDisabled ? "Select up to 3 virtues" : v.full}
              >
                {v.label}
              </button>
            )
          })}
          {selectedVirtueKeys.size > 0 ? (
            <button
              onClick={() => setSelectedVirtueKeys(new Set())}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground ml-1"
            >
              Reset
            </button>
          ) : (
            <span className="text-xs text-muted-foreground/60 italic ml-1">all five (default)</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
          {/* Tone selector */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap hidden sm:block">Tone:</span>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="h-8 w-52 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal / Institutional</SelectItem>
                <SelectItem value="direct">Direct / Quantitative</SelectItem>
                <SelectItem value="provocative">Provocative / Blunt</SelectItem>
                <SelectItem value="consultative">Consultative / Strategic</SelectItem>
                <SelectItem value="urgency">Urgency / Competitive</SelectItem>
                <SelectSeparator />
                <SelectItem value="manual">✏️ Manual / Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {tone === 'manual' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setScratchLetter(''); setScratchOpen(true) }}
                  disabled={!courses}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Write from Scratch
                </Button>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground hidden md:block">Base:</span>
                  <Select value={baseTone} onValueChange={setBaseTone}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="provocative">Provocative</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                      <SelectItem value="urgency">Urgency</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateProposal(undefined, baseTone, true)}
                    disabled={generateProposal.isPending || !costAnalysis || !courses}
                  >
                    {generateProposal.isPending
                      ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</>
                      : <>Generate & Edit <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>}
                  </Button>
                </div>
              </>
            ) : selectedCourseIdxs.size > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {selectedCourseIdxs.size} course{selectedCourseIdxs.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => setSelectedCourseIdxs(new Set())}
                  >
                    Clear
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateProposal()}
                    disabled={generateProposal.isPending || !costAnalysis || !allCourses.length}
                  >
                    Full Proposal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    onClick={() => setSelectionChartOpen(true)}
                    disabled={!allCourses.length}
                  >
                    📊 View ROI
                  </Button>
                  <Button
                    size="lg"
                    className="font-bold shadow-md"
                    onClick={() => {
                      const selected = allCourses.filter((_, i) => selectedCourseIdxs.has(i))
                      handleGenerateProposal(undefined, undefined, false, selected)
                    }}
                    disabled={generateProposal.isPending || !costAnalysis || !allCourses.length}
                  >
                    {generateProposal.isPending
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                      : <>Pitch {selectedCourseIdxs.size} Selected <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground hidden lg:block">
                  {allCourses.length} courses · check rows to pitch a subset
                </p>
                <Button
                  size="lg"
                  className="font-bold shadow-md"
                  onClick={() => handleGenerateProposal()}
                  disabled={generateProposal.isPending || !costAnalysis || !allCourses.length}
                >
                  {generateProposal.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                    : <>Generate Full Proposal <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SELECTION ROI CHART DIALOG */}
      <Dialog open={selectionChartOpen} onOpenChange={setSelectionChartOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              📊 Selection ROI — {selectedCourseIdxs.size} course{selectedCourseIdxs.size !== 1 ? 's' : ''} selected
            </DialogTitle>
            <DialogDescription>
              Projected annual savings for {college.name} if these courses switch to Zhi AI courseware.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const selectedCourses = allCourses.filter((_, i) => selectedCourseIdxs.has(i))
            const perCourse = selectedCourses.map(c => {
              const est = estimateCourseCosts(
                c.estimatedEnrollment ?? 0,
                (c.failRate ?? 0) / 100,
                isCommunity
              )
              return {
                name: c.name.length > 22 ? c.name.slice(0, 20) + '…' : c.name,
                fullName: c.name,
                current: est.directCost,
                ai: est.zhiAnnual,
                savings: est.directCost - est.zhiAnnual,
                failRate: c.failRate,
                enrollment: c.estimatedEnrollment,
              }
            })
            const totalCurrent = perCourse.reduce((s, c) => s + c.current, 0)
            const totalAI = perCourse.reduce((s, c) => s + c.ai, 0)
            const totalSavings = totalCurrent - totalAI
            const setupCost = selectedCourses.length * 85_000

            const comparisonData = [
              { name: 'Current Costs', value: totalCurrent },
              { name: 'With AI', value: totalAI },
            ]

            return (
              <div className="px-6 py-5 space-y-5">
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-destructive/5 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Current Annual Cost</div>
                    <div className="text-lg font-mono font-bold text-destructive">{formatCurrency(totalCurrent)}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Zhi AI Annual License</div>
                    <div className="text-lg font-mono font-bold">{formatCurrency(totalAI)}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">+ {formatCurrency(setupCost)} setup (one-time)</div>
                  </div>
                  <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/30 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Annual Savings</div>
                    <div className="text-lg font-mono font-bold text-emerald-600">{formatCurrency(totalSavings)}</div>
                  </div>
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Bar chart: Current vs AI */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Burden vs. AI Integration</div>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={45} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: 'hsl(var(--muted))' }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            <Cell fill="hsl(var(--destructive))" />
                            <Cell fill="#16a34a" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Horizontal bar: savings per course */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Annual Savings per Course</div>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perCourse} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis type="number" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={80} />
                          <Tooltip
                            formatter={(v: number) => formatCurrency(v)}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                            cursor={{ fill: 'hsl(var(--muted))' }}
                          />
                          <Bar dataKey="savings" radius={[0, 4, 4, 0]} fill="#16a34a" name="Annual Savings" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Per-course table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Course</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Enrollment</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Fail Rate</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Current/yr</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">AI/yr</th>
                        <th className="text-right px-3 py-2 font-medium text-emerald-600">Saves/yr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perCourse.map((c, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-medium">{c.fullName}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{c.enrollment?.toLocaleString() ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            <span className={(c.failRate ?? 0) > 20 ? 'text-destructive font-semibold' : ''}>{c.failRate ? `${c.failRate}%` : '—'}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(c.current)}</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-600">{formatCurrency(c.ai)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">{formatCurrency(c.savings)}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold">
                        <td className="px-3 py-2" colSpan={3}>Total</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(totalCurrent)}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600">{formatCurrency(totalAI)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">{formatCurrency(totalSavings)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setSelectionChartOpen(false)}>Close</Button>
            <Button
              className="font-bold"
              onClick={() => {
                setSelectionChartOpen(false)
                const selected = allCourses.filter((_, i) => selectedCourseIdxs.has(i))
                handleGenerateProposal(undefined, undefined, false, selected)
              }}
              disabled={generateProposal.isPending || !costAnalysis}
            >
              {generateProposal.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                : <>Pitch {selectedCourseIdxs.size} Selected <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD COURSE FROM ZHI CATALOG DIALOG */}
      <Dialog open={addCourseOpen} onOpenChange={(v) => { if (!v) { setAddCourseOpen(false); setAddCourseSearch('') } }}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Add Course from Zhi Catalog
            </DialogTitle>
            <DialogDescription>
              Add a course you know this college needs, even if the AI didn't flag it.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4">
            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Search courses…"
                value={addCourseSearch}
                onChange={(e) => setAddCourseSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Scrollable course list with checkboxes */}
            <div className="border rounded-md overflow-y-auto max-h-72 divide-y">
              {(() => {
                const filtered = ZHI_CATALOG.filter(c =>
                  !addCourseSearch.trim() ||
                  c.name.toLowerCase().includes(addCourseSearch.toLowerCase()) ||
                  c.subject.toLowerCase().includes(addCourseSearch.toLowerCase())
                )
                if (filtered.length === 0) return (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No courses match "{addCourseSearch}"</div>
                )
                return filtered.map(entry => {
                  const alreadyAdded = allCourses.some(c => c.name === entry.name)
                  const checked = addCourseNames.has(entry.name)
                  return (
                    <label
                      key={`${entry.name}-${entry.format}`}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors
                        ${alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/60'}
                        ${checked ? 'bg-primary/5' : ''}`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={alreadyAdded}
                        onCheckedChange={(v) => {
                          if (alreadyAdded) return
                          setAddCourseNames(prev => {
                            const next = new Set(prev)
                            if (v) next.add(entry.name)
                            else next.delete(entry.name)
                            return next
                          })
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{entry.name}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{entry.subject}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                        {entry.format}
                      </Badge>
                    </label>
                  )
                })
              })()}
            </div>

            {/* Selection summary */}
            {addCourseNames.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {addCourseNames.size} course{addCourseNames.size !== 1 ? 's' : ''} selected —{' '}
                <button className="underline underline-offset-2 hover:text-foreground" onClick={() => setAddCourseNames(new Set())}>
                  clear all
                </button>
              </p>
            )}
          </div>

          <DialogFooter className="px-5 py-4 border-t">
            <Button variant="outline" onClick={() => { setAddCourseOpen(false); setAddCourseSearch('') }}>Cancel</Button>
            <Button onClick={handleAddCourse} disabled={addCourseNames.size === 0} className="font-semibold">
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Add {addCourseNames.size > 0 ? addCourseNames.size : ''} Course{addCourseNames.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WRITE FROM SCRATCH DIALOG */}
      <Dialog open={scratchOpen} onOpenChange={(v) => !v && setScratchOpen(false)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Write Custom Outreach — {college.name}
            </DialogTitle>
            <DialogDescription>
              Write your letter below. College data is in the sidebar for reference.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Editor */}
            <div className="flex-1 flex flex-col p-4 min-w-0">
              <Textarea
                className="flex-1 resize-none font-serif text-[14px] leading-relaxed text-slate-800 dark:text-slate-200 min-h-0"
                placeholder={`${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

${contacts?.[0]?.name ?? "Dear Decision-Maker"},
${contacts?.[0]?.title ? contacts[0].title + "\n" : ""}${college.name}

Dear ${contacts?.[0]?.name ? contacts[0].name.split(' ').slice(-1)[0] : "Colleague"},

[Write your letter here...]

Warm regards,
Douglas Fong
Zhi Systems
zhi@zhisystems.org
845-240-4235`}
                value={scratchLetter}
                onChange={(e) => setScratchLetter(e.target.value)}
                spellCheck
              />
            </div>

            {/* Stats sidebar */}
            <div className="w-72 shrink-0 border-l bg-muted/30 overflow-y-auto p-4 space-y-4">
              {/* College snapshot */}
              <div>
                <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">Institution</Label>
                <div className="mt-1.5 space-y-1 text-sm">
                  <div className="font-medium">{college.name}</div>
                  <div className="text-muted-foreground">{college.city ? `${college.city}, ` : ''}{college.state} · {college.type?.replace('_', ' ')}</div>
                  <div>{college.enrollmentSize?.toLocaleString()} enrolled</div>
                  {college.dropoutRate && (
                    <div className="text-destructive font-medium">{college.dropoutRate.toFixed(1)}% dropout rate</div>
                  )}
                </div>
              </div>

              {/* ROI */}
              {costAnalysis && (
                <div>
                  <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">ROI</Label>
                  <div className="mt-1.5 space-y-1 text-sm">
                    <div>Current cost: <span className="font-mono">{formatCurrency(costAnalysis.totalCurrentAnnualCost)}</span></div>
                    <div>True cost: <span className="font-mono font-medium text-destructive">{formatCurrency(costAnalysis.totalCostWithoutAI)}</span></div>
                    <div>Annual savings: <span className="font-mono font-bold text-emerald-600">{formatCurrency(costAnalysis.savingsAnnual)}</span></div>
                    <div>Zhi annual: <span className="font-mono">{formatCurrency(costAnalysis.totalAiAnnualCost)}</span></div>
                    <div>Zhi setup: <span className="font-mono">{formatCurrency(costAnalysis.totalAiInstallCost)}</span></div>
                  </div>
                </div>
              )}

              {/* Key contacts */}
              {contacts && contacts.length > 0 && (
                <div>
                  <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">Key Contacts</Label>
                  <div className="mt-1.5 space-y-2">
                    {contacts.slice(0, 4).map((c, i) => (
                      <div key={i} className="text-xs border rounded p-2 bg-background">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-muted-foreground">{c.title}</div>
                        {c.email && <div className="font-mono text-primary">{c.email}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top courses */}
              {courses && courses.length > 0 && (
                <div>
                  <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">Top Courses</Label>
                  <div className="mt-1.5 space-y-1">
                    {courses.slice(0, 8).map((c, i) => (
                      <div key={i} className="text-xs flex justify-between gap-2">
                        <span className="truncate">{c.name}</span>
                        <span className="font-mono text-muted-foreground shrink-0">
                          {c.failRate ? `${c.failRate}% fail` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setScratchOpen(false)} disabled={scratchSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveScratch} disabled={scratchSaving || !scratchLetter.trim()}>
              {scratchSaving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                : <>Save Proposal <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
