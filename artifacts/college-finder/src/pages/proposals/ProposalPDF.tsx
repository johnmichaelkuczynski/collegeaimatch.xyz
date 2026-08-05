import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"

// ── Brand palette ──────────────────────────────────────────────────────────────
const brand = {
  primary: "#1d4ed8",   // Zhi Systems blue
  primaryLight: "#dbeafe",
  accent: "#059669",    // emerald for savings
  danger: "#dc2626",
  muted: "#64748b",
  mutedBg: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  white: "#ffffff",
  charcoal: "#1e293b",
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: brand.text,
    backgroundColor: brand.white,
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 48,
  },

  // Header
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  headerLeft: { flex: 1 },
  companyLabel: { fontSize: 8, letterSpacing: 2, color: brand.primary, textTransform: "uppercase", marginBottom: 2 },
  collegeName: { fontSize: 20, fontFamily: "Helvetica-Bold", color: brand.charcoal, marginBottom: 2 },
  subtitle: { fontSize: 10, color: brand.muted },
  logoBox: { width: 56, height: 56, backgroundColor: brand.primary, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  logoText: { color: brand.white, fontFamily: "Helvetica-Bold", fontSize: 16 },

  divider: { borderBottomWidth: 1, borderBottomColor: brand.border, marginBottom: 20 },

  // Section headings
  sectionHeading: { fontSize: 11, fontFamily: "Helvetica-Bold", color: brand.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },

  // Card / box
  card: { backgroundColor: brand.mutedBg, borderRadius: 6, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: brand.border },

  // Letter
  letterText: { fontSize: 10, lineHeight: 1.7, color: brand.charcoal, fontFamily: "Helvetica" },

  // ROI Summary
  roiRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 18 },
  roiCard: { flex: 1, backgroundColor: brand.mutedBg, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: brand.border },
  roiLabel: { fontSize: 8, color: brand.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  roiValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: brand.accent },
  roiValueDanger: { fontSize: 14, fontFamily: "Helvetica-Bold", color: brand.danger },
  roiValuePrimary: { fontSize: 14, fontFamily: "Helvetica-Bold", color: brand.primary },

  // Bar chart (hand-drawn)
  chartRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80, marginBottom: 4 },
  barLabel: { fontSize: 7, color: brand.muted, textAlign: "center", marginTop: 3 },
  barValue: { fontSize: 7, color: brand.textSecondary, textAlign: "center", marginBottom: 2 },

  // Courses table
  tableHeader: { flexDirection: "row", backgroundColor: brand.primary, padding: "5 8", borderRadius: "4 4 0 0" },
  tableHeaderText: { color: brand.white, fontSize: 8, fontFamily: "Helvetica-Bold", flex: 1 },
  tableHeaderTextRight: { color: brand.white, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right", width: 70 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: brand.border, padding: "5 8", backgroundColor: brand.white },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: brand.border, padding: "5 8", backgroundColor: brand.mutedBg },
  tableCell: { flex: 1, fontSize: 9, color: brand.text },
  tableCellRight: { fontSize: 9, color: brand.accent, fontFamily: "Helvetica-Bold", textAlign: "right", width: 70 },
  tableCellMuted: { fontSize: 8, color: brand.muted, width: 60, textAlign: "right" },

  // Contacts
  contactCard: { borderWidth: 1, borderColor: brand.border, borderRadius: 5, padding: 10, marginBottom: 8, backgroundColor: brand.white },
  contactName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: brand.charcoal },
  contactTitle: { fontSize: 9, color: brand.primary, marginBottom: 2 },
  contactEmail: { fontSize: 8, color: brand.muted },

  // Virtues (legacy pills — kept for backward compat)
  virtueRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  virtue: { backgroundColor: brand.primaryLight, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  virtueText: { fontSize: 8, color: brand.primary, fontFamily: "Helvetica-Bold" },

  // Feature highlight cards
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  featureCard: { width: "48%", borderWidth: 1, borderColor: brand.border, borderRadius: 5, padding: 10, backgroundColor: brand.white },
  featureCardAccent: { width: 20, height: 3, backgroundColor: brand.primary, borderRadius: 2, marginBottom: 6 },
  featureTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.charcoal, marginBottom: 3 },
  featureBody: { fontSize: 8, color: brand.textSecondary, lineHeight: 1.5 },
  featureSectionBanner: { backgroundColor: brand.charcoal, padding: "10 14", borderRadius: 5, marginBottom: 10 },
  featureSectionBannerText: { color: brand.white, fontSize: 10, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },

  // Footer
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: brand.muted },
  pageNum: { fontSize: 8, color: brand.muted },
})

