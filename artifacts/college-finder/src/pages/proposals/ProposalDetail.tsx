import * as React from "react"
import { useParams, Link } from "wouter"
import {
  ArrowLeft, Download, Send, Copy, FileText, CheckCircle2,
  Building, Loader2, Mail, User, AtSign, Pencil, X, Save, Eye
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts"
import { pdf } from "@react-pdf/renderer"

import { useGetProposal, getGetProposalQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { formatCurrency, cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ProposalPDF } from "./ProposalPDF"

// ── constants ─────────────────────────────────────────────────────────────────
const REP_EMAIL_KEY = "zhi_rep_email"

// ── Email dialog ──────────────────────────────────────────────────────────────

interface Contact { name?: string; title?: string; email?: string }
type SendState = "idle" | "sending" | "success" | "error"

interface EmailDialogProps {
  open: boolean
  onClose: () => void
  proposalId: number
  collegeName: string
  contacts: Contact[]
  /** When true the dialog is pre-filled with the rep's own address */
  previewMode?: boolean
}

function EmailDialog({ open, onClose, proposalId, collegeName, contacts, previewMode }: EmailDialogProps) {
  const savedRepEmail = () => localStorage.getItem(REP_EMAIL_KEY) ?? ""

  const [to, setTo] = React.useState("")
  const [recipientName, setRecipientName] = React.useState("")
  const [sendState, setSendState] = React.useState<SendState>("idle")
  const [errorMsg, setErrorMsg] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setSendState("idle")
    setErrorMsg("")
    if (previewMode) {
      setTo(savedRepEmail())
      setRecipientName("")
    } else {
      setTo("")
      setRecipientName("")
    }
  }, [open, previewMode])

  function selectContact(c: Contact) {
    setTo(c.email ?? "")
    setRecipientName(c.name ?? "")
  }

  async function handleSend() {
    const dest = to.trim()
    if (!dest || !dest.includes("@")) {
      setErrorMsg("Please enter a valid email address.")
      return
    }
    // Persist rep email whenever they use preview mode
    if (previewMode) localStorage.setItem(REP_EMAIL_KEY, dest)
    setSendState("sending")
    setErrorMsg("")
    try {
      const res = await fetch(`/api/proposals/${proposalId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: dest, recipientName: recipientName.trim() || undefined }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? "Send failed")
      }
      setSendState("success")
    } catch (err) {
      setSendState("sending" === sendState ? "error" : "error")
      setSendState("error")
      setErrorMsg(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const emailContacts = contacts.filter((c) => c.email)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {previewMode ? "Send Preview to Yourself" : "Send to College Official"}
          </DialogTitle>
          <DialogDescription>
            {previewMode
              ? "Review the proposal in your inbox before sending it to the college."
              : `Email the ${collegeName} proposal to a decision-maker.`}
          </DialogDescription>
        </DialogHeader>

        {sendState === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="font-semibold text-lg">
              {previewMode ? "Preview sent!" : "Email sent!"}
            </p>
            <p className="text-sm text-muted-foreground">
              Delivered to <span className="font-mono">{to}</span>
            </p>
            <Button className="mt-2" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            {/* Contact quick-select (not shown in preview mode) */}
            {!previewMode && emailContacts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">
                  Select a contact
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {emailContacts.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectContact(c)}
                      className={cn(
                        "w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors hover:border-primary/60 hover:bg-primary/5",
                        to === c.email ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                      )}
                    >
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.title}</div>
                      <div className="text-xs font-mono text-primary mt-0.5">{c.email}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center pt-1">— or enter manually —</p>
              </div>
            )}

            {/* Address fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email-to">
                  <AtSign className="inline h-3.5 w-3.5 mr-1" />
                  To
                  {previewMode && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">(your email — saved for next time)</span>
                  )}
                </Label>
                <Input
                  id="email-to"
                  type="email"
                  placeholder={previewMode ? "your@email.com" : "provost@college.edu"}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              {!previewMode && (
                <div className="space-y-1.5">
                  <Label htmlFor="email-name">
                    <User className="inline h-3.5 w-3.5 mr-1" />
                    Recipient name <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="email-name"
                    placeholder="Dr. Jane Smith"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
                <X className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={sendState === "sending"}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sendState === "sending" || !to.trim()}>
                {sendState === "sending"
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                  : previewMode
                    ? <><Eye className="mr-2 h-4 w-4" />Send Preview</>
                    : <><Send className="mr-2 h-4 w-4" />Send Email</>}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProposalDetail() {
  const params = useParams()
  const id = Number(params.id)
  const queryClient = useQueryClient()

  const [pdfLoading, setPdfLoading] = React.useState(false)
  const [emailOpen, setEmailOpen] = React.useState(false)
  const [previewEmailOpen, setPreviewEmailOpen] = React.useState(false)

  // Letter editing
  const [editMode, setEditMode] = React.useState(false)
  const [editedLetter, setEditedLetter] = React.useState("")
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle")

  const { data: proposal, isLoading } = useGetProposal(id, {
    query: { enabled: !isNaN(id), queryKey: getGetProposalQueryKey(id) }
  })

  function startEdit() {
    setEditedLetter(proposal?.outreachLetter ?? "")
    setEditMode(true)
    setSaveState("idle")
  }

  function cancelEdit() {
    setEditMode(false)
    setSaveState("idle")
  }

  async function saveLetter() {
    setSaveState("saving")
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreachLetter: editedLetter }),
      })
      if (!res.ok) throw new Error("Save failed")
      // Optimistically update the cache
      queryClient.setQueryData(getGetProposalQueryKey(id), (old: typeof proposal) =>
        old ? { ...old, outreachLetter: editedLetter } : old
      )
      setSaveState("saved")
      setEditMode(false)
    } catch {
      setSaveState("error")
    }
  }

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

  if (!proposal) return <div className="p-8 text-center">Proposal not found</div>

  const { costAnalysis, courses, contacts } = proposal

  const waterfallData = costAnalysis ? [
    { name: 'Current Total', value: costAnalysis.totalCostWithoutAI, fill: 'hsl(var(--destructive))' },
    { name: 'AI Integration', value: -costAnalysis.totalAiInstallCost, fill: 'hsl(var(--muted-foreground))' },
    { name: 'AI Annual', value: -costAnalysis.totalAiAnnualCost, fill: 'hsl(var(--muted-foreground))' },
    { name: 'New Total', value: costAnalysis.totalCostWithAI, fill: 'hsl(var(--primary))' },
    { name: 'Annual Savings', value: costAnalysis.savingsAnnual, fill: 'hsl(var(--accent))' }
  ] : []

  const letterText = proposal.outreachLetter ?? ""

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Email dialogs */}
      <EmailDialog
        open={previewEmailOpen}
        onClose={() => setPreviewEmailOpen(false)}
        proposalId={id}
        collegeName={proposal.collegeName}
        contacts={(contacts ?? []) as Contact[]}
        previewMode
      />
      <EmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        proposalId={id}
        collegeName={proposal.collegeName}
        contacts={(contacts ?? []) as Contact[]}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
              : <><Download className="mr-2 h-4 w-4" />Download PDF</>}
          </Button>
          <Button variant="outline" onClick={() => setPreviewEmailOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />Preview (send to myself)
          </Button>
          <Button onClick={() => setEmailOpen(true)}>
            <Send className="mr-2 h-4 w-4" />Send to College
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Letter */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Outreach Letter
                </span>
                {!editMode ? (
                  <Button variant="ghost" size="sm" onClick={startEdit}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="mr-1.5 h-3.5 w-3.5" />Cancel
                    </Button>
                    <Button size="sm" onClick={saveLetter} disabled={saveState === "saving"}>
                      {saveState === "saving"
                        ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
                        : <><Save className="mr-1.5 h-3.5 w-3.5" />Save</>}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {saveState === "error" && (
                <p className="text-sm text-destructive mb-3">Save failed — please try again.</p>
              )}
              {editMode ? (
                <Textarea
                  className="font-serif text-[14px] text-slate-800 dark:text-slate-200 leading-relaxed min-h-[600px] resize-y"
                  value={editedLetter}
                  onChange={(e) => setEditedLetter(e.target.value)}
                  spellCheck
                />
              ) : (
                <div className="whitespace-pre-wrap font-serif text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed">
                  {letterText}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Virtues */}
          {proposal.aiVirtues && proposal.aiVirtues.length > 0 && (
            <Card>
              <CardHeader><CardTitle>AI Value Props Emphasized</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {proposal.aiVirtues.map(virtue => (
                    <Badge key={virtue} variant="secondary" className="px-3 py-1 text-sm bg-primary/10 text-primary">
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />{virtue}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* ROI */}
          <Card className="bg-slate-50 dark:bg-slate-900 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">ROI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground uppercase font-semibold">Total Opportunity</div>
                  <div className="text-3xl font-black font-mono text-emerald-600">
                    {formatCurrency(costAnalysis?.savingsAnnual || 0)}
                    <span className="text-base font-sans font-normal text-muted-foreground"> / yr</span>
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

          {/* Target Courses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Target Courses <Badge>{courses?.length || 0}</Badge>
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
                  + {courses.length - 5} more courses in analysis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Key Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {(contacts as Contact[])?.slice(0, 4).map((contact, i) => (
                <div key={i} className="flex flex-col space-y-1 bg-background border rounded-md p-3">
                  <div className="font-semibold text-sm">{contact.name}</div>
                  <div className="text-xs text-primary">{contact.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">{contact.email || "No email available"}</div>
                  {contact.email && (
                    <button
                      type="button"
                      onClick={() => setEmailOpen(true)}
                      className="text-xs text-primary underline-offset-2 hover:underline text-left mt-0.5"
                    >
                      Email this contact →
                    </button>
                  )}
                </div>
              ))}
              {(!contacts || (contacts as Contact[]).length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4">No contact data appended.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
