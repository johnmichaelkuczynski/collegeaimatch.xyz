import * as React from "react"
import { Link } from "wouter"
import { Search, SlidersHorizontal, MapPin, Building, GraduationCap, DollarSign, ChevronRight } from "lucide-react"

import { useSearchColleges } from "@workspace/api-client-react"
import { formatNumber, formatPercent, cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { buttonVariants, Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

const INSTITUTION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "community_college", label: "Community College" },
  { value: "four_year", label: "Four Year" },
  { value: "university", label: "University" },
  { value: "technical", label: "Technical/Vocational" },
  { value: "for_profit", label: "For Profit" }
]

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", 
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", 
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", 
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]

export default function CollegeSearch() {
  const [query, setQuery] = React.useState("")
  const [type, setType] = React.useState("all")
  const [state, setState] = React.useState("all")
  const [maxDropout, setMaxDropout] = React.useState([100])
  const [page, setPage] = React.useState(1)

  // Use a debounced search term for the query to avoid spamming the API
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading } = useSearchColleges({
    query: debouncedQuery || undefined,
    type: type !== "all" ? type : undefined,
    state: state !== "all" ? state : undefined,
    maxDropoutRate: maxDropout[0] < 100 ? maxDropout[0] : undefined,
    page,
    limit: 20
  })

  const getTypeLabel = (typeStr: string) => {
    return INSTITUTION_TYPES.find(t => t.value === typeStr)?.label || typeStr
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600"
    if (score >= 60) return "text-amber-500"
    return "text-muted-foreground"
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 md:flex-row">
      {/* Filters Sidebar */}
      <div className="w-full md:w-72 shrink-0 space-y-6 overflow-y-auto pr-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Target Filters</h2>
          <p className="text-sm text-muted-foreground mb-4">Refine your prospect list.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search Name</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="e.g. Arizona State..." 
                className="pl-9"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Institution Type</Label>
            <Select 
              value={type} 
              onValueChange={(v) => {
                setType(v)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {INSTITUTION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>State</Label>
            <Select 
              value={state} 
              onValueChange={(v) => {
                setState(v)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {STATES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max Dropout Rate</Label>
                <span className="text-xs font-mono">{maxDropout[0]}%</span>
              </div>
              <Slider 
                value={maxDropout} 
                onValueChange={(v) => {
                  setMaxDropout(v)
                  setPage(1)
                }}
                max={100} 
                step={5} 
              />
              <p className="text-xs text-muted-foreground">
                Higher dropout rates often signal a stronger need for AI intervention.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Searching..." : `Found ${formatNumber(data?.total || 0)} colleges`}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </Button>
            <span className="tabular-nums">Page {page} of {Math.max(1, Math.ceil((data?.total || 0) / 20))}</span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!data || data.colleges.length < 20}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-12">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 w-2/3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-16 rounded-full" />
                </div>
              </Card>
            ))
          ) : data?.colleges.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Building className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">No colleges found</h3>
              <p className="text-muted-foreground">Try adjusting your filters.</p>
            </div>
          ) : (
            data?.colleges.map((college) => (
              <Card key={college.id} className="hover-elevate transition-all border-l-4 hover:border-l-primary group">
                <CardContent className="p-5 flex flex-col md:flex-row gap-6 md:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/colleges/${college.id}`}>
                        <h3 className="text-lg font-bold truncate hover:underline cursor-pointer">
                          {college.name}
                        </h3>
                      </Link>
                      {college.aiOpportunityScore && college.aiOpportunityScore >= 80 && (
                        <Badge variant="success" className="shrink-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                          Hot Lead
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {college.city}, {college.state}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {getTypeLabel(college.type)}
                      </div>
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        {formatNumber(college.enrollmentSize)} Enrolled
                      </div>
                    </div>

                    {college.popularMajors && college.popularMajors.length > 0 && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {college.popularMajors.slice(0, 3).map(major => (
                          <Badge key={major} variant="secondary" className="text-xs font-normal">
                            {major}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-8 shrink-0 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                    <div className="space-y-1 text-center">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        Dropout Rate
                      </div>
                      <div className="text-xl font-mono font-medium">
                        {college.dropoutRate != null ? formatPercent(college.dropoutRate) : "N/A"}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-center">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        Opp Score
                      </div>
                      <div className={cn("text-2xl font-mono font-bold", getScoreColor(college.aiOpportunityScore || 0))}>
                        {college.aiOpportunityScore || 0}
                      </div>
                    </div>

                    <Link href={`/colleges/${college.id}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "group-hover:bg-primary group-hover:text-primary-foreground transition-colors hidden md:flex")}>
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