// ── Zhi Systems product virtues (kept in sync with sendgrid.ts) ───────────────
const ZHI_VIRTUES = [
  {
    title: "24/7 Built-In Tutors",
    body: "Every student has on-demand, personalized instruction — eliminating the access gap that stalls most online learning.",
  },
  {
    title: "Cheat-Proof by Design",
    body: "Assessments cannot be gamed, so course completion actually certifies competence employers can rely on.",
  },
  {
    title: "Industry-Aligned Progress",
    body: "Advancement is benchmarked to professional standards, making the credential something hiring managers trust.",
  },
  {
    title: "Fixed Assessments, Adaptive Lectures",
    body: "Tests and homework stay locked for rigor, while lectures flex in length, depth, and style to fit each learner.",
  },
  {
    title: "Verified Mastery",
    body: "Adaptation never dilutes standards — retention and mastery are confirmed, not assumed.",
  },
  {
    title: "5-Year Free Maintenance Guarantee",
    body: "The one-time setup fee locks in five full years of platform maintenance at no additional cost — zero budget surprises.",
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function usd(val: number | undefined | null): string {
  if (val == null || val === 0) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val)
}

// Draw a simple bar chart using View rectangles
function BarChartPDF({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1)
  const BAR_MAX_H = 64

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: BAR_MAX_H + 20 }}>
        {data.map((d, i) => {
          const barH = Math.max(4, (Math.abs(d.value) / max) * BAR_MAX_H)
          return (
            <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
              <Text style={[s.barValue, { color: d.color }]}>{usd(Math.abs(d.value))}</Text>
              <View style={{ width: "100%", height: barH, backgroundColor: d.color, borderRadius: 3 }} />
              <Text style={s.barLabel}>{d.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ── Main PDF Document ──────────────────────────────────────────────────────────
interface ProposalData {
  collegeName: string
  collegeState?: string
  createdAt: string
  outreachLetter?: string
  aiVirtues?: string[]
  costAnalysis?: {
    totalCostWithoutAI?: number
    totalAiInstallCost?: number
    totalAiAnnualCost?: number
    totalCostWithAI?: number
    savingsYear1?: number
    savingsAnnual?: number
    attritionCost?: number
    benchmarkingCost?: number
  }
  courses?: Array<{
    name: string
    subject?: string | null
    estimatedEnrollment?: number | null
    aiAnnualCost?: number | null
    estimatedAnnualCost?: number | null
    isHighPriority?: boolean | null
  }>
  contacts?: Array<{
    name: string
    title?: string | null
    department?: string | null
    email?: string | null
    decisionPower?: string | null
  }>
}

export function ProposalPDF({ proposal }: { proposal: ProposalData }) {
  const { costAnalysis, courses, contacts } = proposal
  const generatedDate = new Date(proposal.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })

  const chartData = costAnalysis
    ? [
        { label: "Current Total", value: costAnalysis.totalCostWithoutAI ?? 0, color: brand.danger },
        { label: "AI Install", value: costAnalysis.totalAiInstallCost ?? 0, color: "#94a3b8" },
        { label: "AI Annual", value: costAnalysis.totalAiAnnualCost ?? 0, color: "#cbd5e1" },
        { label: "New Total", value: costAnalysis.totalCostWithAI ?? 0, color: brand.primary },
        { label: "Annual Savings", value: costAnalysis.savingsAnnual ?? 0, color: brand.accent },
      ]
    : []

  return (
    <Document
      title={`Proposal – ${proposal.collegeName}`}
      author="Zhi Systems"
      subject="Outreach Proposal"
    >
      {/* ── Page 1: Letter + ROI ─────────────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.companyLabel}>Zhi Systems · Outreach Proposal</Text>
            <Text style={s.collegeName}>{proposal.collegeName}</Text>
            <Text style={s.subtitle}>
              {proposal.collegeState ? `${proposal.collegeState} · ` : ""}Generated {generatedDate}
            </Text>
          </View>
          <View style={s.logoBox}>
            <Text style={s.logoText}>ZS</Text>
          </View>
        </View>
        <View style={s.divider} />

        {/* ROI Highlights */}
        <Text style={s.sectionHeading}>ROI Summary</Text>
        <View style={s.roiRow}>
          <View style={s.roiCard}>
            <Text style={s.roiLabel}>Current Annual Cost</Text>
            <Text style={s.roiValueDanger}>{usd(costAnalysis?.totalCostWithoutAI)}</Text>
          </View>
          <View style={s.roiCard}>
            <Text style={s.roiLabel}>With Zhi Systems</Text>
            <Text style={s.roiValuePrimary}>{usd(costAnalysis?.totalCostWithAI)}</Text>
          </View>
          <View style={s.roiCard}>
            <Text style={s.roiLabel}>Annual Savings</Text>
            <Text style={s.roiValue}>{usd(costAnalysis?.savingsAnnual)}</Text>
          </View>
          <View style={s.roiCard}>
            <Text style={s.roiLabel}>Year-1 Net Savings</Text>
            <Text style={s.roiValue}>{usd(costAnalysis?.savingsYear1)}</Text>
          </View>
        </View>

        {/* Bar Chart */}
        {chartData.length > 0 && (
          <View style={[s.card, { marginBottom: 20 }]}>
            <Text style={[s.sectionHeading, { marginBottom: 10 }]}>Cost Comparison</Text>
            <BarChartPDF data={chartData} />
          </View>
        )}

        {/* Outreach Letter */}
        <Text style={s.sectionHeading}>Executive Outreach Letter</Text>
        <View style={s.card}>
          <Text style={s.letterText}>{proposal.outreachLetter ?? "No letter generated."}</Text>
        </View>

        {/* Why Zhi Systems — Feature Highlights */}
        <View style={{ marginBottom: 18 }}>
          <View style={s.featureSectionBanner}>
            <Text style={s.featureSectionBannerText}>WHY ZHI SYSTEMS — WHAT MAKES THIS DIFFERENT</Text>
          </View>
          <View style={s.featureGrid}>
            {ZHI_VIRTUES.map((v, i) => (
              <View key={i} style={s.featureCard}>
                <View style={s.featureCardAccent} />
                <Text style={s.featureTitle}>{v.title}</Text>
                <Text style={s.featureBody}>{v.body}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Zhi Systems · Confidential · {generatedDate}</Text>
          <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* ── Page 2: Courses + Contacts ───────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        {/* Mini header */}
        <View style={[s.headerRow, { marginBottom: 16 }]}>
          <View>
            <Text style={s.companyLabel}>Zhi Systems · Outreach Proposal</Text>
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: brand.charcoal }}>{proposal.collegeName}</Text>
          </View>
          <View style={[s.logoBox, { width: 36, height: 36 }]}>
            <Text style={[s.logoText, { fontSize: 11 }]}>ZS</Text>
          </View>
        </View>
        <View style={s.divider} />

        {/* ROI Analysis — per-course savings table */}
        <Text style={s.sectionHeading}>ROI Analysis</Text>
        {courses && courses.length > 0 ? (() => {
          const totalCurrent = courses.reduce((sum, c) => sum + (c.estimatedAnnualCost ?? 0), 0)
          const totalAi = courses.reduce((sum, c) => sum + (c.aiAnnualCost ?? 0), 0)
          const totalSavings = totalCurrent - totalAi
          return (
            <View style={{ marginBottom: 20 }}>
              {/* Table header */}
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderText, { flex: 3 }]}>Course</Text>
                <Text style={s.tableHeaderTextRight}>Current/yr</Text>
                <Text style={s.tableHeaderTextRight}>AI/yr</Text>
                <Text style={s.tableHeaderTextRight}>Saves/yr</Text>
              </View>
              {courses.map((c, i) => {
                const saves = (c.estimatedAnnualCost ?? 0) - (c.aiAnnualCost ?? 0)
                return (
                  <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                    <Text style={[s.tableCell, { flex: 3 }]}>{c.name}</Text>
                    <Text style={[s.tableCellRight, { color: brand.danger }]}>{usd(c.estimatedAnnualCost)}</Text>
                    <Text style={[s.tableCellRight, { color: brand.primary }]}>{usd(c.aiAnnualCost)}</Text>
                    <Text style={s.tableCellRight}>{usd(saves > 0 ? saves : 0)}</Text>
                  </View>
                )
              })}
              {/* Total row */}
              <View style={{ flexDirection: "row", padding: "6 8", backgroundColor: brand.primary, borderRadius: "0 0 4 4" }}>
                <Text style={[s.tableHeaderText, { flex: 3 }]}>Total</Text>
                <Text style={s.tableHeaderTextRight}>{usd(totalCurrent)}</Text>
                <Text style={s.tableHeaderTextRight}>{usd(totalAi)}</Text>
                <Text style={[s.tableHeaderTextRight, { color: "#6ee7b7" }]}>{usd(totalSavings > 0 ? totalSavings : 0)}</Text>
              </View>
            </View>
          )
        })() : (
          <Text style={{ color: brand.muted, fontSize: 9, marginBottom: 20 }}>No courses included in this proposal.</Text>
        )}

        {/* Multi-Year Savings Projection */}
        {costAnalysis?.savingsAnnual != null && costAnalysis.savingsAnnual > 0 && (() => {
          const annual = costAnalysis.savingsAnnual ?? 0
          const install = costAnalysis.totalAiInstallCost ?? 0
          const rows = [
            { year: "Year 1", cumulative: annual - install, note: "Annual savings minus one-time install cost" },
            { year: "Year 2", cumulative: annual * 2 - install, note: "" },
            { year: "Year 3", cumulative: annual * 3 - install, note: "" },
            { year: "Year 5", cumulative: annual * 5 - install, note: "" },
          ]
          return (
            <View style={{ marginBottom: 20 }}>
              <Text style={s.sectionHeading}>Multi-Year Projection</Text>
              {/* Header */}
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderText, { flex: 1 }]}>Period</Text>
                <Text style={s.tableHeaderTextRight}>Cumulative Net Savings</Text>
                <Text style={[s.tableHeaderText, { flex: 2, textAlign: "right" }]}>Notes</Text>
              </View>
              {rows.map((r, i) => (
                <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{r.year}</Text>
                  <Text style={[s.tableCellRight, { color: r.cumulative >= 0 ? brand.accent : brand.danger }]}>
                    {r.cumulative >= 0 ? usd(r.cumulative) : `-${usd(Math.abs(r.cumulative))}`}
                  </Text>
                  <Text style={[s.tableCell, { flex: 2, textAlign: "right", fontSize: 8, color: brand.muted }]}>
                    {r.note}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", padding: "5 8", backgroundColor: brand.mutedBg, borderRadius: "0 0 4 4", borderWidth: 1, borderColor: brand.border, borderTopWidth: 0 }}>
                <Text style={[s.tableCell, { flex: 1, fontSize: 8, color: brand.muted }]}>
                  Based on {usd(annual)}/yr savings · {usd(install)} one-time install
                </Text>
              </View>
            </View>
          )
        })()}

        {/* Key Contacts */}
        <Text style={s.sectionHeading}>Key Contacts</Text>
        {contacts && contacts.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {contacts.map((c, i) => (
              <View key={i} style={[s.contactCard, { width: "47%" }]}>
                <Text style={s.contactName}>{c.name}</Text>
                <Text style={s.contactTitle}>{c.title ?? c.department ?? ""}</Text>
                <Text style={s.contactEmail}>{c.email ?? "No email available"}</Text>
                {c.decisionPower && (
                  <Text style={{ fontSize: 7, color: brand.muted, marginTop: 2 }}>Decision power: {c.decisionPower}</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: brand.muted, fontSize: 9 }}>No contact data available.</Text>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Zhi Systems · Confidential · {generatedDate}</Text>
          <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
