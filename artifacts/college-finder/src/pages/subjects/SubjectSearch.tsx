import * as React from "react"
import { Link } from "wouter"
import { Search, BookOpen, Building, ChevronRight, TrendingUp, DollarSign } from "lucide-react"

import { useSearchBySubject, getSearchBySubjectQueryKey } from "@workspace/api-client-react"
import { formatCurrency, formatNumber, cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { buttonVariants, Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

const INSTITUTION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "community_college", label: "Community College" },
  { value: "four_year", label: "Four Year" },
  { value: "university", label: "University" },
]

export default function SubjectSearch() {
  const [subject, setSubject] = React.useState("")
  const [type, setType] = React.useState("all")
  // submittedSubject only changes when the user actually hits Hunt
  // this drives enabled: !!submittedSubject reliably, no refetch() needed
  const [submittedSubject, setSubmittedSubject] = React.useState("")
  const [submittedType, setSubmittedType] = React.useState("all")

  const { data: results, isLoading } = useSearchBySubject({
    subject: submittedSubject,
    institutionType: submittedType !== "all" ? submittedType : undefined,
    limit: 20
  }, {
    query: {
      enabled: !!submittedSubject,
      staleTime: 1000 * 60 * 5, // 5 min cache
      queryKey: getSearchBySubjectQueryKey({ subject: submittedSubject, institutionType: submittedType !== "all" ? submittedType : undefined, limit: 20 }),
    }
  })

  const hasSearched = !!submittedSubject

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) return
    setSubmittedSubject(subject.trim())
    setSubmittedType(type)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200"
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200"
    return "text-slate-600 bg-slate-50 border-slate-200"
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subject Intelligence</h1>
        <p className="text-muted-foreground mt-2">
          Find colleges spending heavily or failing students in specific disciplines.
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label className="text-base font-semibold">What subject are you selling?</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="e.g. 'Psychology 101', 'Remedial Math', 'Intro to Ethics'" 
                  className="pl-10 h-12 text-lg bg-background"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="w-full md:w-64 space-y-2">
              <Label className="text-base font-semibold">Target</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-12 bg-background">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="lg" className="w-full md:w-auto h-12 px-8 font-bold">
              Hunt
            </Button>
          </form>
          
          {!hasSearched && (
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground py-1">Try:</span>
              {["Remedial Math", "English Composition", "Intro to Psychology", "Anatomy & Physiology", "Databases / SQL", "Data Structures & Algorithms", "Intro to Programming"].map(s => (
                <Badge 
                  key={s} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => setSubject(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {hasSearched && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              Top Targets for "{subject}"
            </h2>
            <div className="text-sm text-muted-foreground">
              {isLoading ? "Searching…" : `${results?.length ?? 0} institutions identified`}
            </div>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-1/3 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))
            ) : results?.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-medium">No compelling targets found</h3>
                <p className="text-muted-foreground">Try a broader subject or different institution type.</p>
              </div>
            ) : (
              results?.map((result, i) => (
                <Card key={`${result.college.id}-${i}`} className="overflow-hidden hover:border-primary/50 transition-colors group">
                  <div className="flex flex-col md:flex-row">
                    {/* Score Ribbon */}
                    <div className={cn(
                      "w-full md:w-32 flex md:flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r",
                      getScoreColor(result.opportunityScore)
                    )}>
                      <div className="text-xs uppercase tracking-wider font-bold mb-1 mr-2 md:mr-0">Match</div>
                      <div className="text-3xl font-mono font-black">{result.opportunityScore}</div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div>
                          <Link href={`/colleges/${result.college.id}`}>
                            <h3 className="text-xl font-bold hover:underline cursor-pointer group-hover:text-primary transition-colors">
                              {result.college.name}
                            </h3>
                          </Link>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <span>{result.college.city}, {result.college.state}</span>
                            <span>•</span>
                            <span>{formatNumber(result.college.enrollmentSize)} students</span>
                          </div>
                        </div>
                        
                        <div className="bg-muted/50 rounded-md p-3 text-sm border">
                          <strong className="text-foreground">Why target: </strong>
                          <span className="text-muted-foreground">{result.reason}</span>
                        </div>
                      </div>
                      
                      <div className="w-full md:w-48 shrink-0 space-y-4">
                        {result.estimatedEnrollment != null && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Est. Subject Enrollment</div>
                            <div className="font-mono font-medium flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                              {formatNumber(result.estimatedEnrollment)} students
                            </div>
                          </div>
                        )}
                        
                        {result.estimatedAnnualCost != null && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Current Annual Cost</div>
                            <div className="font-mono font-medium flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-rose-500" />
                              {formatCurrency(result.estimatedAnnualCost)}
                            </div>
                          </div>
                        )}
                        
                        <Link href={`/colleges/${result.college.id}`} className={cn(buttonVariants({ variant: "secondary" }), "w-full mt-2")}>
                          View Deep Dive
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
